from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import FrameAnalysis, SyntheticManifest, VisionEvent
from .state import VisionStateMachine, fresh_state


def expected_events_for_manifest(
    manifest: SyntheticManifest,
    *,
    bed_id: str,
    patient_id: str | None,
    camera_id: str | None,
    output_dir: Path | None = None,
) -> list[VisionEvent]:
    machine = VisionStateMachine()
    state = fresh_state(bed_id, patient_id)
    events: list[VisionEvent] = []
    for meta in manifest.frames:
        evidence = None
        if output_dir:
            from .models import Evidence

            evidence = Evidence(filename=meta.filename, path=str(output_dir / meta.filename))
        state, emitted = machine.process(
            state,
            meta.analysis,
            at=meta.captured_at,
            bed_id=bed_id,
            patient_id=patient_id,
            camera_id=camera_id,
            evidence=evidence,
        )
        events.extend(emitted)
    return events


def event_metrics(expected: list[VisionEvent], actual: list[VisionEvent]) -> dict[str, Any]:
    expected_counts = Counter(event.event_type.value for event in expected)
    actual_counts = Counter(event.event_type.value for event in actual)
    labels = sorted(set(expected_counts) | set(actual_counts))
    true_positive = sum(min(expected_counts[label], actual_counts[label]) for label in labels)
    false_positive = sum(max(0, actual_counts[label] - expected_counts[label]) for label in labels)
    false_negative = sum(max(0, expected_counts[label] - actual_counts[label]) for label in labels)
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 1.0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "expected_counts": dict(expected_counts),
        "actual_counts": dict(actual_counts),
        "true_positive": true_positive,
        "false_positive": false_positive,
        "false_negative": false_negative,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def frame_analysis_metrics(expected: list[FrameAnalysis], actual: list[FrameAnalysis]) -> dict[str, Any]:
    labels = [
        "bed_state",
        "staff_present",
        "iv_state",
        "fall_suspected",
        "fall_confirmed",
        "hr_abnormal",
        "spo2_abnormal",
    ]
    correct = Counter()
    total = Counter()
    mismatches = []

    for idx, (truth, observed) in enumerate(zip(expected, actual, strict=False)):
        pairs = {
            "bed_state": (truth.bed_state.value, observed.bed_state.value),
            "staff_present": (truth.staff_present, observed.staff_present),
            "iv_state": (truth.iv.state.value, observed.iv.state.value),
            "fall_suspected": (truth.fall.suspected, observed.fall.suspected),
            "fall_confirmed": (truth.fall.confirmed, observed.fall.confirmed),
            "hr_abnormal": (vital_flag(truth, "hr"), vital_flag(observed, "hr")),
            "spo2_abnormal": (vital_flag(truth, "spo2"), vital_flag(observed, "spo2")),
        }
        for label in labels:
            total[label] += 1
            if pairs[label][0] == pairs[label][1]:
                correct[label] += 1
            else:
                mismatches.append(
                    {
                        "frame_index": idx,
                        "field": label,
                        "expected": pairs[label][0],
                        "actual": pairs[label][1],
                    }
                )

    total_checks = sum(total.values())
    correct_checks = sum(correct.values())
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "frame_count": len(expected),
        "field_accuracy": {
            label: round(correct[label] / total[label], 4) if total[label] else 1.0 for label in labels
        },
        "overall_accuracy": round(correct_checks / total_checks, 4) if total_checks else 1.0,
        "mismatch_count": len(mismatches),
        "mismatches": mismatches[:100],
    }


def vital_flag(analysis: FrameAnalysis, kind: str) -> bool:
    vital = analysis.vitals.get(kind)
    if not vital:
        return False
    if kind == "hr" and vital.value is not None:
        return vital.value < 50 or vital.value > 120
    if kind == "spo2" and vital.value is not None:
        return vital.value < 92
    return False
