# Building Healther Vision With Synthetic Feeds

## The Core Loop

V0 should be built as a repeatable test loop:

1. Generate synthetic frames for one clinical scenario.
2. Store the frame plus ground-truth analysis in a manifest.
3. Send those frames to `/v0/frame`.
4. Check emitted events and bed state.
5. Replace ground-truth analysis with hosted model analysis once the route/state machine is stable.
6. Later replace synthetic frames with staged or real CCTV/tablet frames.

This is deliberately better than starting with random real footage, because the expected answer is known for every frame.

For the fastest loop, use `/v0/synthetic/replay`. It generates a scenario and immediately runs every generated frame through the state machine, returning the final bed state and event timeline.

## Camera Roles

### CCTV Feed

Use for continuous monitoring:

- patient in bed
- sitting on bed edge
- out of bed
- on floor/fall
- staff visit
- monitor OCR when visible
- IV state if visible

### Tablet/Round Camera Feed

Use during rounds:

- patient appearance
- wound/site photos
- monitor close-up
- IV bag/pump close-up
- doctor/nurse pointing context

## Synthetic Scenarios

Current scenarios:

- `normal`
- `fall`
- `out_of_bed`
- `staff_visit`
- `vitals_alert`
- `iv_near_empty`
- `tablet_round`

Each scenario produces PNG frames and a `manifest.json` containing the expected analysis for each frame.

## What I Need From You Later

Not needed immediately:

- real hospital footage
- tablet hardware
- EHR integration
- Roboflow training data

Needed when you want to move beyond synthetic:

- target camera angle: ceiling corner CCTV, wall CCTV, or tablet front cam
- target bed layout: single bed, multi-bed ward, ICU bay
- priority scenario order: fall first, vitals first, IV first, or staff compliance first
- one staged room video, even phone-shot, to calibrate synthetic geometry
- whether we should optimize for India ward, ICU, or both

## Why The API Requires `analysis` Right Now

The first build is synthetic-first. It does not pretend to have reliable clinical vision before the workflow exists.

The `/v0/frame` endpoint currently expects an `analysis` JSON payload. This can come from:

- the synthetic manifest
- a manual annotation UI
- Gemini/Roboflow later
- an edge model later

That keeps the route contract stable while model providers change.

## Next Implementation Steps

1. Add a small script that replays a manifest into `/v0/frame`.
2. Add Gemini frame analyzer adapter.
3. Add Roboflow/YOLO analyzer adapter.
4. Add a simple web viewer for generated frames + emitted events.
5. Add a scenario builder for multi-bed wards.
6. Add noisy/blurred/night-vision synthetic variants.
7. Add staged footage ingestion.
