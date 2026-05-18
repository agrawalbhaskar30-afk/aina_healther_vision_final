# Evaluation and Safety Plan

## Safety Position

AINA Healther Vision v1 is a monitoring and workflow-support system. It should be evaluated as a system that detects events and routes them for human review.

It must not be marketed as:

- Autonomous diagnosis.
- Autonomous treatment.
- Replacement for nursing observation.
- Predictive deterioration unless separately validated.

## Evaluation Levels

### Level 1: Synthetic Fixtures

Purpose:

- Validate event contracts and state machines.
- Catch regressions quickly.

Examples:

- Normal in bed.
- Sitting on edge.
- Out of bed.
- On floor.
- Staff visit.
- Vitals alert.
- IV near empty.

Acceptance:

- Deterministic expected events match emitted events.
- No schema regressions.

### Level 2: Staged Local Footage

Purpose:

- Test real lighting, blur, camera angle, and human behavior.

Scenarios:

- Patient in bed.
- Patient sits at bed edge.
- Patient leaves bed.
- Patient lies on floor in a simulated fall posture.
- Staff enters and exits.
- Monitor screenshot visible.
- Low light.
- Occlusion by curtain or staff.

Acceptance:

- Critical recall target is met before pilot.
- False positives are measured and reviewed.

### Level 3: Shadow Pilot

Purpose:

- Run in hospital without routing alerts to care workflow at first.

Process:

- System detects and logs events.
- Staff perform normal care.
- Reviewers compare system events with logs and observations.
- Tune thresholds.

Acceptance:

- False alert rate low enough for nurse-visible mode.
- No privacy or workflow blockers.

### Level 4: Nurse-Visible Pilot

Purpose:

- Validate operational usefulness.

Process:

- Critical and warning alerts route to selected staff.
- Every alert can be acknowledged and reviewed.
- Clinical team can pause alerts per bed.

Acceptance:

- Acknowledgment latency improves or meets ward target.
- Staff do not report unacceptable alert fatigue.
- Morning digest is clinically useful.

## Metrics

Detection:

- True positives.
- False positives.
- False negatives.
- Precision.
- Recall.
- Event latency.
- Confidence calibration.

Workflow:

- Alert acknowledgment latency.
- Escalation count.
- Duplicate alert rate.
- Review completion rate.
- Morning digest usefulness score.

Reliability:

- Camera uptime.
- Edge uptime.
- Sync backlog.
- Dropped frame rate.
- Storage pressure.

Safety:

- Missed critical events.
- Privacy incidents.
- Unauthorized access attempts.
- Unsupported assistant answers.
- Clinician override rate.

## Human Review Rules

Require human review for:

- Fall/on-floor.
- Critical vitals.
- Any chart write.
- Any assistant-generated clinical recommendation.
- Any event used in pilot reporting as ground truth.

## Assistant Safety

The assistant must:

- Cite patient/event sources.
- Say when data is unavailable.
- Avoid unsupported diagnosis.
- Avoid final medication or treatment instructions without clinician review.
- Explain why an alert fired using event evidence.
- Preserve uncertainty.

The assistant must not:

- Invent vitals, imaging, labs, or events.
- Claim it contacted staff unless the alert/call system confirms it.
- Autonomously place orders.
- Hide that a model or sensor was uncertain.

## Dataset Governance

Open-source code does not mean open patient data.

Rules:

- Real patient data requires documented permission.
- Use de-identified or synthetic data for public examples.
- Keep hospital footage out of public GitHub.
- Version datasets privately.
- Track consent and allowed use.
- Separate training data from validation data.

## Regulatory Watchpoints

Claims matter.

Lower-risk wording:

- "detects potential patient safety events"
- "routes alerts for review"
- "drafts observations for clinician sign-off"
- "summarizes available record data"

Higher-risk wording:

- "diagnoses respiratory distress"
- "predicts deterioration"
- "recommends treatment"
- "automatically orders interventions"

Before making higher-risk claims, get regulatory counsel and clinical validation.
