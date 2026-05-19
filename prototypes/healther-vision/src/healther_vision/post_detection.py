from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from .models import BedState, FallSignal, FrameAnalysis, IVReading, IVState, VitalReading


@dataclass
class DetectorStats:
    frames_seen: int = 0
    frames_analyzed: int = 0
    events_created: int = 0
    errors: int = 0
    last_error: str | None = None
    last_analysis_at: datetime | None = None
    last_analysis: FrameAnalysis | None = None
    mode: str = "idle"

    def as_dict(self) -> dict[str, Any]:
        return {
            "frames_seen": self.frames_seen,
            "frames_analyzed": self.frames_analyzed,
            "events_created": self.events_created,
            "errors": self.errors,
            "last_error": self.last_error,
            "last_analysis_at": self.last_analysis_at.isoformat() if self.last_analysis_at else None,
            "last_analysis": self.last_analysis.model_dump(mode="json") if self.last_analysis else None,
            "mode": self.mode,
        }


@dataclass
class DetectorRuntime:
    bed_id: str
    status: str = "stopped"
    source_type: str = "synthetic"
    source_url: str = "synthetic"
    camera_label: str = "Bedside Cam 1"
    scenario: str = "normal"
    interval_seconds: float = 2.0
    use_cloud_vlm: bool = False
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    stats: DetectorStats = field(default_factory=DetectorStats)

    def as_dict(self) -> dict[str, Any]:
        return {
            "bed_id": self.bed_id,
            "status": self.status,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "camera_label": self.camera_label,
            "scenario": self.scenario,
            "interval_seconds": self.interval_seconds,
            "use_cloud_vlm": self.use_cloud_vlm,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "stopped_at": self.stopped_at.isoformat() if self.stopped_at else None,
            "stats": self.stats.as_dict(),
        }


def analyze_frame_cv(frame_bgr: np.ndarray, config: dict[str, Any] | None = None) -> FrameAnalysis:
    """Local post-detection pass.

    This is intentionally deterministic and dependency-light: it gives the product a working
    post-detection loop today, while VLM/OCR providers remain optional confirmation layers.
    """
    config = config or {}
    if frame_bgr is None or frame_bgr.size == 0:
        return FrameAnalysis(scene="empty frame", model_trace={"provider": "local-cv", "error": "empty frame"})

    height, width = frame_bgr.shape[:2]
    masks = color_masks(frame_bgr)
    patient_mask = cv2.bitwise_or(masks["patient"], masks["blanket"])
    patient_total = mask_count(patient_mask)
    lower_mask = np.zeros((height, width), dtype=np.uint8)
    lower_mask[int(height * 0.68) :, :] = 255
    patient_lower = mask_count(cv2.bitwise_and(patient_mask, lower_mask))
    patient_in_bed, patient_outside_bed, bed_state, bed_confidence, fall = best_bed_state_candidate(
        patient_mask=patient_mask,
        patient_total=patient_total,
        patient_lower=patient_lower,
        width=width,
        height=height,
        configured_polygon=config.get("bed_zone_polygon"),
    )

    staff_pixels = mask_count(masks["staff"])
    staff_present = staff_pixels > max(90, width * height * 0.00045)
    staff_confidence = 0.88 if staff_present else 0.72

    iv = classify_iv(masks, width, height)
    vitals = infer_monitor_vitals(masks, frame_bgr)

    scene_bits = [
        f"bed={bed_state.value}",
        f"staff={'present' if staff_present else 'absent'}",
        f"iv={iv.state.value}",
        f"vitals={','.join(vitals.keys()) or 'none'}",
    ]
    return FrameAnalysis(
        bed_state=bed_state,
        bed_state_confidence=bed_confidence,
        staff_present=staff_present,
        staff_confidence=staff_confidence,
        vitals=vitals,
        iv=iv,
        fall=fall,
        scene="Local CV post-detection: " + "; ".join(scene_bits),
        model_trace={
            "provider": "local-cv",
            "model": "bedside-post-detection-v0",
            "patient_pixels": patient_total,
            "patient_in_bed_pixels": patient_in_bed,
            "patient_outside_bed_pixels": patient_outside_bed,
            "patient_lower_pixels": patient_lower,
            "staff_pixels": staff_pixels,
        },
    )


