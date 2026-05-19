from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean
from typing import Any

from .models import (
    BedState,
    BedVisionState,
    EventType,
    FrameAnalysis,
    IVState,
    Severity,
    VisionEvent,
)

FALL_CONFIRM_SECONDS = 5
NO_STAFF_SECONDS = 2 * 60 * 60
VITAL_STABLE_READINGS = 3
VITAL_ABNORMAL_READINGS = 3

VITAL_RULES = {
    "hr": {"min": 50, "max": 120, "tolerance": 4},
    "spo2": {"min": 92, "max": 100, "tolerance": 1},
    "rr": {"min": 8, "max": 30, "tolerance": 2},
    "bp": {"systolic_min": 90, "systolic_max": 180, "diastolic_min": 50, "diastolic_max": 110, "tolerance": 6},
}


class VisionStateMachine:
    def process(
        self,
        state: BedVisionState,
        analysis: FrameAnalysis,
        *,
        at: datetime,
        bed_id: str,
        patient_id: str | None,
        camera_id: str | None,
        evidence: Any = None,
    ) -> tuple[BedVisionState, list[VisionEvent]]:
        events: list[VisionEvent] = []
        state.patient_id = patient_id or state.patient_id
        state.updated_at = at
        self._bed_state(state, analysis, at, bed_id, patient_id, camera_id, evidence, events)
        self._staff(state, analysis, at, bed_id, patient_id, camera_id, evidence, events)
        self._vitals(state, analysis, at, bed_id, patient_id, camera_id, evidence, events)
        self._iv(state, analysis, at, bed_id, patient_id, camera_id, evidence, events)
        return state, events

    def _bed_state(self, state, analysis, at, bed_id, patient_id, camera_id, evidence, events):
        if analysis.bed_state != BedState.UNKNOWN and analysis.bed_state != state.bed_state:
            state.bed_state = analysis.bed_state
            state.bed_state_since = at
            event_type = {
                BedState.IN_BED: EventType.PATIENT_IN_BED,
                BedState.SITTING_EDGE: EventType.PATIENT_SITTING_EDGE,
                BedState.OUT_OF_BED: EventType.PATIENT_OUT_OF_BED,
                BedState.ON_FLOOR: EventType.PATIENT_ON_FLOOR,
            }.get(analysis.bed_state)
            if event_type:
                events.append(
                    event(
                        event_type,
                        at,
                        bed_id,
                        patient_id,
                        camera_id,
                        analysis.bed_state_confidence,
                        f"bed state changed to {analysis.bed_state}",
                        evidence=evidence,
                        payload={"bed_state": analysis.bed_state},
                    )
                )

        on_floor = analysis.bed_state == BedState.ON_FLOOR or analysis.fall.suspected
        if on_floor and state.fall_suspected_at is None:
            state.fall_suspected_at = at
            events.append(
                event(
                    EventType.FALL_SUSPECTED,
                    at,
                    bed_id,
                    patient_id,
                    camera_id,
                    analysis.fall.confidence or analysis.bed_state_confidence,
                    "on-floor or fall cue detected",
                    evidence=evidence,
                    payload={"fall": analysis.fall.model_dump()},
                    review_required=True,
                )
            )
        if on_floor and state.fall_confirmed_at is None:
            elapsed = (at - state.fall_suspected_at).total_seconds() if state.fall_suspected_at else 0
            if analysis.fall.confirmed or elapsed >= FALL_CONFIRM_SECONDS:
                state.fall_confirmed_at = at
                events.append(
                    event(
                        EventType.FALL_CONFIRMED,
                        at,
                        bed_id,
                        patient_id,
                        camera_id,
                        analysis.fall.confidence or analysis.bed_state_confidence,
                        f"fall persisted for {elapsed:.1f}s",
                        evidence=evidence,
                        payload={"fall": analysis.fall.model_dump(), "suspected_for_seconds": elapsed},
                        review_required=True,
                    )
                )
        if not on_floor:
            state.fall_suspected_at = None
            state.fall_confirmed_at = None

    def _staff(self, state, analysis, at, bed_id, patient_id, camera_id, evidence, events):
        if analysis.staff_present and not state.staff_present:
            state.staff_present = True
            state.staff_visit_started_at = at
            state.last_staff_seen_at = at
            state.no_staff_alerted_at = None
            events.append(
                event(
                    EventType.STAFF_VISIT_STARTED,
                    at,
                    bed_id,
                    patient_id,
                    camera_id,
                    analysis.staff_confidence,
                    "staff presence changed false to true",
                    evidence=evidence,
                )
            )
        elif analysis.staff_present:
            state.last_staff_seen_at = at
            state.no_staff_alerted_at = None
        elif state.staff_present:
            state.staff_present = False
            state.staff_visit_started_at = None
            state.last_staff_visit_ended_at = at
            events.append(
                event(
                    EventType.STAFF_VISIT_ENDED,
                    at,
                    bed_id,
                    patient_id,
                    camera_id,
                    analysis.staff_confidence,
                    "staff presence changed true to false",
                    evidence=evidence,
                )
            )

        anchor = max(
            [d for d in [state.last_staff_seen_at, state.last_staff_visit_ended_at, state.updated_at] if d],
            default=at,
        )
        elapsed = (at - anchor).total_seconds()
        if not state.staff_present and elapsed >= NO_STAFF_SECONDS and state.no_staff_alerted_at is None:
            state.no_staff_alerted_at = at
            events.append(
                event(
                    EventType.NO_STAFF_VISIT,
                    at,
                    bed_id,
                    patient_id,
                    camera_id,
                    1.0,
                    f"no staff seen for {elapsed:.0f}s",
                    evidence=evidence,
                    payload={"elapsed_seconds": elapsed},
                )
            )

    def _vitals(self, state, analysis, at, bed_id, patient_id, camera_id, evidence, events):
        for kind, vital in analysis.vitals.items():
            if vital.confidence < 0.65:
                continue
            row = vital.model_dump()
            row["at"] = at.isoformat()
            window = state.vital_windows.setdefault(kind, [])
            window.append(row)
            del window[:-VITAL_STABLE_READINGS]
            abnormal = vital_out_of_range(kind, row)
            state.abnormal_streaks[kind] = state.abnormal_streaks.get(kind, 0) + 1 if abnormal else 0
            if len(window) >= VITAL_STABLE_READINGS and stable(kind, window):
                accepted = average(kind, window)
                previous = state.latest_accepted_vitals.get(kind)
                state.latest_accepted_vitals[kind] = {**accepted, "accepted_at": at.isoformat()}
                previous_value = (
                    {key: value for key, value in previous.items() if key != "accepted_at"}
                    if previous
                    else None
                )
                if previous_value != accepted:
                    events.append(
                        event(
                            EventType.VITAL_READING_ACCEPTED,
                            at,
                            bed_id,
                            patient_id,
                            camera_id,
                            accepted["confidence"],
                            f"{kind} stable across {len(window)} readings",
                            evidence=evidence,
                            payload={"vital": accepted},
                        )
                    )
            if state.abnormal_streaks[kind] == VITAL_ABNORMAL_READINGS:
                events.append(
                    event(
                        EventType.VITALS_OUT_OF_RANGE,
                        at,
                        bed_id,
                        patient_id,
                        camera_id,
                        vital.confidence,
                        f"{kind} abnormal for {VITAL_ABNORMAL_READINGS} consecutive readings",
                        evidence=evidence,
                        payload={"vital": row, "rule": VITAL_RULES.get(kind)},
                        review_required=True,
                    )
                )

    def _iv(self, state, analysis, at, bed_id, patient_id, camera_id, evidence, events):
        if analysis.iv.state in {IVState.UNKNOWN, IVState.ABSENT}:
            return
        if analysis.iv.state == state.iv_state:
            return
        state.iv_state = analysis.iv.state
        state.iv_state_since = at
        state.iv_history.append({**analysis.iv.model_dump(), "at": at.isoformat()})
        del state.iv_history[:-50]
        event_type = {
            IVState.RUNNING: EventType.IV_RUNNING,
            IVState.NEAR_EMPTY: EventType.IV_NEAR_EMPTY,
            IVState.COMPLETED_OR_STOPPED: EventType.IV_COMPLETED_OR_STOPPED,
            IVState.UNCLEAR: EventType.IV_STATE_UNCLEAR,
        }.get(analysis.iv.state)
        if event_type:
            events.append(
                event(
                    event_type,
                    at,
                    bed_id,
                    patient_id,
                    camera_id,
                    analysis.iv.confidence,
                    f"IV state changed to {analysis.iv.state}",
                    evidence=evidence,
                    payload={"iv": analysis.iv.model_dump()},
                    review_required=analysis.iv.state == IVState.UNCLEAR,
                )
            )


