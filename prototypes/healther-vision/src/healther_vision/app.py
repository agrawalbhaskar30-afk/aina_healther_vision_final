from __future__ import annotations

import json
import os
import shutil
import time
from io import BytesIO
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import load_local_env
from .dashboard import dashboard_html, list_runs, list_vlm_reports
from .evaluation import event_metrics, expected_events_for_manifest
from .models import (
    BedState,
    CameraRole,
    EventType,
    Evidence,
    FrameAnalysis,
    IVState,
    Severity,
    SyntheticScenario,
)
from .state import VITAL_RULES, MemoryStore, VisionStateMachine, severity_for
from .synthetic import analysis_for, render_frame

load_local_env()

DATA_DIR = Path("data")
GENERATED_DIR = DATA_DIR / "generated"
UPLOAD_DIR = DATA_DIR / "uploads"
APP_ROOT = Path(__file__).resolve().parents[2]
MOCKUPS_DIR = APP_ROOT / "static" / "mockups"

app = FastAPI(title="Healther Vision", version="0.1.0")
store = MemoryStore()
machine = VisionStateMachine()
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")
if MOCKUPS_DIR.exists():
    app.mount("/mockups", StaticFiles(directory=MOCKUPS_DIR), name="mockups")

DEFAULT_BED_ID = "bed-01"
DEFAULT_PATIENT_ID = "patient-private-room-01"

DEFAULT_SETUP_CONFIG: dict[str, Any] = {
    "source_type": "synthetic",
    "source_url": "synthetic",
    "camera_label": "Bedside Cam 1",
    "bed_zone_polygon": [[282, 400], [998, 400], [1018, 600], [262, 600]],
    "monitor_crop": {"enabled": True, "box": [1085, 270, 1225, 390]},
    "iv_oxygen_crop": {"enabled": False, "box": None},
}
SETUP_CONFIGS: dict[str, dict[str, Any]] = {
    DEFAULT_BED_ID: json.loads(json.dumps(DEFAULT_SETUP_CONFIG))
}

REFERENCE_CASES: list[dict[str, Any]] = [
    {
        "id": "distress_wob",
        "label": "Respiratory distress / work of breathing",
        "signals": ["tachypnea", "accessory movement", "SpO2 trend", "oxygen interruption"],
        "severity": "critical",
        "review": "Remote clinician review and bedside nurse assessment",
    },
    {
        "id": "iv_near_empty",
        "label": "IV bag near empty or stopped",
        "signals": ["IV crop", "bag fill percent", "line visibility"],
        "severity": "warning",
        "review": "Confirm line status before charting",
    },
    {
        "id": "monitor_ocr",
        "label": "Bedside monitor OCR",
        "signals": ["HR", "BP", "SpO2", "RR", "confidence"],
        "severity": "info",
        "review": "Accept only stable OCR readings",
    },
    {
        "id": "bed_state",
        "label": "Bed state and fall risk",
        "signals": ["in bed", "sitting edge", "out of bed", "on floor"],
        "severity": "warning",
        "review": "Critical if on-floor or fall-confirmed",
    },
    {
        "id": "staff_presence",
        "label": "Staff presence and care gaps",
        "signals": ["staff in frame", "last seen", "no visit threshold"],
        "severity": "info",
        "review": "Useful for rounds, escalation, and audit trail",
    },
]