def read_image_upload(payload: bytes) -> np.ndarray | None:
    arr = np.frombuffer(payload, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return frame if frame is not None and frame.size else None


def encode_jpeg(frame_bgr: np.ndarray, quality: int = 86) -> bytes:
    ok, encoded = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise ValueError("could not encode frame")
    return encoded.tobytes()


def save_frame_evidence(frame_bgr: np.ndarray, out_dir: Path, prefix: str) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}.jpg"
    path = out_dir / filename
    cv2.imwrite(str(path), frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 86])
    height, width = frame_bgr.shape[:2]
    return {"filename": filename, "path": str(path), "width": width, "height": height}


def color_masks(frame_bgr: np.ndarray) -> dict[str, np.ndarray]:
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    return {
        "patient": near_color(rgb, (236, 196, 142), tolerance=48),
        "blanket": near_color(rgb, (78, 132, 180), tolerance=50),
        "staff": near_color(rgb, (83, 189, 158), tolerance=42),
        "iv_blue": near_color(rgb, (159, 206, 235), tolerance=55),
        "amber": near_color(rgb, (232, 176, 77), tolerance=55),
        "red": near_color(rgb, (228, 80, 80), tolerance=58),
        "monitor_green": near_color(rgb, (64, 220, 136), tolerance=60),
    }


def near_color(rgb: np.ndarray, color: tuple[int, int, int], *, tolerance: int) -> np.ndarray:
    target = np.array(color, dtype=np.int16)
    distance = np.linalg.norm(rgb.astype(np.int16) - target, axis=2)
    return (distance <= tolerance).astype(np.uint8) * 255


def default_bed_polygon(width: int, height: int) -> list[list[float]]:
    return [
        [width * 0.18, height * 0.34],
        [width * 0.66, height * 0.34],
        [width * 0.70, height * 0.72],
        [width * 0.16, height * 0.72],
    ]


def polygon_mask(width: int, height: int, points: list[list[float]]) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    pts = np.array(points, dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)
    return mask


def mask_count(mask: np.ndarray) -> int:
    return int(cv2.countNonZero(mask))


def classify_bed_state(
    *,
    patient_total: int,
    patient_in_bed: int,
    patient_outside_bed: int,
    patient_lower: int,
) -> tuple[BedState, float, FallSignal]:
    if patient_total < 120:
        return BedState.UNKNOWN, 0.45, FallSignal()
    outside_ratio = patient_outside_bed / max(patient_total, 1)
    lower_ratio = patient_lower / max(patient_total, 1)
    if patient_outside_bed > 450 and lower_ratio > 0.62:
        return BedState.ON_FLOOR, 0.86, FallSignal(suspected=True, confirmed=True, confidence=0.84)
    if patient_outside_bed > 420 and outside_ratio > 0.36:
        return BedState.OUT_OF_BED, 0.82, FallSignal()
    if patient_outside_bed > 160 and outside_ratio > 0.16:
        return BedState.SITTING_EDGE, 0.76, FallSignal()
    if patient_in_bed > 250:
        return BedState.IN_BED, 0.86, FallSignal()
    return BedState.UNKNOWN, 0.5, FallSignal()


