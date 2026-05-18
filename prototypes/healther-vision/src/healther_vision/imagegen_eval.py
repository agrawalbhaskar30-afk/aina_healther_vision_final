from __future__ import annotations

import json
import statistics
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .evaluation import vital_flag
from .models import BedState, FrameAnalysis, IVReading, IVState
from .vlm import analyze_image, default_provider

DEFAULT_IMAGEGEN_DIR = Path("assets/imagegen_frames/indian_hospital_v0")


def imagegen_ground_truths() -> dict[str, FrameAnalysis]:
    """Human-authored labels for the generated benchmark image set."""
    return {
        "bedside_00_round.png": truth(BedState.IN_BED, staff=True, iv=IVState.RUNNING),
        "bedside_01_monitor_alert.png": truth(BedState.IN_BED, staff=True, iv=IVState.RUNNING),
        "bedside_02_iv_near_empty.png": truth(BedState.IN_BED, iv=IVState.NEAR_EMPTY),
        "bedside_03_sitting_edge.png": truth(BedState.SITTING_EDGE, iv=IVState.RUNNING),
        "bedside_04_on_floor.png": truth(BedState.ON_FLOOR, iv=IVState.RUNNING, fall=True),
        "cctv_00_in_bed.png": truth(BedState.IN_BED, iv=IVState.RUNNING),
        "cctv_01_sitting_edge.png": truth(BedState.SITTING_EDGE, iv=IVState.RUNNING),
        "cctv_02_out_of_bed.png": truth(BedState.OUT_OF_BED, iv=IVState.RUNNING),
        "cctv_03_on_floor.png": truth(BedState.ON_FLOOR, iv=IVState.RUNNING, fall=True),
        "cctv_04_staff_iv_near_empty.png": truth(
            BedState.IN_BED,
            staff=True,
            iv=IVState.NEAR_EMPTY,
        ),
        "gpt_00_staff_visit.png": truth(BedState.IN_BED, staff=True, iv=IVState.RUNNING),
        "gpt_01_sitting_edge.png": truth(BedState.SITTING_EDGE, iv=IVState.RUNNING),
        "gpt_02_out_of_bed.png": truth(BedState.OUT_OF_BED, iv=IVState.RUNNING),
        "gpt_03_on_floor.png": truth(BedState.ON_FLOOR, iv=IVState.RUNNING, fall=True),
        "gpt_04_vitals_iv_alert.png": truth(
            BedState.IN_BED,
            iv=IVState.NEAR_EMPTY,
            spo2=88,
        ),
    }


def truth(
    bed_state: BedState,
    *,
    staff: bool = False,
    iv: IVState = IVState.UNKNOWN,
    fall: bool = False,
    spo2: float | None = None,
) -> FrameAnalysis:
    vitals = {}
    if spo2 is not None:
        vitals["spo2"] = {"value": spo2, "unit": "%", "confidence": 1.0}
    return FrameAnalysis(
        bed_state=bed_state,
        bed_state_confidence=1.0,
        staff_present=staff,
        staff_confidence=1.0,
        vitals=vitals,
        iv=IVReading(state=iv, confidence=1.0),
        fall={"suspected": fall, "confirmed": fall, "confidence": 1.0 if fall else 0.0},
        scene="Human benchmark label",
        model_trace={"provider": "human", "model": "imagegen-labels-v0"},
    )


def benchmark_imagegen_frames(
    image_dir: Path = DEFAULT_IMAGEGEN_DIR,
    *,
    provider: str | None = None,
    model: str | None = None,
    verbose: bool = False,
) -> dict[str, Any]:
    provider = provider or default_provider()
    truths = imagegen_ground_truths()
    results = []
    image_paths = sorted(image_dir.glob("*.png"))
    for index, image_path in enumerate(image_paths, start=1):
        if verbose:
            print(f"[{index}/{len(image_paths)}] {image_path.name} ... ", end="", flush=True)
        started = time.perf_counter()
        item: dict[str, Any] = {"filename": image_path.name, "path": str(image_path)}
        try:
            analysis = analyze_image(image_path, provider=provider, model=model)
            item.update({"ok": True, "analysis": analysis.model_dump(mode="json")})
            if verbose:
                print(
                    "ok "
                    f"bed={analysis.bed_state.value} "
                    f"staff={analysis.staff_present} "
                    f"iv={analysis.iv.state.value} "
                    f"time={time.perf_counter() - started:.2f}s",
                    flush=True,
                )
        except Exception as exc:  # noqa: BLE001 - report per-frame failures without aborting benchmark
            item.update({"ok": False, "error_type": type(exc).__name__, "error": str(exc)})
            if verbose:
                print(f"failed {type(exc).__name__} time={time.perf_counter() - started:.2f}s", flush=True)
        item["latency_seconds"] = round(time.perf_counter() - started, 4)
        if image_path.name in truths:
            item["expected"] = truths[image_path.name].model_dump(mode="json")
        results.append(item)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "kind": "imagegen_vlm_benchmark",
        "provider": provider,
        "model": model,
        "image_dir": str(image_dir),
        "image_count": len(results),
        "results": results,
    }
    report["metrics"] = evaluate_imagegen_report(report)
    return report


