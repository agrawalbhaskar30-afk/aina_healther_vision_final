from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class CameraRole(StrEnum):
    CCTV = "cctv"
    TABLET = "tablet"


class BedState(StrEnum):
    UNKNOWN = "unknown"
    IN_BED = "in_bed"
    SITTING_EDGE = "sitting_edge"
    OUT_OF_BED = "out_of_bed"
    ON_FLOOR = "on_floor"


class IVState(StrEnum):
    UNKNOWN = "unknown"
    RUNNING = "running"
    NEAR_EMPTY = "near_empty"
    COMPLETED_OR_STOPPED = "completed_or_stopped"
    UNCLEAR = "unclear"
    ABSENT = "absent"


class EventType(StrEnum):
    PATIENT_IN_BED = "PATIENT_IN_BED"
    PATIENT_SITTING_EDGE = "PATIENT_SITTING_EDGE"
    PATIENT_OUT_OF_BED = "PATIENT_OUT_OF_BED"
    PATIENT_ON_FLOOR = "PATIENT_ON_FLOOR"
    FALL_SUSPECTED = "FALL_SUSPECTED"
    FALL_CONFIRMED = "FALL_CONFIRMED"
    STAFF_VISIT_STARTED = "STAFF_VISIT_STARTED"
    STAFF_VISIT_ENDED = "STAFF_VISIT_ENDED"
    NO_STAFF_VISIT = "NO_STAFF_VISIT"
    VITAL_READING_ACCEPTED = "VITAL_READING_ACCEPTED"
    VITALS_OUT_OF_RANGE = "VITALS_OUT_OF_RANGE"
    IV_RUNNING = "IV_RUNNING"
    IV_NEAR_EMPTY = "IV_NEAR_EMPTY"
    IV_COMPLETED_OR_STOPPED = "IV_COMPLETED_OR_STOPPED"
    IV_STATE_UNCLEAR = "IV_STATE_UNCLEAR"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class FallSignal(BaseModel):
    suspected: bool = False
    confirmed: bool = False
    confidence: float = 0.0


class VitalReading(BaseModel):
    value: float | None = None
    systolic: float | None = None
    diastolic: float | None = None
    unit: str | None = None
    confidence: float = 0.75


class IVReading(BaseModel):
    state: IVState = IVState.UNKNOWN
    confidence: float = 0.0
    bag_fill_percent: float | None = None
    note: str | None = None


class FrameAnalysis(BaseModel):
    bed_state: BedState = BedState.UNKNOWN
    bed_state_confidence: float = 0.5
    staff_present: bool = False
    staff_confidence: float = 0.5
    vitals: dict[str, VitalReading] = Field(default_factory=dict)
    iv: IVReading = Field(default_factory=IVReading)
    fall: FallSignal = Field(default_factory=FallSignal)
    scene: str = ""
    model_trace: dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    filename: str | None = None
    path: str | None = None
    width: int | None = None
    height: int | None = None


class VisionEvent(BaseModel):
    event_type: EventType
    severity: Severity
    confidence: float
    at: datetime
    bed_id: str
    patient_id: str | None = None
    camera_id: str | None = None
    evidence: Evidence | None = None
    rule_trace: str
    payload: dict[str, Any] = Field(default_factory=dict)
    review_required: bool = False


class BedVisionState(BaseModel):
    bed_id: str
    patient_id: str | None = None
    updated_at: datetime
    bed_state: BedState = BedState.UNKNOWN
    bed_state_since: datetime | None = None
    fall_suspected_at: datetime | None = None
    fall_confirmed_at: datetime | None = None
    staff_present: bool = False
    staff_visit_started_at: datetime | None = None
    last_staff_seen_at: datetime | None = None
    last_staff_visit_ended_at: datetime | None = None
    no_staff_alerted_at: datetime | None = None
    latest_accepted_vitals: dict[str, dict[str, Any]] = Field(default_factory=dict)
    vital_windows: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    abnormal_streaks: dict[str, int] = Field(default_factory=dict)
    iv_state: IVState = IVState.UNKNOWN
    iv_state_since: datetime | None = None
    iv_history: list[dict[str, Any]] = Field(default_factory=list)


class SyntheticScenario(StrEnum):
    NORMAL = "normal"
    FALL = "fall"
    OUT_OF_BED = "out_of_bed"
    STAFF_VISIT = "staff_visit"
    VITALS_ALERT = "vitals_alert"
    IV_NEAR_EMPTY = "iv_near_empty"
    TABLET_ROUND = "tablet_round"


class SyntheticFrameMeta(BaseModel):
    index: int
    filename: str
    camera_role: CameraRole
    scenario: SyntheticScenario
    captured_at: datetime
    analysis: FrameAnalysis


class SyntheticManifest(BaseModel):
    scenario: SyntheticScenario
    camera_role: CameraRole
    frames: list[SyntheticFrameMeta]
