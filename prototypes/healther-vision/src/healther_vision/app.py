from __future__ import annotations

import json
import os
import shutil
import time
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import load_local_env
from .dashboard import dashboard_html, list_runs, list_vlm_reports
from .evaluation import event_metrics, expected_events_for_manifest
from .models import CameraRole, Evidence, FrameAnalysis, SyntheticScenario
from .monitor_console import monitor_console_html
from .state import MemoryStore, VisionStateMachine
from .synthetic import analysis_for, render_frame

load_local_env()

DATA_DIR = Path("data")
GENERATED_DIR = DATA_DIR / "generated"
UPLOAD_DIR = DATA_DIR / "uploads"

app = FastAPI(title="Healther Vision", version="0.1.0")
store = MemoryStore()
machine = VisionStateMachine()
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")


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
    return monitor_console_html()


@app.get("/v0/monitor/state")
def monitor_state() -> dict:
    state = store.state("bed-01", "patient-private-room-01")
    events = store.events["bed-01"]
    return {
        "ok": True,
        "room": {"id": "private-room-01", "bed_id": "bed-01", "mode": "one-bed"},
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
