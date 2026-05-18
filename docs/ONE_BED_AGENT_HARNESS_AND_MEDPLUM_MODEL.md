# One-Bed Agent Harness and Medplum-Ready Data Model

## Purpose

This is the working data and agent model for the one-bed remote monitoring console. The immediate build does not need Medplum running, but the shape should be ready to map into Medplum/FHIR later.

## Product Shape

The remote monitoring console has five live knowledge layers:

1. **Video layer**: room camera stream, camera health, frame sampling, clip buffer.
2. **Detection layer**: bed state, staff presence, monitor OCR, IV/oxygen candidates, distress candidates.
3. **Evidence layer**: event stills, pre/post clips, crop images, rule traces, model outputs.
4. **Agent layer**: specialized agents maintain room state, event memory, VLM interpretation, review state, and assistant responses.
5. **Clinical data layer**: patient context and future Medplum/FHIR resources.

## Agent Harness

The assistant should not be a single prompt that sees everything. It should be a harness around structured tools.

### Agents

| Agent | Responsibility | Inputs | Outputs |
|---|---|---|---|
| Vision Agent | Maintains current room state from frames and detection outputs. | Camera frames, bed-zone config, model detections. | `RoomState`, candidate events. |
| Evidence Agent | Stores and indexes still frames, crops, and clips. | Event IDs, frame buffer, video buffer. | `EvidenceAsset` records and URLs. |
| VLM Agent | Interprets ambiguous or high-impact scenes. | Event evidence, current frame, crops, timeline context. | Structured scene interpretation. |
| Timeline Agent | Maintains the audit/event history. | Candidate events, reviewed events, vitals, alerts. | Ordered event timeline. |
| Review Agent | Tracks human acknowledgment and labels. | Event, evidence, reviewer action. | Review state and model-eval labels. |
| Assistant Agent | Answers user questions with citations. | Tools over state, events, vitals, evidence, patient context. | Grounded responses and draft notes. |
| Medplum Adapter | Maps reviewed data into FHIR resources later. | Patient, encounter, reviewed observations, notes. | FHIR-ready JSON resources. |

### Assistant Tools

| Tool | Returns |
|---|---|
| `get_current_room_state()` | Bed state, staff presence, active alerts, camera health, latest vitals. |
| `get_event_timeline(window)` | Ordered events with severity, review status, and evidence IDs. |
| `get_event_evidence(event_id)` | Still frame, clip, crops, rule trace, VLM output. |
| `get_vitals_trend(window)` | OCR-derived vitals with confidence and accepted/rejected state. |
| `get_patient_context()` | Patient summary, risk flags, encounter context. |
| `create_note_draft(event_id)` | A draft clinical/operational note requiring human sign-off. |
| `send_alert(event_id, recipient)` | Alert request, only after policy or user confirmation. |

## Core Data Model

This is the application-native shape. It should remain stable even if the backend later moves to Medplum.

### Room

```json
{
  "id": "room-private-01",
  "name": "Private Room 01",
  "wardId": "ward-demo",
  "bedId": "bed-01",
  "cameraIds": ["camera-main-01"],
  "bedZonePolygon": [[0.21, 0.36], [0.68, 0.34], [0.77, 0.72], [0.17, 0.76]]
}
```

### Camera

```json
{
  "id": "camera-main-01",
  "kind": "ptz_ip_camera",
  "sourceUrl": "rtsp://...",
  "status": "live",
  "fps": 4,
  "lastFrameAt": "2026-05-18T14:00:00Z",
  "capabilities": ["rtsp", "ptz_possible", "night_mode_possible"]
}
```

### RoomState

```json
{
  "roomId": "room-private-01",
  "patientId": "patient-demo-01",
  "bedState": "in_bed",
  "staffPresent": false,
  "lastMovementAt": "2026-05-18T13:52:00Z",
  "lastStaffSeenAt": "2026-05-18T12:58:00Z",
  "activeAlertIds": ["event-123"],
  "cameraStatus": "live",
  "updatedAt": "2026-05-18T14:00:00Z"
}
```

### Event

```json
{
  "id": "event-123",
  "type": "POSSIBLE_RESPIRATORY_DISTRESS",
  "severity": "warning",
  "status": "needs_review",
  "patientId": "patient-demo-01",
  "roomId": "room-private-01",
  "cameraId": "camera-main-01",
  "startedAt": "2026-05-18T13:59:20Z",
  "endedAt": null,
  "confidence": 0.74,
  "ruleTrace": "SpO2 below threshold on repeated OCR reads; visible high work of breathing candidate.",
  "evidenceAssetIds": ["asset-still-123", "asset-clip-123"],
  "vlmInterpretationId": "vlm-123",
  "reviewRequired": true
}
```

### EvidenceAsset

```json
{
  "id": "asset-clip-123",
  "eventId": "event-123",
  "kind": "video_clip",
  "url": "/evidence/event-123/clip.mp4",
  "capturedAt": "2026-05-18T13:59:20Z",
  "durationSeconds": 30,
  "redacted": false,
  "retentionUntil": "2026-08-18T00:00:00Z"
}
```

### VLMInterpretation

```json
{
  "id": "vlm-123",
  "eventId": "event-123",
  "model": "provider/model",
  "sceneSummary": "Patient is lying in bed with visible increased movement of upper chest; no staff present.",
  "findings": {
    "distressSuspected": true,
    "oxygenIssueSuspected": false,
    "ivIssueSuspected": false,
    "fallSuspected": false
  },
  "uncertainties": ["Camera angle partially occludes the face."],
  "needsHumanReview": true
}
```

### VitalReading

```json
{
  "id": "vital-123",
  "patientId": "patient-demo-01",
  "roomId": "room-private-01",
  "kind": "spo2",
  "value": 88,
  "unit": "%",
  "confidence": 0.92,
  "source": "monitor_ocr",
  "sourceEvidenceAssetId": "asset-monitor-crop-123",
  "accepted": true,
  "capturedAt": "2026-05-18T13:59:00Z"
}
```

## Medplum/FHIR Mapping Later

Medplum can be introduced after the video and event loop works. The current schema should map cleanly into FHIR R4 resources.

| App Object | Medplum/FHIR Resource Later | Notes |
|---|---|---|
| Patient | `Patient` | Demographics and identifiers. |
| Room/Bed | `Location` | Room and bed can be nested locations. |
| Camera | `Device` | Camera or monitoring device. |
| Encounter | `Encounter` | Current admission/episode. |
| VitalReading | `Observation` | HR, BP, SpO2, RR. |
| Event | `Observation` or `DetectedIssue` | Patient safety events; exact resource depends on final semantics. |
| EvidenceAsset | `Media` / `DocumentReference` | Still images, clips, review documents. |
| Review task | `Task` | Human review, acknowledgment, escalation. |
| Note draft | `Composition` / `DocumentReference` | Reviewed chart note or digest. |
| Alert route | `Communication` | Staff notification metadata. |

## What Is Not Done Yet

- Medplum server integration.
- SMART-on-FHIR auth.
- Formal value sets and coding systems.
- Final FHIR profiles.
- Legal/regulatory review of chart-write behavior.

## What Must Work First

1. Live video feed visible remotely.
2. Events recorded from that feed.
3. Evidence attached to events.
4. VLM interpretation attached to selected events.
5. Assistant answers using event/state/evidence tools.

Medplum comes after this loop is real.
