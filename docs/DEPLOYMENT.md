# Deployment Plan

## Deployment Principles

- Keep raw video local unless an event requires evidence upload.
- Make the system useful during network outages.
- Deploy single-tenant per hospital for v1.
- Prefer commodity cameras and commodity edge hardware.
- Keep rollback simple.

## Environments

### Local Development

- Docker Compose for Postgres, Redis, and object storage.
- Video files or local RTSP simulator.
- Synthetic data and staged footage.
- No real PHI.

### Staging

- Cloud-hosted API and web app.
- Fake hospital and fake patients.
- Staged video fixtures.
- Test notification channels.
- Used for integration and demos.

### Pilot Production

- One hospital.
- One ward.
- One edge box.
- Managed Postgres.
- Object storage with lifecycle policy.
- Restricted users.
- Formal audit logging.

## Edge Hardware

MVP options:

- Intel NUC class device for CPU-first deployments.
- NVIDIA Jetson Orin Nano if local model acceleration is needed.
- Existing hospital workstation for proof-of-concept only.

Minimum recommended:

- 16 GB RAM.
- 512 GB encrypted SSD.
- Wired Ethernet.
- UPS where possible.
- Docker runtime.

## Network Requirements

- Access to RTSP or camera streams.
- Outbound HTTPS to cloud API.
- Optional secure tunnel for admin.
- No inbound public ports required.
- Local alerting must work without internet if configured.

## Storage Policy

Suggested defaults:

- Non-event frame cache: minutes to hours.
- Review event clips: 30 to 90 days during pilot.
- Confirmed clinical audit assets: hospital policy.
- False-positive assets: short retention after evaluation.
- Logs without PHI: longer retention allowed.

## Install Checklist

Before arrival:

- Confirm hospital approval.
- Confirm camera URLs and credentials.
- Confirm network segment and firewall policy.
- Confirm ward, bed, and user list.
- Confirm whether footage can leave premises.
- Confirm consent/privacy signage requirements.

On site:

- Install edge box.
- Configure encrypted disk.
- Connect cameras.
- Calibrate bed zones.
- Test local event detection.
- Test alert route.
- Test cloud sync.
- Run staged fall/on-floor drill if clinically approved.

After install:

- Review camera positioning.
- Review false positives.
- Train staff on acknowledgment and escalation.
- Set pilot reporting cadence.

## Release Process

- Every release has a version.
- Edge and cloud versions are recorded in event metadata.
- Migrations are reversible where possible.
- Feature flags gate high-impact features.
- Rollback plan is documented before pilot updates.

## Backup and Restore

Must cover:

- Postgres backups.
- Object storage evidence backups if policy requires.
- Edge queue recovery.
- Edge config export.
- Restore drill before pilot.

## Incident Response

Incident categories:

- Missed critical event.
- Excessive false alerts.
- Privacy breach.
- Camera outage.
- Edge sync outage.
- Unauthorized access.
- Model/provider outage.

Every incident should record:

- What happened.
- Which beds/patients were affected.
- Which version was running.
- Which users were notified.
- Immediate mitigation.
- Follow-up action.
