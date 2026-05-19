from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from healther_vision.imagegen_eval import evaluate_imagegen_report, imagegen_ground_truths, latency_summary
from healther_vision.app import app
from healther_vision.models import BedState, CameraRole, EventType, FrameAnalysis, IVState, SyntheticScenario
from healther_vision.state import VisionStateMachine, fresh_state
from healther_vision.synthetic import analysis_for, generate_scenario


def test_synthetic_generator_writes_frames_and_manifest(tmp_path):
    manifest = generate_scenario(SyntheticScenario.FALL, tmp_path, frames=6)
    assert len(manifest.frames) == 6
    assert (tmp_path / "frame_0000.png").exists()
    assert (tmp_path / "manifest.json").exists()
    loaded = json.loads((tmp_path / "manifest.json").read_text())
    assert loaded["scenario"] == "fall"


def test_fall_confirms_after_persisting_on_floor():
    machine = VisionStateMachine()
    state = fresh_state("B4", "pat-demo")
    t0 = datetime.now(timezone.utc)
    analysis = FrameAnalysis(
        bed_state=BedState.ON_FLOOR,
        bed_state_confidence=0.9,
        fall={"suspected": True, "confidence": 0.86},
    )
    state, events = machine.process(
        state,
        analysis,
        at=t0,
        bed_id="B4",
        patient_id="pat-demo",
        camera_id="cam-1",
    )
    assert EventType.FALL_SUSPECTED in {e.event_type for e in events}
    state, events = machine.process(
        state,
        analysis,
        at=t0 + timedelta(seconds=5),
        bed_id="B4",
        patient_id="pat-demo",
        camera_id="cam-1",
    )
    assert EventType.FALL_CONFIRMED in {e.event_type for e in events}


def test_vitals_alert_after_repeated_abnormal_readings():
    machine = VisionStateMachine()
    state = fresh_state("B4", "pat-demo")
    t0 = datetime.now(timezone.utc)
    events = []
    for i in range(3):
        state, events = machine.process(
            state,
            analysis_for(SyntheticScenario.VITALS_ALERT, i, 3, camera_role=CameraRole.CCTV),
            at=t0 + timedelta(seconds=i),
            bed_id="B4",
            patient_id="pat-demo",
            camera_id="cam-1",
        )
    assert EventType.VITALS_OUT_OF_RANGE in {e.event_type for e in events}


def test_iv_near_empty_event():
    machine = VisionStateMachine()
    state = fresh_state("B4", "pat-demo")
    t0 = datetime.now(timezone.utc)
    analysis = FrameAnalysis(iv={"state": IVState.NEAR_EMPTY, "confidence": 0.84, "bag_fill_percent": 8})
    state, events = machine.process(
        state,
        analysis,
        at=t0,
        bed_id="B4",
        patient_id="pat-demo",
        camera_id="cam-1",
    )
    assert EventType.IV_NEAR_EMPTY in {e.event_type for e in events}