APP_EVENTS: list[dict[str, Any]] = [
    {
        "id": "evt-spo2-0714",
        "type": "VITALS_OUT_OF_RANGE",
        "label": "SpO2 trending down",
        "severity": "critical",
        "status": "needs_review",
        "time": "07:14 AM",
        "ago": "18m",
        "description": "SpO2 declined from 99% to 94% over 30 minutes.",
        "confidence": 0.94,
        "evidence": {
            "still": "/v0/monitor/frame.jpg?scenario=vitals_alert",
            "clip": "/v0/monitor/stream.mjpg?source=synthetic&scenario=vitals_alert&fps=4",
        },
        "vlm": {
            "summary": "Patient remains in bed. Monitor OCR shows a sustained SpO2 drop. No staff presence is visible during the decline window.",
            "needs_human_review": True,
        },
    },
    {
        "id": "evt-no-move-0628",
        "type": "NO_MOVEMENT_SUSTAINED",
        "label": "No movement detected",
        "severity": "warning",
        "status": "unreviewed",
        "time": "06:28 AM",
        "ago": "1h 02m",
        "description": "3h cumulative immobility threshold reached.",
        "confidence": 0.9,
        "evidence": {
            "still": "/v0/monitor/frame.jpg?scenario=normal",
            "clip": "/v0/monitor/stream.mjpg?source=synthetic&scenario=normal&fps=4",
        },
        "vlm": {
            "summary": "Patient appears in bed with no visible staff in the room.",
            "needs_human_review": False,
        },
    },
]
REVIEW_LOG: list[dict[str, Any]] = []


class ScenarioRequest(BaseModel):
    scenario: SyntheticScenario = SyntheticScenario.NORMAL
    frames: int = Field(default=24, ge=1, le=240)
    camera_role: CameraRole = CameraRole.CCTV
    name: str | None = None


class ReplayRequest(ScenarioRequest):
    bed_id: str = "B4"
    patient_id: str | None = "pat-demo"
    camera_id: str | None = "synthetic-cam-1"


class VideoExtractResponse(BaseModel):
    output_dir: str
    frames: list[str]


class ReviewRequest(BaseModel):
    action: str
    note: str | None = None
    reviewer_id: str = "local-demo-user"


class AssistantRequest(BaseModel):
    message: str
    room_id: str = "private-room-01"
    bed_id: str = DEFAULT_BED_ID
    event_id: str | None = None


class TranscriptRequest(BaseModel):
    bed_id: str = DEFAULT_BED_ID
    text: str
    speaker: str = "room_audio"
    captured_at: datetime | None = None
    event_id: str | None = None


class SetupConfigRequest(BaseModel):
    source_type: str = "synthetic"
    source_url: str = "synthetic"
    camera_label: str = "Bedside Cam 1"
    bed_zone_polygon: list[list[float]] | None = None
    monitor_crop: dict[str, Any] | None = None
    iv_oxygen_crop: dict[str, Any] | None = None


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "healther-vision", "mode": "synthetic-first"}


@app.get("/v0/vlm/status")
def vlm_status() -> dict:
    from .vlm import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, default_provider

    load_local_env()
    return {
        "ok": True,
        "provider": default_provider(),
        "openai": {
            "configured": bool(os.getenv("OPENAI_API_KEY")),
            "model": os.getenv("OPENAI_VISION_MODEL") or DEFAULT_OPENAI_MODEL,
        },
        "gemini": {
            "configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
            "model": os.getenv("GEMINI_VISION_MODEL") or DEFAULT_GEMINI_MODEL,
        },
    }


@app.post("/v0/vlm/frame")
async def vlm_frame(
    frame: Annotated[UploadFile, File()],
    provider: Annotated[str | None, Form()] = None,
    model: Annotated[str | None, Form()] = None,
) -> dict:
    from .vlm import VLMConfigError, VLMResponseError, analyze_image

    load_local_env()
    evidence = await save_upload(frame)
    if not evidence.path:
        raise HTTPException(status_code=400, detail="frame upload failed")
    try:
        analysis = analyze_image(Path(evidence.path), provider=provider, model=model)
    except VLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except VLMResponseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "ok": True,
        "evidence": evidence.model_dump(mode="json"),
        "analysis": analysis.model_dump(mode="json"),
    }


@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def dashboard() -> str:
    return dashboard_html()


@app.get("/monitor", response_class=HTMLResponse)
def monitor() -> str:
    return mockup_page("monitor/Aida - One-Bed Live Monitor.html", "monitor", DEFAULT_BED_ID)


@app.get("/bed/{bed_id}/monitor", response_class=HTMLResponse)
def bed_monitor(bed_id: str) -> str:
    return mockup_page("monitor/Aida - One-Bed Live Monitor.html", "monitor", bed_id)


