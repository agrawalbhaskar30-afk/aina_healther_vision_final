# ADR 0002: Hybrid Edge-Cloud Architecture

## Status

Accepted.

## Context

Hospital camera feeds are bandwidth-heavy and privacy-sensitive. Public hospitals and multi-bed wards may have poor connectivity. A cloud-only architecture would be simpler to build but expensive and fragile.

## Decision

Use a hybrid edge-cloud architecture:

- Edge services ingest RTSP/WebRTC feeds, run local motion filtering, lightweight inference, state machines, redaction, clip capture, and store-and-forward sync.
- Cloud services handle authenticated APIs, command center, event persistence, LLM orchestration, integrations, notifications, and audit.
- Raw continuous video stays local by default. Evidence clips are uploaded only when policy allows and an event needs review.

## Consequences

- More deployment work than a cloud-only prototype.
- Better privacy, lower bandwidth cost, and stronger public-hospital fit.
- The product remains usable during intermittent connectivity.
