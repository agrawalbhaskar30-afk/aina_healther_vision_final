# Project Context for AI Coding Agents

This repository is for AINA Healther Vision Final: a clinician-reviewed ambient vision and monitoring system for hospital beds.

## Prime Directive

Build a deployable healthcare product, not a flashy demo. Every feature must preserve patient privacy, clinical auditability, and human sign-off for decisions that affect care.

## Product Boundaries

In scope:

- Camera feed ingestion and edge-friendly event detection.
- Bed-state, fall, immobility, staff presence, vitals OCR, and IV-status monitoring.
- Event timeline, alert routing, evidence clips, and clinician review.
- Ask AINA assistant grounded in patient context and source citations.
- FHIR-compatible writes for reviewed observations and notes.

Out of scope for v1:

- Autonomous clinical orders.
- Autonomous diagnosis.
- Contactless vital signs from face video.
- Predictive deterioration claims.
- Cross-camera patient identity tracking.
- Face recognition for staff or patients.

## Engineering Standards

- Prefer boring, auditable systems over opaque magic.
- Keep event schemas strict and versioned.
- Route all LLM calls through a single service.
- Route all vision inference through a single edge inference interface.
- Store evidence with immutable audit metadata.
- Never log PHI, secrets, raw prompts with PHI, or full model responses containing PHI unless explicitly marked as protected audit data.
- Tests must cover event thresholds, alert deduplication, retry behavior, and permission boundaries.

## Reference Prototype

`prototypes/healther-vision/` contains the synthetic-first FastAPI prototype. Reuse its event-state ideas, but do not blindly copy prototype shortcuts into production services.