@app.get("/setup", response_class=HTMLResponse)
@app.get("/video-setup", response_class=HTMLResponse)
def setup_page() -> str:
    return mockup_page("setup/index.html", "setup", DEFAULT_BED_ID)


@app.get("/bed/{bed_id}/setup", response_class=HTMLResponse)
@app.get("/bed/{bed_id}/video-setup", response_class=HTMLResponse)
def bed_setup_page(bed_id: str) -> str:
    return mockup_page("setup/index.html", "setup", bed_id)


@app.get("/review", response_class=HTMLResponse)
def review_page() -> str:
    return mockup_page("review/Event Review.html", "review", DEFAULT_BED_ID)


@app.get("/bed/{bed_id}/review", response_class=HTMLResponse)
def bed_review_page(bed_id: str) -> str:
    return mockup_page("review/Event Review.html", "review", bed_id)


@app.get("/state-reference", response_class=HTMLResponse)
def state_reference_page() -> str:
    return mockup_page("state-reference/Aida - State Reference.html", "state-reference", DEFAULT_BED_ID)


@app.get("/v0/monitor/state")
def monitor_state(bed_id: str = DEFAULT_BED_ID) -> dict:
    state = store.state(bed_id, DEFAULT_PATIENT_ID)
    events = store.events[bed_id]
    return {
        "ok": True,
        "room": {"id": "private-room-01", "bed_id": bed_id, "mode": "one-bed"},
        "camera": {"status": "live", "type": "PTZ/IP-ready", "fps": 4},
        "state": state.model_dump(mode="json"),
        "event_count": len(events) or 8,
        "vitals": {"hr": 96, "bp": "124/80", "spo2": 94, "rr": 22},
        "agents": {
            "vision": "live",
            "vlm": "gated",
            "assistant": "grounded",
            "memory": "events+vitals+evidence",
            "medplum": "planned-fhir-shape",
        },
        "evidence": {"status": "clip buffer", "retention": "event-scoped"},
        "recent_events": [event.model_dump(mode="json") for event in events[-12:]],
        "app_events": APP_EVENTS,
    }