def test_api_generates_scenario_and_processes_frame():
    client = TestClient(app)
    generated = client.post(
        "/v0/synthetic/scenario",
        json={"scenario": "fall", "frames": 3, "camera_role": "cctv", "name": "pytest-fall"},
    )
    assert generated.status_code == 200
    analysis = generated.json()["manifest"]["frames"][2]["analysis"]
    response = client.post(
        "/v0/frame",
        data={
            "bed_id": "B4",
            "patient_id": "pat-demo",
            "camera_id": "cam-1",
            "analysis": json.dumps(analysis),
        },
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_api_replays_synthetic_scenario():
    client = TestClient(app)
    response = client.post(
        "/v0/synthetic/replay",
        json={
            "scenario": "fall",
            "frames": 12,
            "camera_role": "cctv",
            "name": "pytest-replay-fall",
            "bed_id": "B99",
            "patient_id": "pat-replay",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    emitted = {event["event_type"] for event in body["events"]}
    assert "FALL_SUSPECTED" in emitted
    assert "FALL_CONFIRMED" in emitted


def test_vlm_status_uses_env_without_exposing_keys():
    client = TestClient(app)
    response = client.get("/v0/vlm/status")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["provider"] in {"truth", "openai", "gemini"}
    assert "configured" in body["openai"]
    assert "model" in body["openai"]
    assert "api_key" not in json.dumps(body).lower()


def test_imagegen_evaluator_reports_confusion_and_latency():
    truths = imagegen_ground_truths()
    expected = truths["cctv_04_staff_iv_near_empty.png"]
    actual = expected.model_copy(deep=True)
    actual.iv.state = IVState.RUNNING
    report = {
        "results": [
            {
                "filename": "cctv_04_staff_iv_near_empty.png",
                "ok": True,
                "latency_seconds": 1.25,
                "analysis": actual.model_dump(mode="json"),
            }
        ]
    }
    metrics = evaluate_imagegen_report(report)
    assert metrics["field_accuracy"]["iv_state"] == 0
    assert metrics["confusion_matrices"]["iv_state"]["near_empty"]["running"] == 1
    assert metrics["latency_seconds"]["median"] == 1.25
    assert metrics["mismatches"][0]["field"] == "iv_state"


def test_latency_summary_handles_empty_and_populated_values():
    assert latency_summary([])["count"] == 0
    summary = latency_summary([1.0, 2.0, 3.0])
    assert summary["mean"] == 2.0
    assert summary["median"] == 2.0


def test_state_reference_exposes_runtime_cases_and_rules():
    client = TestClient(app)
    response = client.get("/v0/state-reference")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "in_bed" in body["states"]["bed"]
    assert "bed_empty" in body["states"]["bed"]
    assert "spo2" in body["rules"]["vitals"]
    assert body["routes"]["bed_setup"] == "/bed/{bed_id}/setup"


def test_per_bed_setup_config_is_isolated():
    client = TestClient(app)
    a = client.post(
        "/v0/bed/pytest-bed-a/setup/config",
        json={"source_type": "rtsp", "source_url": "rtsp://camera-a", "camera_label": "A"},
    )
    b = client.post(
        "/v0/bed/pytest-bed-b/setup/config",
        json={"source_type": "synthetic", "source_url": "synthetic", "camera_label": "B"},
    )
    assert a.status_code == 200
    assert b.status_code == 200
    assert client.get("/v0/bed/pytest-bed-a/setup/config").json()["config"]["source_url"] == "rtsp://camera-a"
    assert client.get("/v0/bed/pytest-bed-b/setup/config").json()["config"]["source_url"] == "synthetic"


def test_transcripts_persist_and_feed_summary():
    client = TestClient(app)
    bed_id = "pytest-bed-transcript"
    created = client.post(
        "/v0/transcripts",
        json={"bed_id": bed_id, "speaker": "room_mic", "text": "Patient asks for oxygen mask check."},
    )
    assert created.status_code == 200
    transcripts = client.get(f"/v0/bed/{bed_id}/transcripts").json()["transcripts"]
    assert transcripts[-1]["text"] == "Patient asks for oxygen mask check."
    summary = client.get(f"/v0/bed/{bed_id}/summary").json()["summary"]
    assert "oxygen mask check" in summary


def test_vitals_history_grows_after_frame_ingest():
    client = TestClient(app)
    bed_id = "pytest-bed-vitals"
    analysis = FrameAnalysis(
        bed_state=BedState.IN_BED,
        vitals={"spo2": {"value": 94, "unit": "%", "confidence": 0.96}},
    )
    response = client.post(
        "/v0/frame",
        data={
            "bed_id": bed_id,
            "patient_id": "pat-vitals",
            "camera_id": "cam-1",
            "analysis": analysis.model_dump_json(),
        },
    )
    assert response.status_code == 200
    history = client.get(f"/v0/bed/{bed_id}/vitals/history?metric=spo2").json()
    assert history["rows"][-1]["value"] == 94


def test_assistant_falls_back_without_model_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)
    response = client.post(
        "/v0/assistant/chat",
        json={"bed_id": "pytest-bed-assistant", "message": "What needs review now?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["model_used"] is False
    assert "api_key" not in json.dumps(body).lower()


def test_camera_source_selection_and_stream_url():
    client = TestClient(app)
    bed_id = "pytest-bed-camera"
    options = client.get(f"/v0/bed/{bed_id}/cameras")
    assert options.status_code == 200
    assert options.json()["source_options"][2]["id"] == "file"

    selected = client.post(f"/v0/bed/{bed_id}/camera/select", json={"camera_id": "wall-wide"})
    assert selected.status_code == 200
    body = selected.json()
    assert body["active"]["camera_label"] == "Wall Cam (Wide)"
    assert f"bed_id={bed_id}" in body["stream_url"]

    bedside = client.post(f"/v0/bed/{bed_id}/camera/select", json={"camera_id": "bedside-1"})
    assert bedside.status_code == 200
    assert bedside.json()["active"]["source_type"] == "tablet_camera"


def test_preferences_validate_density():
    client = TestClient(app)
    response = client.patch("/v0/users/me/preferences", json={"density": "compact"})
    assert response.status_code == 200
    assert response.json()["preferences"]["density"] == "compact"

    theme = client.patch("/v0/users/me/preferences", json={"theme": "dark"})
    assert theme.status_code == 200
    assert theme.json()["preferences"]["theme"] == "dark"

    bad = client.patch("/v0/users/me/preferences", json={"density": "crowded"})
    assert bad.status_code == 400


def test_test_video_upload_becomes_active_file_source():
    client = TestClient(app)
    bed_id = "pytest-bed-file"
    response = client.post(
        "/v0/monitor/test-video",
        data={"bed_id": bed_id},
        files={"video": ("clip.mp4", b"not a real video but acceptable for registry test", "video/mp4")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "file"
    assert body["source_url"].startswith("upload:")
    assert client.get(f"/v0/bed/{bed_id}/setup/config").json()["config"]["source_type"] == "file"


def test_escalation_updates_event_and_monitor_state():
    client = TestClient(app)
    response = client.post(
        "/v0/events/evt-spo2-0714/escalate",
        json={
            "route": "bedside_nurse",
            "priority": "urgent",
            "reason": "pytest escalation",
            "due_minutes": 5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["event"]["status"] == "escalated"
    assert body["escalation"]["route"] == "bedside_nurse"
    state = client.get("/v0/monitor/state?bed_id=bed-01").json()
    assert state["critical_count"] >= 1
    assert state["escalation"]["status"] == "open"


def test_clear_active_alerts_marks_events_cleared():
    client = TestClient(app)
    response = client.post("/v0/bed/bed-01/alerts/clear", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["cleared_count"] >= 1
    assert body["active_alerts"] == []


def test_audio_clip_upload_creates_transcript():
    client = TestClient(app)
    bed_id = "pytest-bed-audio"
    response = client.post(
        "/v0/audio/transcribe",
        data={"bed_id": bed_id, "speaker": "room_mic"},
        files={"audio": ("room-audio.webm", b"fake audio", "audio/webm")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["transcript"]["bed_id"] == bed_id
    assert client.get(f"/v0/bed/{bed_id}/transcripts").json()["transcripts"][-1]["speaker"] == "room_mic"


def test_medplum_status_exposes_planned_fhir_shape():
    client = TestClient(app)
    response = client.get("/v0/integrations/medplum/status")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "Observation" in body["resources"]
    assert "api_key" not in json.dumps(body).lower()
