# AINA Healther Vision Final

Open-source product plan and prototype workspace for an ambient AI patient-monitoring co-pilot.

This repo turns the earlier Healther Vision prototype and the AIDA/AINA planning docs into a deployable product track: camera-based remote monitoring, clinician-reviewed event detection, vitals/OCR ingestion, alert routing, command-center workflows, and a patient timeline that can integrate with an ambient/EHR assistant.

## Product Intent

AINA Healther Vision is a clinician-in-the-loop monitoring system for hospitals. It watches bedside camera feeds, detects operational and safety events, creates reviewable evidence, and routes alerts to bedside staff and remote clinicians.

The first deployable product should not make autonomous diagnoses or autonomous treatment decisions. It should provide:

- Remote multi-bed monitoring.
- Bed-state detection: in bed, sitting edge, out of bed, on floor.
- Fall and prolonged immobility detection.
- Staff-visit and care-gap tracking.
- Bedside monitor OCR for HR, BP, SpO2, and RR.
- Event timeline, evidence clips, and clinician sign-off.
- Ask AINA assistant grounded in patient record, events, vitals, and hospital protocols.
- Bedside call workflow.
- Morning digest for rounds.

## Repository Layout

```text
.
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── BUILD_PLAN.md
│   ├── DEPLOYMENT.md
│   ├── EVALUATION_AND_SAFETY.md
│   ├── OPEN_SOURCE.md
│   ├── SOURCES.md
│   ├── adr/
│   └── archive/
├── prototypes/
│   └── healther-vision/
├── apps/
├── packages/
├── infra/
└── scripts/
```

The working Python prototype from `Healther-Vision` has been preserved in `prototypes/healther-vision/`. Build the production monorepo from the docs in this repo, while keeping the prototype as an executable reference for synthetic feeds, event contracts, and state-machine behavior.

## Start With These Docs

0. [One Bed Remote Monitoring Plan](docs/ONE_BED_REMOTE_MONITORING_PLAN.html)
1. [Product Requirements](docs/PRD.md)
2. [Architecture](docs/ARCHITECTURE.md)
3. [Build Plan](docs/BUILD_PLAN.md)
4. [Evaluation and Safety](docs/EVALUATION_AND_SAFETY.md)
5. [Deployment](docs/DEPLOYMENT.md)
6. [One-Bed Agent Harness and Medplum Model](docs/ONE_BED_AGENT_HARNESS_AND_MEDPLUM_MODEL.md)

The one-bed HTML plan is the active build target. The broader PRD and architecture docs are still useful, but the immediate product is a single private-room remote monitoring console with live video, event detection, evidence review, VLM interpretation, and a grounded assistant.

Prototype console:

```bash
cd prototypes/healther-vision
source .venv/bin/activate
python -m uvicorn --app-dir src healther_vision.app:app --reload --port 8790
```

Then open `http://localhost:8790/monitor`.

## Current Status

This repo is at product-foundation stage.

- Source docs are archived.
- A consolidated PRD and build plan are written.
- The prototype is copied in place.
- Production app folders are intentionally empty until Phase 1 implementation starts.

## Important Security Note

Screenshots used during planning showed live infrastructure configuration screens. Do not commit real API keys, JWT secrets, Supabase keys, patient data, or hospital footage. Rotate any secret that was ever visible in a screenshot, screen recording, chat, or shared document.

## License

Apache-2.0 is the intended license for code unless a later legal review chooses otherwise. Clinical validation datasets, hospital footage, model weights, and deployment configs may require separate licenses and must not be treated as open by default.
