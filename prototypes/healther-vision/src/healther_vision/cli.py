from __future__ import annotations

import argparse
import json
from pathlib import Path

from .imagegen_eval import DEFAULT_IMAGEGEN_DIR
from .models import CameraRole, SyntheticScenario
from .synthetic import generate_scenario


def main() -> None:
    parser = argparse.ArgumentParser(prog="healther-vision")
    sub = parser.add_subparsers(dest="cmd", required=True)
    gen = sub.add_parser("generate", help="Generate synthetic bedside frames")
    gen.add_argument("--scenario", choices=[s.value for s in SyntheticScenario], default="normal")
    gen.add_argument("--camera-role", choices=[r.value for r in CameraRole], default="cctv")
    gen.add_argument("--frames", type=int, default=24)
    gen.add_argument("--out", type=Path, required=True)
    bench = sub.add_parser("benchmark-imagegen", help="Run VLM against imagegen frames and score it")
    bench.add_argument("--images", type=Path, default=DEFAULT_IMAGEGEN_DIR)
    bench.add_argument("--provider", choices=["openai", "gemini"], default=None)
    bench.add_argument("--model", default=None)
    bench.add_argument("--out", type=Path, default=None)
    bench.add_argument("--quiet", action="store_true")
    score = sub.add_parser("score-imagegen", help="Score an existing imagegen VLM report")
    score.add_argument("--report", type=Path, required=True)
    score.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    if args.cmd == "generate":
        manifest = generate_scenario(
            SyntheticScenario(args.scenario),
            args.out,
            frames=args.frames,
            camera_role=CameraRole(args.camera_role),
        )
        print(manifest.model_dump_json(indent=2))
    elif args.cmd == "benchmark-imagegen":
        from .imagegen_eval import benchmark_imagegen_frames, write_report

        report = benchmark_imagegen_frames(
            args.images,
            provider=args.provider,
            model=args.model,
            verbose=not args.quiet,
        )
        path = write_report(report, args.out)
        print(json.dumps(summary_for_stdout(path, report), indent=2))
    elif args.cmd == "score-imagegen":
        from .imagegen_eval import load_and_evaluate_report, write_report

        report = load_and_evaluate_report(args.report)
        path = write_report(report, args.out)
        print(json.dumps(summary_for_stdout(path, report), indent=2))


def summary_for_stdout(path: Path, report: dict) -> dict:
    metrics = report.get("metrics", {})
    return {
        "ok": metrics.get("failure_count", 0) == 0,
        "report": str(path),
        "provider": report.get("provider"),
        "image_count": report.get("image_count"),
        "overall_accuracy": metrics.get("overall_accuracy"),
        "error_rate": metrics.get("error_rate"),
        "field_accuracy": metrics.get("field_accuracy"),
        "mismatch_count": metrics.get("mismatch_count"),
        "latency_seconds": metrics.get("latency_seconds"),
    }


if __name__ == "__main__":
    main()