def fresh_state(bed_id: str, patient_id: str | None = None) -> BedVisionState:
    now = datetime.now(timezone.utc)
    return BedVisionState(bed_id=bed_id, patient_id=patient_id, updated_at=now)


def event(
    event_type: EventType,
    at: datetime,
    bed_id: str,
    patient_id: str | None,
    camera_id: str | None,
    confidence: float,
    rule_trace: str,
    *,
    evidence=None,
    payload=None,
    review_required=False,
) -> VisionEvent:
    return VisionEvent(
        event_type=event_type,
        severity=severity_for(event_type),
        confidence=max(0.0, min(1.0, confidence)),
        at=at,
        bed_id=bed_id,
        patient_id=patient_id,
        camera_id=camera_id,
        evidence=evidence,
        rule_trace=rule_trace,
        payload=payload or {},
        review_required=review_required,
    )


def severity_for(event_type: EventType) -> Severity:
    if event_type in {EventType.FALL_CONFIRMED, EventType.PATIENT_ON_FLOOR, EventType.VITALS_OUT_OF_RANGE}:
        return Severity.CRITICAL
    if event_type in {
        EventType.FALL_SUSPECTED,
        EventType.PATIENT_SITTING_EDGE,
        EventType.NO_STAFF_VISIT,
        EventType.IV_NEAR_EMPTY,
        EventType.IV_COMPLETED_OR_STOPPED,
        EventType.IV_STATE_UNCLEAR,
    }:
        return Severity.WARNING
    return Severity.INFO


