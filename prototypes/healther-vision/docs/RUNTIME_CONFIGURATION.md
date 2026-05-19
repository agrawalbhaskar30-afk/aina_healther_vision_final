# Runtime Configuration

This file is the checklist for running the one-bed remote-monitoring prototype with a real
test feed. The intended operator flow is:

1. Fill `prototypes/healther-vision/.env`.
2. Open `/bed/bed-01/monitor` and choose `Switch to file`, `Switch to RTSP stream`, or
   `Bedside Cam 1`.

The backend persists setup, selected source, events, vitals, review actions, transcripts,
detector status, and Medplum sync attempts in `data/runtime_state.json`.

## Source Inputs

- `Bedside Cam 1`: uses the browser/tablet camera through `getUserMedia`. Browser camera
  permission is managed by the browser; the selected source is persisted by the backend.
- `Switch to file`: uploads a local video to `data/uploads`, sets that upload as the active
  feed, starts the post-detection loop, and replays the video through the monitor stream.
- `Switch to RTSP stream`: saves an RTSP/HTTP camera URL, streams it through OpenCV
  `VideoCapture`, and starts the detector loop. If OpenCV cannot open the URL, detector status
  moves to `error` and records `last_error`.
- `Switch to synthetic feed`: uses the built-in ICU synthetic feed and starts the same detector
  loop as file/RTSP.

## Post-Detection Pipeline

Every frame goes through:

- local CV fallback for bed state, staff presence, coarse fall cues, IV color cues, and monitor
  signal heuristics
- optional cloud VLM confirmation when `HEALTHER_VISION_USE_CLOUD_VLM=1` and a provider key is set
- rule/state-machine evaluation for alerts, vitals, evidence, escalation, and review-required flags
- event/evidence persistence
- optional Medplum FHIR sync

Cloud VLM is not a replacement for the rule engine. It confirms uncertain or real-world frames and
improves monitor OCR/IV/oxygen interpretation when local CV is not enough.

## Required Keys

At least one VLM provider key is needed for real-world monitor OCR and free-form visual reasoning:

```dotenv
HEALTHER_VISION_USE_CLOUD_VLM=1
HEALTHER_VISION_VLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-5-mini
OPENAI_ASSISTANT_MODEL=gpt-5-mini
OPENAI_AUDIO_TRANSCRIBE_MODEL=whisper-1
```

Gemini can be used instead:

```dotenv
HEALTHER_VISION_VLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_VISION_MODEL=gemini-2.5-flash-lite
```

Medplum sync needs either an access token or client credentials:

```dotenv
MEDPLUM_SYNC_ENABLED=1
MEDPLUM_BASE_URL=https://api.medplum.com
MEDPLUM_CLIENT_ID=
MEDPLUM_CLIENT_SECRET=
MEDPLUM_ACCESS_TOKEN=
MEDPLUM_ON_BEHALF_OF=
```

## Runtime Endpoints

- `GET /v0/monitor/state?bed_id=bed-01`: current room, vitals, active alerts, detector status.
- `POST /v0/monitor/test-video`: upload a local video file and make it the active feed.
- `POST /v0/bed/{bed_id}/camera/select`: select tablet camera, synthetic, RTSP, or uploaded source.
- `POST /v0/bed/{bed_id}/detector/start`: start the detector for the active source.
- `GET /v0/bed/{bed_id}/detector/status`: local CV/cloud VLM/Medplum capability status.
- `GET /v0/integrations/medplum/status`: Medplum config and sync history.
- `POST /v0/assistant/chat`: Ask Aida grounded in room state, events, vitals, transcripts, and references.
- `POST /v0/audio/transcribe`: upload a microphone clip; uses OpenAI transcription when configured.

## Current Limits

The app can ingest browser camera, synthetic, file, and RTSP feeds. Local CV works without keys for
the provided synthetic/test imagery and simple color/zone cues. Real hospital monitor OCR, oxygen
flow interpretation, and ambiguous distress detection require a cloud VLM key until a dedicated
on-device OCR/CV model is added.