def evaluate_imagegen_report(report: dict[str, Any]) -> dict[str, Any]:
    truths = imagegen_ground_truths()
    fields = [
        "bed_state",
        "staff_present",
        "iv_state",
        "fall_suspected",
        "fall_confirmed",
        "spo2_abnormal",
    ]
    correct = Counter()
    total = Counter()
    matrices: dict[str, dict[str, dict[str, int]]] = {
        field: defaultdict(Counter) for field in fields
    }
    mismatches = []
    latencies = []
    failures = []

    for idx, item in enumerate(report.get("results", [])):
        filename = item.get("filename", "")
        if item.get("latency_seconds") is not None:
            latencies.append(float(item["latency_seconds"]))
        if not item.get("ok"):
            failures.append(
                {
                    "frame_index": idx,
                    "filename": filename,
                    "error_type": item.get("error_type"),
                    "error": item.get("error"),
                }
            )
            continue
        expected = truths.get(filename)
        if expected is None:
            continue
        observed = FrameAnalysis.model_validate(item["analysis"])
        comparisons = field_comparisons(expected, observed)
        for field, pair in comparisons.items():
            expected_value, actual_value = pair
            total[field] += 1
            matrices[field][str(expected_value)][str(actual_value)] += 1
            if expected_value == actual_value:
                correct[field] += 1
            else:
                mismatches.append(
                    {
                        "frame_index": idx,
                        "filename": filename,
                        "field": field,
                        "expected": expected_value,
                        "actual": actual_value,
                        "latency_seconds": item.get("latency_seconds"),
                    }
                )

    total_checks = sum(total.values())
    correct_checks = sum(correct.values())
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "frame_count": len(report.get("results", [])),
        "evaluated_frame_count": len(
            [r for r in report.get("results", []) if r.get("ok") and r.get("filename") in truths]
        ),
        "failure_count": len(failures),
        "failures": failures,
        "field_accuracy": {
            field: round(correct[field] / total[field], 4) if total[field] else None
            for field in fields
        },
        "overall_accuracy": round(correct_checks / total_checks, 4) if total_checks else None,
        "error_rate": round(1 - (correct_checks / total_checks), 4) if total_checks else None,
        "mismatch_count": len(mismatches),
        "mismatches": mismatches,
        "confusion_matrices": normalize_matrices(matrices),
        "latency_seconds": latency_summary(latencies),
    }


def field_comparisons(expected: FrameAnalysis, observed: FrameAnalysis) -> dict[str, tuple[Any, Any]]:
    return {
        "bed_state": (expected.bed_state.value, observed.bed_state.value),
        "staff_present": (expected.staff_present, observed.staff_present),
        "iv_state": (expected.iv.state.value, observed.iv.state.value),
        "fall_suspected": (expected.fall.suspected, observed.fall.suspected),
        "fall_confirmed": (expected.fall.confirmed, observed.fall.confirmed),
        "spo2_abnormal": (vital_flag(expected, "spo2"), vital_flag(observed, "spo2")),
    }


def normalize_matrices(matrices: dict[str, dict[str, Counter]]) -> dict[str, dict[str, dict[str, int]]]:
    return {
        field: {expected: dict(actual_counts) for expected, actual_counts in expected_counts.items()}
        for field, expected_counts in matrices.items()
    }


def latency_summary(latencies: list[float]) -> dict[str, float | int | None]:
    if not latencies:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "mean": None,
            "median": None,
            "p95": None,
        }
    ordered = sorted(latencies)
    p95_index = min(len(ordered) - 1, round((len(ordered) - 1) * 0.95))
    return {
        "count": len(ordered),
        "min": round(min(ordered), 4),
        "max": round(max(ordered), 4),
        "mean": round(statistics.fmean(ordered), 4),
        "median": round(statistics.median(ordered), 4),
        "p95": round(ordered[p95_index], 4),
    }


def load_and_evaluate_report(path: Path) -> dict[str, Any]:
    report = json.loads(path.read_text(encoding="utf-8"))
    report["metrics"] = evaluate_imagegen_report(report)
    return report


def write_report(report: dict[str, Any], out: Path | None = None) -> Path:
    out_dir = out.parent if out else Path("data/generated")
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out or out_dir / f"vlm_image_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return path