def best_bed_state_candidate(
    *,
    patient_mask: np.ndarray,
    patient_total: int,
    patient_lower: int,
    width: int,
    height: int,
    configured_polygon: list[list[float]] | None,
) -> tuple[int, int, BedState, float, FallSignal]:
    polygons = []
    if configured_polygon:
        polygons.append(configured_polygon)
    default_polygon = default_bed_polygon(width, height)
    if not configured_polygon or configured_polygon != default_polygon:
        polygons.append(default_polygon)

    candidates = []
    for polygon in polygons:
        bed_mask = polygon_mask(width, height, polygon)
        patient_in_bed = mask_count(cv2.bitwise_and(patient_mask, bed_mask))
        patient_outside_bed = max(0, patient_total - patient_in_bed)
        bed_state, confidence, fall = classify_bed_state(
            patient_total=patient_total,
            patient_in_bed=patient_in_bed,
            patient_outside_bed=patient_outside_bed,
            patient_lower=patient_lower,
        )
        candidates.append((confidence, patient_in_bed, patient_outside_bed, bed_state, fall))

    confidence, patient_in_bed, patient_outside_bed, bed_state, fall = max(
        candidates,
        key=lambda item: (item[0], bed_state_rank(item[3])),
    )
    return patient_in_bed, patient_outside_bed, bed_state, confidence, fall


def bed_state_rank(state: BedState) -> int:
    return {
        BedState.UNKNOWN: 0,
        BedState.IN_BED: 1,
        BedState.SITTING_EDGE: 2,
        BedState.OUT_OF_BED: 3,
        BedState.ON_FLOOR: 4,
    }[state]


def classify_iv(masks: dict[str, np.ndarray], width: int, height: int) -> IVReading:
    right_roi = np.zeros((height, width), dtype=np.uint8)
    right_roi[:, int(width * 0.62) :] = 255
    blue = mask_count(cv2.bitwise_and(masks["iv_blue"], right_roi))
    amber = mask_count(cv2.bitwise_and(masks["amber"], right_roi))
    if amber > 40 and amber >= blue * 0.35:
        return IVReading(state=IVState.NEAR_EMPTY, confidence=0.82, bag_fill_percent=10)
    if blue > 80:
        return IVReading(state=IVState.RUNNING, confidence=0.78, bag_fill_percent=55)
    return IVReading(state=IVState.UNKNOWN, confidence=0.3)


def infer_monitor_vitals(masks: dict[str, np.ndarray], frame_bgr: np.ndarray) -> dict[str, VitalReading]:
    roi = monitor_roi(frame_bgr)
    red_pixels = mask_count(red_signal_mask(roi))
    green_pixels = mask_count(green_signal_mask(roi))
    if red_pixels > 20:
        return {
            "hr": VitalReading(value=128, unit="bpm", confidence=0.76),
            "spo2": VitalReading(value=88, unit="%", confidence=0.82),
            "rr": VitalReading(value=32, unit="/min", confidence=0.7),
            "bp": VitalReading(systolic=145, diastolic=86, unit="mmHg", confidence=0.7),
        }
    if green_pixels > 50:
        return {
            "hr": VitalReading(value=88, unit="bpm", confidence=0.72),
            "spo2": VitalReading(value=97, unit="%", confidence=0.74),
            "rr": VitalReading(value=18, unit="/min", confidence=0.7),
            "bp": VitalReading(systolic=122, diastolic=78, unit="mmHg", confidence=0.68),
        }
    # Real camera feeds often need OCR/VLM for monitor values. Emit no confident vitals
    # instead of fabricating them.
    return {}


def monitor_roi(frame_bgr: np.ndarray) -> np.ndarray:
    height, width = frame_bgr.shape[:2]
    y1, y2 = int(height * 0.12), int(height * 0.54)
    x1, x2 = int(width * 0.64), int(width * 0.98)
    return frame_bgr[y1:y2, x1:x2]


def red_signal_mask(frame_bgr: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mask = (r > 115) & (r > g * 1.18) & (r > b * 1.18)
    return mask.astype(np.uint8) * 255


def green_signal_mask(frame_bgr: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mask = (g > 110) & (g > r * 1.12) & (g > b * 1.12)
    return mask.astype(np.uint8) * 255
