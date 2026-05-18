# ADR 0001: V1 Product Scope

## Status

Accepted.

## Context

The original documents mixed three ambitions: reproducing the AINA demo experience, building a low-cost open-source monitoring layer, and eventually supporting advanced clinical AI. Those are compatible, but not all belong in v1.

## Decision

V1 is a clinician-reviewed operational monitoring product. It detects and routes events, writes reviewable observations, and helps staff understand what happened. It does not autonomously diagnose, order treatment, or claim predictive deterioration.

## Consequences

- The first pilots can be evaluated on alert timeliness, workflow fit, and documentation usefulness.
- Regulatory risk is reduced, but not eliminated.
- Advanced features remain possible after evidence collection and clinical validation.
