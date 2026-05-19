from __future__ import annotations

import json
import os
import shutil
import time
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import load_local_env
from .dashboard import dashboard_html, list_runs, list_vlm_reports
from .evaluation import event_metrics, expected_events_for_manifest
from .models import CameraRole, Evidence, FrameAnalysis, SyntheticScenario
from .state import MemoryStore, VisionStateMachine
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

SETUP_CONFIG: dict[str, Any] = {
    "source_type": "synthetic",
    "source_url": "synthetic",
    "camera_label": "Bedside Cam 1",
    "bed_zone_polygon": [[282, 400], [998, 400], [1018, 600], [262, 600]],
    "monitor_crop": {"enabled": True, "box": [1085, 270, 1225, 390]},
    "iv_oxygen_crop": {"enabled": False, "box": None},
}

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
    return mockup_page("monitor/Aida - One-Bed Live Monitor.html", "monitor")


@app.get("/setup", response_class=HTMLResponse)
@app.get("/video-setup", response_class=HTMLResponse)
def setup_page() -> str:
    return mockup_page("setup/index.html", "setup")


@app.get("/review", response_class=HTMLResponse)
def review_page() -> str:
    return mockup_page("review/Event Review.html", "review")


@app.get("/state-reference", response_class=HTMLResponse)
def state_reference_page() -> str:
    return mockup_page("state-reference/Aida - State Reference.html", "state-reference")


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
def vitals_trend() -> dict:
    return {
        "ok": True,
        "window": "4h",
        "vitals": {
            "hr": [70, 70, 71, 72, 71, 72, 72, 73, 72],
            "bp": ["120/78", "119/76", "118/76", "118/76"],
            "spo2": [99, 99, 98, 97, 96, 95, 94],
            "rr": [17, 18, 18, 18, 18, 18],
        },
        "latest": {"hr": 72, "bp": "118/76", "spo2": 94, "rr": 18},
        "source": "monitor_ocr",
    }


@app.post("/v0/assistant/chat")
def assistant_chat(req: AssistantRequest) -> dict:
    answer = assistant_answer(req.message)
    return {
        "ok": True,
        "message": req.message,
        "answer": answer,
        "citations": [
            {"label": "Vitals OCR 06:42-07:14", "event_id": "evt-spo2-0714"},
            {"label": "Event timeline", "event_id": req.event_id or "evt-spo2-0714"},
        ],
        "tools_used": ["get_current_room_state", "get_event_timeline", "get_vitals_trend"],
    }


@app.get("/v0/setup/config")
def get_setup_config() -> dict:
    return {"ok": True, "config": SETUP_CONFIG}


@app.post("/v0/setup/config")
def save_setup_config(req: SetupConfigRequest) -> dict:
    SETUP_CONFIG.update(req.model_dump(exclude_none=True))
    return {"ok": True, "config": SETUP_CONFIG}


@app.post("/v0/setup/test")
def test_setup(payload: dict[str, Any] | None = None) -> dict:
    source = (payload or {}).get("source_url") or SETUP_CONFIG.get("source_url") or "synthetic"
    return {
        "ok": True,
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


def mockup_page(relative_path: str, page: str) -> str:
    path = MOCKUPS_DIR / relative_path
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"mockup not found: {relative_path}")
    html = path.read_text(encoding="utf-8")
    bridge = f"""
<script>
  window.AIDA_PAGE = {json.dumps(page)};
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


def assistant_answer(message: str) -> str:
    text = message.lower()
    if "staff" in text or "nurse" in text or "visit" in text:
        return (
            "No staff presence has been recorded after 05:12 AM in the current demo timeline. "
            "This answer is grounded in the staff log and room-state feed."
        )
    if "spo" in text or "oxygen" in text or "distress" in text:
        return (
            "SpO2 declined from 99% to 94% before the warning event. The current system treats this "
            "as a review-required trend, not an autonomous diagnosis."
        )
    if "review" in text or "alert" in text:
        return (
            "The highest priority review item is evt-spo2-0714: SpO2 trending down, critical severity, "
            "with monitor OCR and timeline evidence attached."
        )
    if "evidence" in text:
        return (
            "Evidence is available as a still frame and event-scoped stream/clip reference for each event. "
            "Open the review page to label the event and attach notes."
        )
    return (
        "Current room state: patient is in bed, vitals are HR 72, BP 118/76, SpO2 94, RR 18, "
        "and there is one critical vitals trend awaiting review."
    )


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