@app.get("/v0/monitor/stream.mjpg")
def monitor_stream(
    source: str = "synthetic",
    scenario: SyntheticScenario = SyntheticScenario.NORMAL,
    fps: int = 4,
) -> StreamingResponse:
    return StreamingResponse(
        mjpeg_stream(source=source, scenario=scenario, fps=fps),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/v0/monitor/frame.jpg")
def monitor_frame(scenario: SyntheticScenario = SyntheticScenario.NORMAL) -> StreamingResponse:
    analysis = analysis_for(scenario, 0, 48, CameraRole.CCTV)
    image = render_frame(
        analysis,
        scenario=scenario,
        camera_role=CameraRole.CCTV,
        frame_index=0,
    )
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return StreamingResponse(BytesIO(buffer.getvalue()), media_type="image/jpeg")


@app.get("/v0/events")
def events() -> dict:
    return {"ok": True, "events": APP_EVENTS}


@app.post("/v0/events")
def create_event(event_payload: dict[str, Any]) -> dict:
    event = {
        "id": event_payload.get("id") or f"evt-{timestamp_slug()}",
        "status": "unreviewed",
        **event_payload,
    }
    APP_EVENTS.insert(0, event)
    return {"ok": True, "event": event}


@app.get("/v0/events/{event_id}")
def event_detail(event_id: str) -> dict:
    return {"ok": True, "event": find_event(event_id)}


@app.post("/v0/events/{event_id}/review")
def review_event(event_id: str, req: ReviewRequest) -> dict:
    event = find_event(event_id)
    event["status"] = req.action
    record = {
        "event_id": event_id,
        "action": req.action,
        "note": req.note,
        "reviewer_id": req.reviewer_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    REVIEW_LOG.append(record)
    return {"ok": True, "event": event, "review": record}


@app.get("/v0/vitals/trend")
def vitals_trend(bed_id: str = DEFAULT_BED_ID, metric: str | None = None) -> dict:
    return vitals_history_payload(bed_id, metric)


@app.get("/v0/bed/{bed_id}/vitals/history")
def bed_vitals_history(bed_id: str, metric: str | None = None) -> dict:
    return vitals_history_payload(bed_id, metric)


@app.get("/v0/state-reference")
def state_reference() -> dict:
    return {
        "ok": True,
        "states": {
            "connection": ["initializing", "live", "reconnecting", "degraded_low_fps", "offline"],
            "bed": [state.value for state in BedState] + ["bed_empty", "view_obstructed"],
            "iv": [state.value for state in IVState],
            "severity": [severity.value for severity in Severity],
            "event_type": [event_type.value for event_type in EventType],
        },
        "rules": {
            "vitals": VITAL_RULES,
            "severity_by_event": {event_type.value: severity_for(event_type).value for event_type in EventType},
        },
        "cases": REFERENCE_CASES,
        "reference_docs": [
            "/docs/archive/aida_prd_v0.1.md",
            "/docs/archive/aida_build_guide.md",
            "/docs/ONE_BED_REMOTE_MONITORING_PLAN.html",
        ],
        "reference_assets": reference_assets(),
        "routes": {
            "setup": "/setup",
            "bed_setup": "/bed/{bed_id}/setup",
            "monitor": "/monitor",
            "review": "/review",
            "state_reference": "/state-reference",
        },
    }


@app.get("/v0/bed/{bed_id}/summary")
def bed_summary(bed_id: str) -> dict:
    summary = compose_summary(bed_id)
    return {
        "ok": True,
        "bed_id": bed_id,
        "summary": summary,
        "preview": "One-bed live monitor · SpO2 trend needs review · no staff in current window",
        "suggested_questions": suggested_questions(bed_id),
        "grounding": {
            "events": [event["id"] for event in APP_EVENTS[:3]],
            "vitals": "/v0/bed/{bed_id}/vitals/history",
            "transcripts": f"/v0/bed/{bed_id}/transcripts",
            "state_reference": "/v0/state-reference",
        },
    }


@app.post("/v0/assistant/chat")
def assistant_chat(req: AssistantRequest) -> dict:
    answer, model_meta = assistant_answer(req.message, req.bed_id)
    return {
        "ok": True,
        "message": req.message,
        "answer": answer,
        **model_meta,
        "citations": [
            {"label": "Vitals OCR 06:42-07:14", "event_id": "evt-spo2-0714"},
            {"label": "Event timeline", "event_id": req.event_id or "evt-spo2-0714"},
            {"label": "State reference", "route": "/v0/state-reference"},
        ],
        "tools_used": ["get_current_room_state", "get_event_timeline", "get_vitals_trend"],
    }


@app.post("/v0/transcripts")
def create_transcript(req: TranscriptRequest) -> dict:
    record = {
        "id": f"trn-{timestamp_slug()}",
        "bed_id": req.bed_id,
        "speaker": req.speaker,
        "text": req.text,
        "event_id": req.event_id,
        "captured_at": (req.captured_at or datetime.now(timezone.utc)).isoformat(),
    }
    store.append_transcript(req.bed_id, record)
    return {"ok": True, "transcript": record}


@app.get("/v0/bed/{bed_id}/transcripts")
def bed_transcripts(bed_id: str) -> dict:
    return {"ok": True, "bed_id": bed_id, "transcripts": store.transcripts[bed_id][-50:]}


@app.get("/v0/setup/config")
def get_setup_config(bed_id: str = DEFAULT_BED_ID) -> dict:
    return {"ok": True, "bed_id": bed_id, "config": setup_config_for(bed_id)}


@app.post("/v0/setup/config")
def save_setup_config(req: SetupConfigRequest, bed_id: str = DEFAULT_BED_ID) -> dict:
    return save_bed_setup_config(bed_id, req)


@app.get("/v0/bed/{bed_id}/setup/config")
def get_bed_setup_config(bed_id: str) -> dict:
    return {"ok": True, "bed_id": bed_id, "config": setup_config_for(bed_id)}


@app.post("/v0/bed/{bed_id}/setup/config")
def save_bed_setup_config(bed_id: str, req: SetupConfigRequest) -> dict:
    config = setup_config_for(bed_id)
    config.update(req.model_dump(exclude_none=True))
    SETUP_CONFIGS[bed_id] = config
    return {"ok": True, "bed_id": bed_id, "config": config}


@app.get("/v0/bed/{bed_id}/setup/next")
def bed_setup_next(bed_id: str) -> dict:
    config = setup_config_for(bed_id)
    missing = [key for key in ["source_url", "bed_zone_polygon"] if not config.get(key)]
    return {
        "ok": True,
        "bed_id": bed_id,
        "ready": not missing,
        "missing": missing,
        "next_route": f"/bed/{bed_id}/monitor" if not missing else f"/bed/{bed_id}/setup",
    }


@app.post("/v0/setup/test")
def test_setup(payload: dict[str, Any] | None = None) -> dict:
    payload = payload or {}
    bed_id = payload.get("bed_id") or DEFAULT_BED_ID
    source = payload.get("source_url") or setup_config_for(bed_id).get("source_url") or "synthetic"
    return {
        "ok": True,
        "bed_id": bed_id,
        "source_url": source,
        "status": "connected",
        "codec": "H.264/MJPEG dev bridge",
        "resolution": "1920x1080",
        "fps": 24,
        "latency_ms": 180,
        "stream_url": "/v0/monitor/stream.mjpg?source=synthetic&scenario=normal&fps=4",
    }


@app.get("/v0/runs")
def runs() -> dict:
    return {"ok": True, "runs": list_runs(GENERATED_DIR)}


@app.get("/v0/vlm/reports")
def vlm_reports() -> dict:
    return {"ok": True, "reports": list_vlm_reports(GENERATED_DIR)}


@app.post("/v0/synthetic/scenario")
def synthetic_scenario(req: ScenarioRequest) -> dict:
    from .synthetic import generate_scenario, manifest_to_json

    name = req.name or f"{req.scenario.value}-{req.camera_role.value}-{timestamp_slug()}"
    out_dir = GENERATED_DIR / name
    manifest = generate_scenario(req.scenario, out_dir, req.frames, req.camera_role)
    return {
        "ok": True,
        "output_dir": str(out_dir),
        "manifest": manifest_to_json(manifest),
    }


@app.post("/v0/synthetic/replay")
def synthetic_replay(req: ReplayRequest) -> dict:
    from .synthetic import generate_scenario, manifest_to_json

    name = req.name or f"replay-{req.scenario.value}-{req.camera_role.value}-{timestamp_slug()}"
    out_dir = GENERATED_DIR / name
    manifest = generate_scenario(req.scenario, out_dir, req.frames, req.camera_role)
    replay_events = []
    state = store.state(req.bed_id, req.patient_id)
    for meta in manifest.frames:
        evidence = Evidence(filename=meta.filename, path=str(out_dir / meta.filename))
        state, events = machine.process(
            state,
            meta.analysis,
            at=meta.captured_at,
            bed_id=req.bed_id,
            patient_id=req.patient_id,
            camera_id=req.camera_id,
            evidence=evidence,
        )
        store.save(state, events)
        store.append_vitals(req.bed_id, meta.analysis, meta.captured_at)
        replay_events.extend(events)
    expected = expected_events_for_manifest(
        manifest,
        bed_id=req.bed_id,
        patient_id=req.patient_id,
        camera_id=req.camera_id,
        output_dir=out_dir,
    )
    metrics = event_metrics(expected, replay_events)
    report = {
        "state": state.model_dump(mode="json"),
        "events": [event.model_dump(mode="json") for event in replay_events],
        "expected_events": [event.model_dump(mode="json") for event in expected],
        "metrics": metrics,
    }
    (out_dir / "replay_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return {
        "ok": True,
        "output_dir": str(out_dir),
        "state": state.model_dump(mode="json"),
        "events": [event.model_dump(mode="json") for event in replay_events],
        "metrics": metrics,
        "manifest": manifest_to_json(manifest),
    }


@app.post("/v0/frame")
async def process_frame(
    bed_id: Annotated[str, Form()],
    patient_id: Annotated[str | None, Form()] = None,
    camera_id: Annotated[str | None, Form()] = None,
    captured_at: Annotated[str | None, Form()] = None,
    analysis: Annotated[str | None, Form()] = None,
    frame: Annotated[UploadFile | None, File()] = None,
) -> dict:
    at = parse_dt(captured_at)
    parsed_analysis = parse_analysis(analysis)
    evidence = await save_upload(frame) if frame else None
    state = store.state(bed_id, patient_id)
    next_state, events = machine.process(
        state,
        parsed_analysis,
        at=at,
        bed_id=bed_id,
        patient_id=patient_id,
        camera_id=camera_id,
        evidence=evidence,
    )
    store.save(next_state, events)
    store.append_vitals(bed_id, parsed_analysis, at)
    return {
        "ok": True,
        "state": next_state.model_dump(mode="json"),
        "events": [event.model_dump(mode="json") for event in events],
        "analysis": parsed_analysis.model_dump(mode="json"),
    }


@app.get("/v0/bed/{bed_id}/state")
def get_state(bed_id: str) -> dict:
    state = store.state(bed_id)
    return {
        "ok": True,
        "state": state.model_dump(mode="json"),
        "recent_events": [event.model_dump(mode="json") for event in store.events[bed_id][-50:]],
    }


@app.post("/v0/video/extract")
async def video_extract(
    video: Annotated[UploadFile, File()],
    every_seconds: Annotated[float, Form()] = 1.0,
    limit: Annotated[int, Form()] = 120,
) -> VideoExtractResponse:
    from .video import extract_frames

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    video_path = UPLOAD_DIR / f"{timestamp_slug()}-{video.filename or 'video.mp4'}"
    with video_path.open("wb") as f:
        shutil.copyfileobj(video.file, f)
    out_dir = GENERATED_DIR / f"extracted-{video_path.stem}"
    frames = extract_frames(video_path, out_dir, every_seconds=every_seconds, limit=limit)
    return VideoExtractResponse(output_dir=str(out_dir), frames=[str(path) for path in frames])


def mockup_page(relative_path: str, page: str, bed_id: str) -> str:
    path = MOCKUPS_DIR / relative_path
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"mockup not found: {relative_path}")
    html = path.read_text(encoding="utf-8")
    base_href = "/mockups/" + str(Path(relative_path).parent).replace("\\", "/") + "/"
    html = html.replace("<head>", f'<head><base href="{base_href}">', 1)
    bridge = f"""
<script>
  window.AIDA_PAGE = {json.dumps(page)};
  window.AIDA_BED_ID = {json.dumps(bed_id)};
  window.AIDA_API_BASE = "";
</script>
<script src="/mockups/bridge.js"></script>
"""
    return html.replace("</body>", f"{bridge}</body>")


def find_event(event_id: str) -> dict[str, Any]:
    for event in APP_EVENTS:
        if event["id"] == event_id:
            return event
    raise HTTPException(status_code=404, detail=f"event not found: {event_id}")


def setup_config_for(bed_id: str) -> dict[str, Any]:
    if bed_id not in SETUP_CONFIGS:
        SETUP_CONFIGS[bed_id] = json.loads(json.dumps(DEFAULT_SETUP_CONFIG))
    return SETUP_CONFIGS[bed_id]


def reference_assets() -> list[str]:
    if not MOCKUPS_DIR.exists():
        return []
    return [
        "/" + str(path.relative_to(APP_ROOT))
        for path in sorted(MOCKUPS_DIR.rglob("*"))
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".svg"}
    ]


