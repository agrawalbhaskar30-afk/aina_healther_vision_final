# Implementation Log

## 2026-05-18

### User Correction

- Active target is a private-room, one-bed remote monitoring console.
- This is not a broad multi-bed ward dashboard or generic patient list workflow.

### Product Decisions

- Live video feed is first-class and must remain central to the experience.
- The UI direction should feel AINA/Cloudphysician-like: video occupies the full working surface with clinical overlays, an event timeline, and a right-side assistant panel.
- The data model should be ready to align with Medplum/FHIR later, but FHIR readiness must not block the video-first monitoring workflow.
- Build work must continue recording implementation decisions and changes in this log.

### Implementation Notes

- Documentation-only update.
- No application, package, infrastructure, or prototype files were changed.

### Follow-Up Implementation

- Added a working AINA-style one-bed monitor route to the prototype at `/monitor`.
- Added `/v0/monitor/stream.mjpg`, an MJPEG video streaming endpoint.
- The stream defaults to a synthetic private-room feed so the console works immediately.
- The same endpoint accepts `source=0`, a local video file path, or an RTSP URL for real camera testing.
- Added `/v0/monitor/state` for room/camera/vitals/agent/evidence status.
- Added a full-video console layout with translucent overlays, patient pill, status badge, left vitals rail, right Ask AINA panel, bottom event timeline, review CTA, trend overlay, imaging drawer, and agent harness status cards.
- Added `docs/ONE_BED_AGENT_HARNESS_AND_MEDPLUM_MODEL.md` to define the agent harness and Medplum/FHIR-ready data shape without blocking video work.
- Verified the prototype tests still pass: `9 passed`.
- Verified `http://127.0.0.1:8790/monitor` returns the console and the MJPEG endpoint emits JPEG multipart frames.

### Camera Hardware Note

- The Cloudphysician demo screenshots look like a branded indoor PTZ/speed-dome IP camera mounted high in the room, likely rebranded OEM hardware similar to Hikvision/Dahua-style PTZ devices.
- Exact Cloudphysician camera SKU was not identified from public material or screenshots.
