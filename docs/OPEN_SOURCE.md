# Open Source Strategy

## Goal

Make the core product inspectable and useful without exposing patient data, hospital secrets, or unsafe clinical claims.

## Recommended License

Apache-2.0 for code.

Why:

- Permissive.
- Commercial-friendly.
- Patent grant.
- Compatible with many healthcare and infrastructure deployments.

## What Can Be Open

- Event schemas.
- Edge service code.
- API service code.
- Command-center UI.
- Synthetic data generators.
- Evaluation harnesses.
- Deployment templates.
- Documentation.
- Prompt templates without PHI.

## What Should Stay Private

- Real patient footage.
- Hospital-specific configuration.
- Camera credentials.
- PHI-containing prompts and outputs.
- Proprietary model weights if licensed restrictively.
- Customer contracts and pilot reports with identifying details.
- Security-sensitive deployment details.

## Dependency Policy

Prefer:

- Apache-2.0.
- MIT.
- BSD.
- MPL-2.0 where acceptable.

Avoid for production core unless explicitly approved:

- GPL.
- AGPL.
- Non-commercial model licenses.
- Research-only model licenses.
- Datasets with unclear consent.

## Community Boundaries

This project should welcome contributions to:

- Edge reliability.
- Synthetic fixtures.
- Event schemas.
- Evaluation methods.
- UI accessibility.
- Deployment docs.
- Privacy-preserving workflows.

Do not accept public contributions that include:

- Real patient data.
- Scraped hospital footage.
- Secrets.
- Unvalidated medical claims.
- Face recognition or identity tracking features for v1.

## Public README Claims

Use:

- "Open-source ambient patient-safety monitoring toolkit."
- "Clinician-reviewed event detection and evidence workflow."
- "Built for low-bandwidth hospital deployments."

Avoid:

- "AI doctor."
- "Autonomous ICU monitoring."
- "Diagnoses respiratory distress."
- "Prevents all falls."

## Contribution Checklist

Before merging:

- Tests pass.
- No PHI.
- No secrets.
- License is acceptable.
- Event schema changes are versioned.
- User-facing medical language is reviewed.
- Safety implications are documented.