def demo_vitals_rows(bed_id: str) -> list[dict[str, Any]]:
    if store.vitals[bed_id]:
        return store.vitals[bed_id]
    now = datetime.now(timezone.utc)
    rows: list[dict[str, Any]] = []
    for i, minutes_ago in enumerate(range(90, -1, -10)):
        at = (now - timedelta(minutes=minutes_ago)).isoformat()
        rows.extend(
            [
                {"kind": "hr", "value": 70 + min(i, 4), "unit": "bpm", "confidence": 0.95, "at": at},
                {
                    "kind": "spo2",
                    "value": max(94, 99 - round(i * 0.7)),
                    "unit": "%",
                    "confidence": 0.96,
                    "at": at,
                },
                {"kind": "rr", "value": 18 + (1 if i > 6 else 0), "unit": "/min", "confidence": 0.9, "at": at},
                {
                    "kind": "bp",
                    "systolic": 118 + (1 if i % 3 == 0 else 0),
                    "diastolic": 76,
                    "unit": "mmHg",
                    "confidence": 0.88,
                    "at": at,
                },
            ]
        )
    return rows


def vitals_history_payload(bed_id: str, metric: str | None = None) -> dict[str, Any]:
    rows = demo_vitals_rows(bed_id)
    if metric:
        rows = [row for row in rows if row["kind"].lower() == metric.lower()]
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row["kind"], []).append(row)
    return {
        "ok": True,
        "bed_id": bed_id,
        "window": "90m",
        "metric": metric,
        "rows": rows[-120:],
        "vitals": grouped,
        "latest": latest_vitals(grouped),
        "source": "monitor_ocr",
    }


