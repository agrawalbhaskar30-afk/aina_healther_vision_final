# Build Plan

## Development Strategy

Build in evidence-producing phases. Each phase must leave behind runnable software, tests, and a demo artifact.

The key decision is to avoid building the assistant first. The assistant becomes valuable only after events, state, vitals, and evidence exist.

The active implementation target is the imported Aida mockup workflow served by the prototype backend: setup/video setup, one-bed monitor, event review, state reference, live video, review actions, and assistant hooks. Treat the phases below as expansion scaffolding after the one-room loop works end to end.

## Phase 0: Repo Foundation

Goal: make this repository ready for production work.

Deliverables:

- Monorepo structure.
- Package managers configured.
- Linting and testing conventions.
- Event schema package.
- Architecture decision records.
- Dev environment examples.
- GitHub Issues or project board seeded from this build plan.

Definition of done:

- A new contributor can clone the repo, read the docs, run the prototype, and understand the first implementation task.

## Phase 1: Data Contracts and Backend Skeleton

Goal: establish the canonical event and patient-state contracts.

Tasks:

- Create `packages/events` with strict event schemas.
- Generate TypeScript and Python types.
- Create `apps/api` FastAPI skeleton.
- Add auth placeholder and RBAC model.
- Add Postgres migrations for hospital, ward, bed, camera, patient, event, alert, evidence, review, audit.
- Add event ingestion endpoint.
- Add patient current-state endpoint.
- Add WebSocket or realtime event feed.
- Add tests for event validation and permissions.

Definition of done:

- A test client can post a valid event.
- Invalid events are rejected.
- The command center can receive a simulated event in real time.

## Phase 2: Edge MVP

Goal: run local detection and state logic against synthetic and staged footage.

Tasks:

- Create `apps/edge`.
- Add RTSP/video-file ingest.
- Add camera health checks.
- Add local motion filter.
- Port or adapt prototype state-machine logic.
- Add bed-zone polygon config.
- Save event stills and 30-second clips.
- Queue events in SQLite.
- Sync to `apps/api`.

Definition of done:

- A staged video produces bed-state and fall/on-floor events.
- Events sync to cloud.
- Evidence is linked to each review-required event.

## Phase 3: Command Center MVP

Goal: make the monitoring workflow real for clinicians.

Tasks:

- Create `apps/web`.
- Implement login placeholder.
- Implement multi-bed grid.
- Implement single-bed view.
- Implement vitals panel.
- Implement timeline.
- Implement event review drawer.
- Implement alert acknowledgment.
- Implement admin bed-zone calibration page.

Definition of done:

- A clinician can see a critical event, open evidence, acknowledge it, and mark true/false positive.

## Phase 4: Vitals OCR

Goal: turn monitor screenshots into useful, reviewable vitals.

Tasks:

- Build monitor crop config.
- Add OCR adapter.
- Add repeated-read acceptance logic.
- Add vitals out-of-range event.
- Add vitals trend UI.
- Build evaluation fixture set for target monitor types.

Definition of done:

- HR and SpO2 OCR are reliable on target monitor screenshots.
- BP and RR have confidence and review flags.
- Vitals events appear in timeline and trends.

## Phase 5: Alert Routing

Goal: alerts reach the right human without noise explosions.

Tasks:

- Create alert policy engine.
- Add delivery adapters: in-app first, then push/WhatsApp/SMS.
- Add deduplication.
- Add escalation timers.
- Add audit trail.
- Add alert fatigue dashboard.

Definition of done:

- Critical alerts route and escalate in a staged demo.
- Duplicate alerts are suppressed.
- Every delivery and acknowledgment is auditable.

## Phase 6: Ask AINA

Goal: assistant grounded in events and patient state.

Tasks:

- Create LLM router.
- Add patient summary tool.
- Add event timeline tool.
- Add vitals trend tool.
- Add evidence explanation tool.
- Add protocol lookup placeholder.
- Add response citations.
- Add refusal and uncertainty behavior.
- Add audit for prompts and outputs in protected storage.

Definition of done:

- Ask AINA answers "what happened overnight?", "why did this alert fire?", and "summarize vitals trend" using source-grounded outputs.

## Phase 7: Morning Digest

Goal: create the daily workflow hook.

Tasks:

- Build digest job.
- Define digest schema.
- Pull events, vitals, staff visits, transcript notes, and unresolved reviews.
- Generate summary.
- Add clinician feedback: useful, inaccurate, missing.
- Export digest to PDF/HTML.

Definition of done:

- One ward can generate reviewed morning digests for all active beds.

## Phase 8: Pilot Hardening

Goal: prepare a real hospital deployment.

Tasks:

- Harden edge install process.
- Add backups and restore.
- Add deployment checklist.
- Add camera onboarding checklist.
- Add hospital IT checklist.
- Add privacy notice templates.
- Add incident response runbook.
- Add validation report template.

Definition of done:

- The system can be installed in a pilot ward by following docs, without the original developer present.

## Phase 9: Pilot

Goal: gather evidence, not chase feature breadth.

Pilot scope:

- 4 to 8 beds.
- One ward.
- 2 to 4 weeks.
- Shadow mode first, then nurse-visible alerts.
- No autonomous clinical actions.

Collect:

- Event recall on staged drills.
- False alert rate.
- Acknowledgment latency.
- Camera uptime.
- Clinician feedback.
- Privacy concerns.
- Morning digest usefulness.

Decision gate:

- Expand only if critical events are captured reliably and false positives are manageable.

## First 20 Implementation Issues

1. Create `packages/events` with event schemas.
2. Create API skeleton and `/health`.
3. Add Postgres migrations for core entities.
4. Add event ingestion endpoint.
5. Add patient current-state reducer.
6. Add realtime event feed.
7. Create web app shell.
8. Build single-bed view with simulated data.
9. Port prototype state machine to edge service.
10. Add video-file ingest to edge service.
11. Add bed-zone polygon config.
12. Add evidence still/clip writer.
13. Add edge local SQLite queue.
14. Add edge-to-cloud sync.
15. Build event review drawer.
16. Add alert policy engine.
17. Add vitals OCR fixture schema.
18. Add OCR adapter interface.
19. Add LLM router interface.
20. Add morning digest schema.
