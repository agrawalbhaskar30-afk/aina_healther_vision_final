# Healther Vision

Standalone API-first vision layer for bedside patient monitoring experiments.

This repo is deliberately separate from the ambient/EHR assistant. It is a sandbox for proving the camera/feed logic before integrating with EHR, Medplum, mobile apps, or edge hardware.

## What This Builds First

- Synthetic CCTV and tablet camera frames for hospital-bed scenarios.
- A feed generator that produces repeatable frame sequences plus ground-truth metadata.
- API routes for processing frames, reading bed state, generating synthetic scenarios, and extracting frames from video.
- A deterministic baseline analyzer so testing works before real hospital footage or paid model calls.
- A route shape that can later swap in Gemini, Roboflow, YOLO, or edge models.

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m uvicorn --app-dir src healther_vision.app:app --reload --port 8790
```

Open:

```text
http://localhost:8790/docs
http://localhost:8790/monitor
```

## Generate Synthetic Frames

```bash
python -m healther_vision.cli generate \
  --scenario fall \
  --out data/generated/fall-demo \
  --frames 24
```

This writes:

- `frame_0000.png`, `frame_0001.png`, ...
- `manifest.json` with per-frame ground truth.

## Test The API Without Any AI Keys

Generate one scenario through the API:

```bash
curl -s -X POST http://localhost:8790/v0/synthetic/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"fall","frames":8,"camera_role":"cctv"}'
```

Generate and replay a full scenario through the state machine:

```bash
curl -s -X POST http://localhost:8790/v0/synthetic/replay \
  -H "Content-Type: application/json" \
  -d '{"scenario":"fall","frames":12,"camera_role":"cctv","bed_id":"B4","patient_id":"pat-demo"}'
```

Process an uploaded frame using the synthetic manifest truth:

```bash
curl -s -X POST http://localhost:8790/v0/frame \
  -F "frame=@data/generated/fall-demo/frame_0005.png" \
  -F "bed_id=B4" \
  -F "patient_id=pat-demo" \
  -F "camera_id=cam-cctv-1" \
  -F "analysis={\"bed_state\":\"on_floor\",\"staff_present\":false,\"fall\":{\"suspected\":true,\"confirmed\":false,\"confidence\":0.86}}"
```

Read current state:

```bash
curl -s http://localhost:8790/v0/bed/B4/state
```

## Why Synthetic First

Real hospital CCTV is hard to get, legally sensitive, and slow. Synthetic first lets us validate:

- route shape
- state-machine behavior
- alert timing
- OCR acceptance rules
- digest inputs
- evidence storage
- data contracts

Then we can replace synthetic analysis with real model adapters and real staged footage.

## V0 Scope

In:

- patient in-bed / sitting-edge / out-of-bed / on-floor
- fall suspected / confirmed
- staff presence and last visit
- monitor vital readings from synthetic truth or future OCR
- coarse IV state
- generated test feeds

Out:

- EHR write-back
- medication reconciliation
- individual staff identity
- production dashboard
- edge deployment
