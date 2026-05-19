# Product Requirements Document

## Product

AINA Healther Vision Final

## Version

1.0 planning baseline, May 2026.

## One-Line Goal

Build a deployable, clinician-reviewed ambient video monitoring product for hospitals that detects patient safety and workflow events, routes alerts, creates evidence, and enriches the patient record.

## Current Build Target

The immediate build target is narrower than the full product vision: one private room, one monitored bed, one live remote video feed, one event timeline, evidence capture, VLM interpretation, and one grounded assistant. The current prototype implements this through the imported Aida mockup workflow served by FastAPI, with runtime wiring for setup, live monitor, review, and assistant interactions.

## Product Thesis

The most valuable part of the AINA-style experience is not a single computer-vision model. It is the closed workflow loop:

camera observation -> event detection -> timeline evidence -> alert routing -> clinician review -> bedside communication -> reviewed chart entry -> morning digest.

This product should replicate that workflow using a lower-cost, open-source friendly, edge-tolerant architecture suited for Indian public hospitals, multi-bed wards, and later Gulf deployments.

## Target Users

- Remote intensivists and command-center clinicians.
- Bedside nurses.
- Ward doctors and residents.
- Hospital administrators responsible for monitoring coverage, falls, response times, and documentation.
- Implementation teams deploying cameras, edge boxes, and EHR integrations.

## Target Buyers

Priority order:

1. Indian public hospitals, medical colleges, district hospitals, and government programs.
2. Private Indian step-down wards, post-op wards, and HDUs that cannot staff continuous visual monitoring.
3. Gulf hospitals that want scalable remote monitoring and India-built deployment support.
4. Senior-care and home-step-down programs after hospital validation.

## V1 Positioning

V1 is patient-safety monitoring and workflow support. It is not an autonomous doctor. It does not issue orders, diagnose independently, or replace nurses.

The product must always make the clinical responsibility clear:

- AI detects and summarizes.
- Clinicians review and act.
- Every important action is auditable.
- Uncertainty is displayed, not hidden.

## Essential Features

### 1. Multi-Bed Command Center

The command center is the primary product surface.

Requirements:

- Grid views for 1, 4, 6, 9, 16, and 25 beds.
- Bed tiles sorted by severity and recency.
- Each tile shows camera preview, patient label, bed label, latest status, latest vitals, and current alert badge.
- Single-bed view opens with camera, vitals, timeline, assistant, and actions.
- Critical alerts stay visible until acknowledged or escalated.

### 2. Single-Bed Monitoring View

Requirements:

- Large live or near-live camera preview.
- Vitals side panel: HR, BP, SpO2, RR, and last-read confidence.
- Event timeline with timestamped icons and review status.
- Evidence drawer with still frames, 30-second clips, rule trace, and model outputs.
- Quick actions: call bedside, acknowledge, mark false positive, create chart entry, request review.
- Privacy-mask toggle for authorized users.

### 3. Event Detection

V1 events:

| ID | Event | Severity | V1 Requirement |
|---|---|---|---|
| V-01 | NO_MOVEMENT_SUSTAINED | Warning | Configurable threshold, default 3 hours. |
| V-02 | POSITION_CHANGE | Info | Log meaningful posture or bed-state changes. |
| V-03 | PATIENT_OUT_OF_BED | Warning | Trigger when patient leaves bed zone beyond grace period. |
| V-04 | PATIENT_ON_FLOOR_OR_FALL | Critical | Save evidence clip, request review, alert nurse. |
| V-05 | NO_STAFF_VISIT | Warning | Configurable per ward, default 2 hours. |
| V-06 | AGITATION_HIGH | Info or Warning | Motion threshold sustained over time. |
| V-07 | MONITOR_OCR_VITALS | Observation | OCR HR, BP, SpO2, RR from bedside monitor or ventilator display. |
| V-08 | VITALS_OUT_OF_RANGE | Critical or Warning | Requires repeated abnormal readings, not one noisy OCR. |
| V-09 | IV_NEAR_EMPTY_OR_STOPPED | Info or Warning | Detect visible IV bag/pump status when camera view supports it. |
| V-10 | AMBIENT_TRIGGERED_WATCH | Internal | Raise sensitivity after round transcript says fall risk, watch closely, restless, delirium, confused, etc. |

V1 must prioritize reliability on V-01, V-03, V-04, V-05, V-07, and V-08. V-06 and V-09 can remain lower-confidence features until enough data exists.