def latest_vitals(grouped: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    latest: dict[str, Any] = {}
    for kind, rows in grouped.items():
        row = rows[-1]
        if kind == "bp":
            latest[kind] = f"{row.get('systolic')}/{row.get('diastolic')}"
        else:
            latest[kind] = row.get("value")
    return latest


def compose_summary(bed_id: str) -> str:
    state = store.state(bed_id, DEFAULT_PATIENT_ID)
    vitals = latest_vitals(vitals_history_payload(bed_id)["vitals"])
    transcripts = store.transcripts[bed_id][-3:]
    transcript_note = ""
    if transcripts:
        transcript_note = " Recent room audio: " + " ".join(t["text"] for t in transcripts)
    return (
        f"Bed {bed_id}: patient is currently {state.bed_state.value.replace('_', ' ') or 'in bed'}. "
        f"Latest monitor OCR shows HR {vitals.get('hr', 72)}, BP {vitals.get('bp', '118/76')}, "
        f"SpO2 {vitals.get('spo2', 94)}, RR {vitals.get('rr', 18)}. "
        "The active review item is a SpO2 decline with evidence attached; no autonomous diagnosis "
        "or treatment recommendation is being made. Staff presence, bed state, monitor OCR, IV/oxygen, "
        f"and event review state are available as grounded context.{transcript_note}"
    )


def suggested_questions(bed_id: str) -> list[str]:
    state = store.state(bed_id, DEFAULT_PATIENT_ID)
    suggestions = [
        "Give me the current room summary",
        "Show evidence for the SpO2 alert",
        "What needs review now?",
    ]
    if state.staff_present:
        suggestions.append("What did staff do during the visit?")
    else:
        suggestions.append("When was staff last present?")
    suggestions.append("Any oxygen, IV, or breathing concerns?")
    return suggestions


def assistant_answer(message: str, bed_id: str) -> tuple[str, dict[str, Any]]:
    model_answer = ask_openai_assistant(message, bed_id)
    if model_answer:
        return model_answer, {
            "model_used": True,
            "model": os.getenv("OPENAI_ASSISTANT_MODEL") or os.getenv("OPENAI_TEXT_MODEL") or "gpt-5-mini",
        }
    text = message.lower()
    if "staff" in text or "nurse" in text or "visit" in text:
        return (
            "No staff presence has been recorded after 05:12 AM in the current demo timeline. "
            "This answer is grounded in the staff log and room-state feed."
        ), {"model_used": False, "fallback_reason": "model unavailable or not configured"}
    if "spo" in text or "oxygen" in text or "distress" in text:
        return (
            "SpO2 declined from 99% to 94% before the warning event. The current system treats this "
            "as a review-required trend, not an autonomous diagnosis."
        ), {"model_used": False, "fallback_reason": "model unavailable or not configured"}
    if "review" in text or "alert" in text:
        return (
            "The highest priority review item is evt-spo2-0714: SpO2 trending down, critical severity, "
            "with monitor OCR and timeline evidence attached."
        ), {"model_used": False, "fallback_reason": "model unavailable or not configured"}
    if "evidence" in text:
        return (
            "Evidence is available as a still frame and event-scoped stream/clip reference for each event. "
            "Open the review page to label the event and attach notes."
        ), {"model_used": False, "fallback_reason": "model unavailable or not configured"}
    return (
        f"{compose_summary(bed_id)} Current room state: patient is in bed, vitals are HR 72, BP 118/76, SpO2 94, RR 18, "
        "and there is one critical vitals trend awaiting review."
    ), {"model_used": False, "fallback_reason": "model unavailable or not configured"}


def ask_openai_assistant(message: str, bed_id: str) -> str | None:
    load_local_env()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except ImportError:
        return None
    try:
        client = OpenAI(api_key=api_key, timeout=20)
        model = os.getenv("OPENAI_ASSISTANT_MODEL") or os.getenv("OPENAI_TEXT_MODEL") or "gpt-5-mini"
        context = {
            "summary": compose_summary(bed_id),
            "events": APP_EVENTS,
            "vitals": vitals_history_payload(bed_id)["latest"],
            "transcripts": store.transcripts[bed_id][-5:],
            "reference_cases": REFERENCE_CASES,
        }
        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are Ask Aida for a one-bed remote patient monitoring prototype. "
                        "Answer briefly. Ground every answer in the provided state, event, vitals, "
                        "transcript, and reference-case context. Do not diagnose or prescribe."
                    ),
                },
                {"role": "user", "content": f"Context JSON: {json.dumps(context, default=str)}\n\nQuestion: {message}"},
            ],
        )
        return response.output_text.strip()
    except Exception:
        return None