def stable(kind: str, rows: list[dict[str, Any]]) -> bool:
    rule = VITAL_RULES.get(kind, {"tolerance": 1})
    if kind == "bp":
        systolic = [r["systolic"] for r in rows if r.get("systolic") is not None]
        diastolic = [r["diastolic"] for r in rows if r.get("diastolic") is not None]
        return spread(systolic) <= rule["tolerance"] and spread(diastolic) <= rule["tolerance"]
    values = [r["value"] for r in rows if r.get("value") is not None]
    return spread(values) <= rule["tolerance"]


def average(kind: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    if kind == "bp":
        return {
            "kind": kind,
            "systolic": round(mean([r["systolic"] for r in rows if r.get("systolic") is not None])),
            "diastolic": round(mean([r["diastolic"] for r in rows if r.get("diastolic") is not None])),
            "unit": "mmHg",
            "confidence": mean([r.get("confidence", 0.75) for r in rows]),
        }
    return {
        "kind": kind,
        "value": round(mean([r["value"] for r in rows if r.get("value") is not None]), 1 if kind == "temp" else 0),
        "unit": rows[-1].get("unit"),
        "confidence": mean([r.get("confidence", 0.75) for r in rows]),
    }


def vital_out_of_range(kind: str, row: dict[str, Any]) -> bool:
    rule = VITAL_RULES.get(kind)
    if not rule:
        return False
    if kind == "bp":
        s = row.get("systolic")
        d = row.get("diastolic")
        return (s is not None and (s < rule["systolic_min"] or s > rule["systolic_max"])) or (
            d is not None and (d < rule["diastolic_min"] or d > rule["diastolic_max"])
        )
    value = row.get("value")
    return value is not None and (value < rule["min"] or value > rule["max"])


def spread(values: list[float]) -> float:
    return max(values) - min(values) if values else 0.0


class MemoryStore:
    def __init__(self) -> None:
        self.states: dict[str, BedVisionState] = {}
        self.events: defaultdict[str, list[VisionEvent]] = defaultdict(list)
        self.vitals: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
        self.transcripts: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)

    def state(self, bed_id: str, patient_id: str | None = None) -> BedVisionState:
        if bed_id not in self.states:
            self.states[bed_id] = fresh_state(bed_id, patient_id)
        if patient_id:
            self.states[bed_id].patient_id = patient_id
        return self.states[bed_id]

    def save(self, state: BedVisionState, events: list[VisionEvent]) -> None:
        self.states[state.bed_id] = state
        self.events[state.bed_id].extend(events)

    def append_vitals(self, bed_id: str, analysis: FrameAnalysis, at: datetime) -> None:
        for kind, vital in analysis.vitals.items():
            if vital.confidence < 0.4:
                continue
            row = vital.model_dump()
            row.update({"kind": kind, "at": at.isoformat()})
            self.vitals[bed_id].append(row)
        del self.vitals[bed_id][:-500]

    def append_transcript(self, bed_id: str, transcript: dict[str, Any]) -> None:
        self.transcripts[bed_id].append(transcript)
        del self.transcripts[bed_id][:-200]

    def dump(self) -> dict[str, Any]:
        return {
            "states": {bed_id: state.model_dump(mode="json") for bed_id, state in self.states.items()},
            "events": {
                bed_id: [event.model_dump(mode="json") for event in events]
                for bed_id, events in self.events.items()
            },
            "vitals": {bed_id: rows for bed_id, rows in self.vitals.items()},
            "transcripts": {bed_id: rows for bed_id, rows in self.transcripts.items()},
        }

    def load(self, payload: dict[str, Any]) -> None:
        self.states.clear()
        self.events.clear()
        self.vitals.clear()
        self.transcripts.clear()
        for bed_id, state in payload.get("states", {}).items():
            self.states[bed_id] = BedVisionState.model_validate(state)
        for bed_id, events in payload.get("events", {}).items():
            self.events[bed_id].extend(VisionEvent.model_validate(event) for event in events)
        for bed_id, rows in payload.get("vitals", {}).items():
            self.vitals[bed_id].extend(rows)
        for bed_id, transcripts in payload.get("transcripts", {}).items():
            self.transcripts[bed_id].extend(transcripts)