### 4. Alert Routing

Alert tiers:

- Critical: fall/on-floor, critical vitals, prolonged unresponsiveness. Route to nurse station, assigned nurse, and escalation clinician.
- Warning: no staff visit, out of bed, sustained immobility, agitation. Route to assigned nurse or ward dashboard.
- Info: position changes, routine vitals, charting events. Log to timeline and digest.

Requirements:

- Deduplicate repeated alerts.
- Escalate if unacknowledged.
- Record who saw, acknowledged, escalated, dismissed, or marked false positive.
- Keep alert text operational, not diagnostic.

### 5. Ask AINA Assistant

The assistant is a chart and event co-pilot, not a free-floating chatbot.

Requirements:

- Ground answers in patient record, event timeline, vitals, transcripts, imaging metadata, and hospital protocols.
- Display sources for clinically relevant statements.
- Refuse unsupported diagnosis or treatment claims.
- Convert dictated actions into proposed structured notes/orders for clinician review.
- Never auto-place medication orders in v1.
- Support "what happened overnight?", "show me fall-risk events", "summarize vitals trend", and "why did this alert fire?"

### 6. Morning Digest

Requirements:

- Per-patient summary for selected interval, usually overnight.
- Include sleep/movement proxy, out-of-bed count, staff visit count, vitals trend, alerts, interventions, and unresolved review items.
- Mark low-confidence claims clearly.
- Avoid speculative clinical recommendations unless grounded in protocol and clinician-reviewed.

### 7. Auto-Charting With Sign-Off

Requirements:

- Create draft observations from reviewed events.
- Support FHIR Observation-compatible data model.
- Require clinician sign-off for clinical chart writes.
- Preserve source evidence and audit trail.

### 8. Bedside Call

Requirements:

- One-click call from command center to bedside tablet or nurse station.
- Capture call metadata.
- Optionally transcribe call if consent and policy allow.
- Link call to event timeline.

### 9. Admin and Deployment Console

Requirements:

- Hospital, ward, bed, camera, and user management.
- Bed-zone polygon calibration.
- Camera health, edge-box health, sync status, and storage use.
- Event threshold configuration per ward and per patient.
- Role-based access control.

## Non-Goals for V1

- Autonomous orders.
- Autonomous diagnosis.
- Predictive deterioration claims.
- rPPG/contactless vitals.
- Patient or staff face recognition.
- Cross-camera identity tracking.
- Cloud upload of all raw video.
- Multi-tenant SaaS as the first deployment model.

## Success Metrics

Technical:

- Critical event latency under 10 seconds from local detection to local alert.
- Cloud sync latency under 30 seconds when connectivity is healthy.
- Command center p95 page load under 2 seconds on hospital broadband.
- Edge service survives network loss and syncs when online.

Clinical/workflow:

- Fall/on-floor recall target: at least 0.95 in staged validation before pilot.
- Critical false alerts: fewer than 2 per bed per day before pilot expansion.
- Vitals OCR accepted readings: at least 0.95 accuracy for HR/SpO2, at least 0.90 for BP/RR on target monitor types.
- Nurse acknowledgment capture: at least 0.95 of routed alerts.
- Morning digest accepted as useful by at least 70 percent of pilot clinicians.

Business:

- Pilot can be deployed with commodity cameras or existing CCTV.
- Edge hardware per ward remains low enough for public-sector procurement.
- Open-source core can be evaluated without buying proprietary hardware.

## MVP Release Definition

MVP is ready when one pilot ward can run:

- 4 to 8 monitored beds.
- One edge box.
- One command-center dashboard.
- Bed-zone calibration.
- Bed-state, fall/on-floor, staff presence, and monitor OCR.
- Evidence clips and review workflow.
- Basic Ask AINA grounded in patient/event data.
- Morning digest.
- Exportable audit logs.

## Product Risks

- False positives causing alert fatigue.
- False negatives creating unsafe confidence.
- Privacy concerns around continuous camera monitoring.
- Regulatory classification if claims become diagnostic or autonomous.
- Dataset bias across room layouts, patient body types, lighting, and wards.
- Hospital IT friction for camera and EHR integrations.

## Product Principles

- Evidence over mystique.
- Clinician review over autonomy.
- Edge-first privacy.
- Low-bandwidth by default.
- Configurable by ward.
- Open-source core, protected patient data.