def parse_analysis(raw: str | None) -> FrameAnalysis:
    if not raw:
        raise HTTPException(
            status_code=400,
            detail="analysis JSON is required for this synthetic-first build",
        )
    try:
        return FrameAnalysis.model_validate(json.loads(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"invalid analysis JSON: {exc}") from exc


async def save_upload(frame: UploadFile) -> Evidence:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(frame.filename or "frame.png").name
    path = UPLOAD_DIR / f"{timestamp_slug()}-{safe_name}"
    with path.open("wb") as f:
        shutil.copyfileobj(frame.file, f)
    return Evidence(filename=safe_name, path=str(path))


def parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid captured_at: {value}") from exc
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def mjpeg_stream(source: str, scenario: SyntheticScenario, fps: int):
    delay = 1 / max(1, min(fps, 12))
    if source == "synthetic":
        yield from synthetic_mjpeg_stream(scenario, delay)
        return
    yield from camera_mjpeg_stream(source, delay, fallback_scenario=scenario)


def synthetic_mjpeg_stream(scenario: SyntheticScenario, delay: float):
    index = 0
    while True:
        analysis = analysis_for(scenario, index % 48, 48, CameraRole.CCTV)
        image = render_frame(
            analysis,
            scenario=scenario,
            camera_role=CameraRole.CCTV,
            frame_index=index % 48,
        )
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=86)
        yield mjpeg_part(buffer.getvalue())
        index += 1
        time.sleep(delay)


def camera_mjpeg_stream(source: str, delay: float, *, fallback_scenario: SyntheticScenario):
    try:
        import cv2
    except ImportError:
        yield from synthetic_mjpeg_stream(fallback_scenario, delay)
        return

    capture_source: int | str = int(source) if source.isdigit() else source
    cap = cv2.VideoCapture(capture_source)
    if not cap.isOpened():
        yield from synthetic_mjpeg_stream(fallback_scenario, delay)
        return
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
            if ok:
                yield mjpeg_part(encoded.tobytes())
            time.sleep(delay)
    finally:
        cap.release()


def mjpeg_part(payload: bytes) -> bytes:
    return (
        b"--frame\r\n"
        b"Content-Type: image/jpeg\r\n"
        b"Cache-Control: no-store\r\n\r\n" + payload + b"\r\n"
    )
