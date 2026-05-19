from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import Evidence, FrameAnalysis, VisionEvent


@dataclass
class MedplumSettings:
    base_url: str
    client_id: str | None = None
    client_secret: str | None = None
    access_token: str | None = None
    on_behalf_of: str | None = None

    @property
    def configured(self) -> bool:
        return bool(self.base_url and (self.access_token or (self.client_id and self.client_secret)))


def settings_from_env() -> MedplumSettings:
    return MedplumSettings(
        base_url=os.getenv("MEDPLUM_BASE_URL", "https://api.medplum.com").rstrip("/"),
        client_id=os.getenv("MEDPLUM_CLIENT_ID") or None,
        client_secret=os.getenv("MEDPLUM_CLIENT_SECRET") or None,
        access_token=os.getenv("MEDPLUM_ACCESS_TOKEN") or None,
        on_behalf_of=os.getenv("MEDPLUM_ON_BEHALF_OF") or None,
    )


class MedplumClient:
    def __init__(self, settings: MedplumSettings | None = None) -> None:
        self.settings = settings or settings_from_env()
        self._token: str | None = self.settings.access_token

    def enabled(self) -> bool:
        explicit = os.getenv("MEDPLUM_SYNC_ENABLED")
        if explicit is not None:
            return self.settings.configured and explicit.strip().lower() in {"1", "true", "yes", "on"}
        return self.settings.configured

    def status(self) -> dict[str, Any]:
        return {
            "configured": self.settings.configured,
            "enabled": self.enabled(),
            "base_url_set": bool(self.settings.base_url),
            "client_id_set": bool(self.settings.client_id),
            "client_secret_set": bool(self.settings.client_secret),
            "access_token_set": bool(self.settings.access_token),
            "on_behalf_of_set": bool(self.settings.on_behalf_of),
        }

    def create_resource(self, resource: dict[str, Any]) -> dict[str, Any]:
        if not self.enabled():
            return {"ok": False, "skipped": True, "reason": "Medplum sync is not configured"}
        resource_type = resource.get("resourceType")
        if not resource_type:
            raise ValueError("FHIR resource is missing resourceType")
        return self._json_request(
            f"/fhir/R4/{urllib.parse.quote(resource_type)}",
            method="POST",
            body=resource,
        )

    def _token_value(self) -> str:
        if self._token:
            return self._token
        if not self.settings.client_id or not self.settings.client_secret:
            raise RuntimeError("MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET are required")
        payload = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
        auth = base64.b64encode(f"{self.settings.client_id}:{self.settings.client_secret}".encode()).decode()
        request = urllib.request.Request(
            f"{self.settings.base_url}/oauth2/token",
            data=payload,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode())
        self._token = data["access_token"]
        return self._token

    def _json_request(self, path: str, *, method: str, body: dict[str, Any]) -> dict[str, Any]:
        token = self._token_value()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/fhir+json, application/json",
            "Content-Type": "application/fhir+json",
        }
        if self.settings.on_behalf_of:
            headers["X-Medplum-On-Behalf-Of"] = self.settings.on_behalf_of
        request = urllib.request.Request(
            f"{self.settings.base_url}{path}",
            data=json.dumps(body, default=str).encode(),
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return {"ok": True, "resource": json.loads(response.read().decode())}
        except urllib.error.HTTPError as exc:
            text = exc.read().decode(errors="replace")
            return {"ok": False, "status": exc.code, "error": text[:1000]}
        except urllib.error.URLError as exc:
            return {"ok": False, "error": str(exc)[:1000]}


def resources_for_detection(
    *,
    bed_id: str,
    patient_id: str | None,
    analysis: FrameAnalysis,
    events: list[VisionEvent],
    evidence: Evidence | None,
) -> list[dict[str, Any]]:
    resources: list[dict[str, Any]] = []
    subject = {"reference": f"Patient/{safe_id(patient_id or bed_id)}"}
    effective = datetime.now(timezone.utc).isoformat()

    for kind, vital in analysis.vitals.items():
        value = vital.value
        if kind == "bp":
            components = []
            if vital.systolic is not None:
                components.append(
                    {
                        "code": loinc_code("8480-6", "Systolic blood pressure"),
                        "valueQuantity": quantity(vital.systolic, "mmHg"),
                    }
                )
            if vital.diastolic is not None:
                components.append(
                    {
                        "code": loinc_code("8462-4", "Diastolic blood pressure"),
                        "valueQuantity": quantity(vital.diastolic, "mmHg"),
                    }
                )
            if not components:
                continue
            resources.append(
                observation(
                    subject,
                    "85354-9",
                    "Blood pressure panel",
                    effective,
                    components=components,
                    note=f"Confidence {vital.confidence:.2f}; source monitor OCR/post-detection",
                )
            )
            continue
        if value is None:
            continue
        code, display, unit = {
            "hr": ("8867-4", "Heart rate", "beats/minute"),
            "spo2": ("59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry", "%"),
            "rr": ("9279-1", "Respiratory rate", "breaths/minute"),
        }.get(kind, ("8893-0", kind.upper(), vital.unit or "1"))
        resources.append(
            observation(
                subject,
                code,
                display,
                effective,
                value_quantity=quantity(value, unit),
                note=f"Confidence {vital.confidence:.2f}; source monitor OCR/post-detection",
            )
        )

    for event in events:
        resources.append(task_for_event(subject, event))
    if evidence and evidence.path:
        resources.append(document_reference(subject, evidence, bed_id))
    return resources


def observation(
    subject: dict[str, str],
    code: str,
    display: str,
    effective: str,
    *,
    value_quantity: dict[str, Any] | None = None,
    components: list[dict[str, Any]] | None = None,
    note: str,
) -> dict[str, Any]:
    resource = {
        "resourceType": "Observation",
        "status": "preliminary",
        "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
        "code": loinc_code(code, display),
        "subject": subject,
        "effectiveDateTime": effective,
        "note": [{"text": note}],
    }
    if value_quantity:
        resource["valueQuantity"] = value_quantity
    if components:
        resource["component"] = components
    return resource


def task_for_event(subject: dict[str, str], event: VisionEvent) -> dict[str, Any]:
    return {
        "resourceType": "Task",
        "status": "requested" if event.review_required else "ready",
        "intent": "order",
        "priority": "stat" if event.severity == "critical" else "routine",
        "description": f"{event.event_type.value}: {event.rule_trace}",
        "for": subject,
        "authoredOn": event.at.isoformat(),
        "businessStatus": {"text": "Aida post-detection event awaiting review"},
        "input": [
            {"type": {"text": "confidence"}, "valueString": f"{event.confidence:.3f}"},
            {"type": {"text": "bed_id"}, "valueString": event.bed_id},
        ],
    }


def document_reference(subject: dict[str, str], evidence: Evidence, bed_id: str) -> dict[str, Any]:
    path = Path(evidence.path or "")
    return {
        "resourceType": "DocumentReference",
        "status": "current",
        "subject": subject,
        "date": datetime.now(timezone.utc).isoformat(),
        "description": f"Aida evidence frame for {bed_id}",
        "content": [
            {
                "attachment": {
                    "contentType": "image/jpeg",
                    "title": evidence.filename or path.name,
                    "url": str(path),
                    "size": path.stat().st_size if path.exists() else None,
                }
            }
        ],
    }


def loinc_code(code: str, display: str) -> dict[str, Any]:
    return {"coding": [{"system": "http://loinc.org", "code": code, "display": display}], "text": display}


def quantity(value: float | None, unit: str) -> dict[str, Any]:
    return {"value": value, "unit": unit, "system": "http://unitsofmeasure.org", "code": unit}


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-." else "-" for ch in value)[:64] or "unknown"
