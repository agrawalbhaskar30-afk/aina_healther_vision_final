# Aida — Comprehensive Build Guide
## Solo Development with AI Agents — Sequential and Parallel Tracks

**Version:** 1.1
**For:** Bhaskar (solo founder + AI coding agents)
**Pilot strategy:** Dual pilot — one private chain + one public hospital (India only)
**Stack baseline:** Python/FastAPI, React Native (Expo), Next.js, Supabase, managed services everywhere

---

## 0. How to read this document

This guide is structured around three concepts you should internalize before reading:

**Critical path:** the sequence of work where each step blocks the next. You cannot parallelize the critical path. Doing it out of order means rework.

**Parallel tracks:** work that can be done simultaneously *because it doesn't share dependencies* with other tracks. With AI agents you'll be the bottleneck (review, integration, decisions), not the agents themselves — so parallelism is limited by your context-switching capacity, not by compute.

**Decision gates:** moments where you stop, look at evidence, and decide whether to proceed, pivot, or abandon. Three or four genuine gates over the whole build are enough. More than that means you're avoiding commitment.

Each section below lists what blocks what, what can be done in parallel, and what the actual deliverable looks like. The guide describes a sequence of phases. How fast you move through each phase depends on your hours, agent productivity, and what you discover along the way. Don't fix the schedule; fix the order.

---

## 1. Foundational decisions (lock these before any code)

These choices cascade into every later decision. Make them once, write them down, don't revisit until you have evidence they're wrong.

### 1.1 Stack lockdown

| Layer | Choice | Why |
|---|---|---|
| Language (backend) | Python 3.11+ | Best AI ecosystem; agents fluent in it |
| Backend framework | FastAPI | Async, typed, well-documented for AI agents |
| Database | Supabase (Postgres) | Managed, auth + storage + realtime built in, generous free tier |
| Auth | Supabase Auth | OIDC, magic links, role-based access |
| Real-time eventbus | Supabase Realtime + Upstash Redis | Realtime for UI; Redis for inter-service messaging |
| Object storage | Supabase Storage | For clips, audio, screenshots |
| Backend hosting | Fly.io or Railway | Simple deploys, regional (Mumbai/Bangalore) |
| Web frontend | Next.js 15 + TypeScript | App Router, server components, Vercel deploy |
| Mobile (tablet) | React Native + Expo | Cross-platform (iOS + Android), OTA updates |
| Vision detection | **RF-DETR (Apache 2.0)** | Commercial-clean, transformer-based, fine-tunes well on small datasets |
| Pose estimation | **RTMPose (Apache 2.0)** | Best multi-person performance, designed for real-time |
| Vision-language | Claude Sonnet 4.5 (Ask Aida, digest) + Gemini 2.5 Flash (high-volume scene checks, OCR) | Hybrid for cost |
| Tracking | **Norfair (BSD-3, lightweight) or BoxMOT (AGPL — for dev only)** | See note below |
| OCR | Gemini 2.5 Flash for v0; PaddleOCR (Apache 2.0) for v1 production | Cheap, no infra |
| Video calls | LiveKit Cloud | Managed WebRTC, ~$0.004/min |
| EMR standard | HL7 FHIR R4 (HAPI FHIR server, self-hosted in v1) | The standard, future-proof |
| PACS | DICOMweb client (`dicomweb-client` Python lib, MIT) | Standard |
| Push notifications | Expo Push + Firebase Cloud Messaging | Free, simple |
| SMS/WhatsApp alerts | Twilio + WhatsApp Business API | Standard |
| Observability | Sentry (errors) + Axiom (logs) + PostHog (analytics) | Free tiers cover early stage |
| Monorepo tool | Turborepo | Standard for TS monorepos; can host Python packages alongside |
| Package manager | uv (Python), pnpm (TS) | Fast, modern |

**Tracking note:** Most off-the-shelf tracking libraries (ByteTrack inside Ultralytics, BoxMOT) are AGPL or GPL. For commercial cleanliness, use **Norfair** (BSD-3-Clause) — it's pure Python, simple to integrate, and good enough for hospital scenes where there aren't 50 fast-moving objects. The original ByteTrack paper code is MIT but the popular Python wrappers are not; if you want ByteTrack specifically, integrate the original ByteTrack repo directly rather than via Ultralytics.

### 1.2 Code structure

Single monorepo. AI agents work better with the whole codebase visible in context.

```
aida/
├── apps/
│   ├── api/                    # FastAPI backend (cloud)
│   ├── edge/                   # Python service running on edge box
│   ├── web/                    # Next.js command center
│   ├── tablet/                 # React Native bedside app
│   └── worker/                 # Background jobs (digest gen, alerting)
├── packages/
│   ├── shared-types/           # TypeScript types + Python pydantic models
│   ├── events/                 # Event schema definitions
│   ├── prompts/                # Versioned LLM prompts
│   └── ui/                     # Shared React components
├── infra/
│   ├── supabase/               # Migrations, RLS policies, edge functions
│   ├── fly/                    # Backend deployment config
│   └── docker/                 # Edge box Dockerfile
├── tests/
│   ├── fixtures/               # Video clips, OCR samples, fake EMR data
│   └── e2e/                    # End-to-end tests
├── docs/
│   ├── prd.md                  # The PRD
│   ├── build-guide.md          # This file
│   ├── api.md                  # Auto-generated from FastAPI
│   └── adr/                    # Architecture Decision Records
└── scripts/                    # Dev tooling, data prep
```

### 1.3 AI agent setup

You're not just writing code — you're configuring a team of AI workers. Set this up properly once:

- **Claude Code** as the primary coding agent. Set up a `CLAUDE.md` in repo root with project-wide context, code style, test conventions.
- **Cursor or Zed** for in-editor pair programming when you want tighter feedback loops.
- **One CLAUDE.md per major directory** (`apps/api/CLAUDE.md`, `apps/edge/CLAUDE.md`, etc.) describing what that subsystem does, what it depends on, what its testing approach is.
- **Linear or GitHub Projects** for task tracking; tasks should be scoped to "one agent session" — small enough that an agent can complete it in one focused run and you can review the diff in 15 minutes.
- **A `prompts/` package** in the repo containing every system prompt, every tool definition, every prompt template — versioned. Never inline a prompt in application code.
- **A `tests/fixtures/` directory** with: 50–100 hospital-scene video clips (you'll collect these in the perception phase), 20–50 IntelliVue screenshot variants, 10 sample EMR patient records, 20 sample DICOM studies. Without good fixtures, agent-generated tests are useless.

### 1.4 Critical operational decisions

- **All LLM calls go through one router service** (`apps/api/llm/router.py`) — so swapping models is a config change. Never call Anthropic/Gemini SDK directly from feature code.
- **All vision inferences go through one inference service** (`apps/edge/inference.py`) — same reasoning.
- **All event types defined in one place** (`packages/events/schema.py`) with strict pydantic + TS types generated from it.
- **Feature flags from day one** — Supabase has a simple kv pattern; use it. Every feature shipped should be flag-gated.

---

## 2. The dependency graph (what blocks what)

Before talking about phases, here is the actual dependency graph. The boxes are deliverables, the arrows are "must exist before."

```
                              ┌──────────────────┐
                              │ 1. Repo scaffold │
                              │ + agent setup    │
                              └────────┬─────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐
        │ 2A. Event schema │ │ 2B. Supabase     │ │ 2C. LLM router  │
        │ + types          │ │ schema + auth    │ │ (Claude/Gemini) │
        └────────┬─────────┘ └────────┬─────────┘ └────────┬────────┘
                 │                    │                     │
                 └────────────────────┼─────────────────────┘
                                      │
                  ┌───────────────────┼───────────────────┐
                  ▼                   ▼                   ▼
        ┌─────────────────┐ ┌────────────────┐ ┌─────────────────┐
        │ 3A. Vision      │ │ 3B. Single-bed │ │ 3C. Ambient/EHR │
        │ pipeline        │ │ command center │ │ integration API │
        │ (RF-DETR +      │ │ UI skeleton    │ │ (your existing  │
        │ RTMPose + state)│ │                │ │  product)       │
        └────────┬────────┘ └────────┬───────┘ └────────┬────────┘
                 │                   │                   │
                 │ ┌─────────────────┼───────────────────┘
                 │ │                 │
                 ▼ ▼                 ▼
        ┌─────────────────┐ ┌────────────────────┐
        │ 4A. Patient     │ │ 4B. Single-bed     │
        │ state model     │ │ view shows live    │
        │ (multimodal     │ │ events + vitals    │
        │  fusion)        │ │                    │
        └────────┬────────┘ └─────────┬──────────┘
                 │                    │
                 └──────────┬─────────┘
                            ▼
                ┌───────────────────────┐
                │ 5. Ask Aida (LLM with │
                │ tool access to all of │
                │ the above)            │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────────┐
        ▼                   ▼                       ▼
┌──────────────────┐ ┌────────────────┐ ┌───────────────────┐
│ 6A. Auto-charting│ │ 6B. Bedside    │ │ 6C. DICOMweb /    │
│ + sign-off flow  │ │ video call     │ │ X-ray retrieval   │
│                  │ │ (LiveKit)      │ │                   │
└────────┬─────────┘ └────────┬───────┘ └──────────┬────────┘
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                ┌─────────────▼──────────────┐
                │ 7. Morning digest          │
                │ generator                  │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │ 8. Bedside tablet receives │
                │ alerts + executes orders   │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │ 9. Staged demo data + end- │
                │ to-end demo video          │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │ 10. Hospital pilot         │
                │ deployment                 │
                └────────────────────────────┘
```

The critical observations from this graph:
- Steps 2A, 2B, 2C are blockers for everything. Don't skip them. They're foundational.
- Step 3 has three independent parallel tracks. You can do them in parallel as you have capacity.
- Step 5 (Ask Aida) is the "magic" step — it depends on everything below. You cannot start it meaningfully until 4A and 4B are done.
- Steps 6A, 6B, 6C are independent of each other but all feed into 7.
- Step 9 — the demo video — is treated as a deliverable in its own right. It's what unlocks pilot conversations.

---

## 3. The build — phase by phase

The phases are ordered. Each phase has a definition of done; don't move forward until that's met.

### Phase 1: Foundation (sequential, do not skip)

**Goal:** Repo scaffolded, all services talk to each other, "hello world" event flows from edge to UI.

Critical path tasks:

- [ ] **Repo scaffold.** Create the monorepo structure from section 1.2. Initialize Turborepo, set up pnpm workspaces, configure TypeScript project references, set up uv for Python. Get `pnpm dev` running all services locally.
- [ ] **AI agent setup.** Write `CLAUDE.md` at repo root and one per `apps/` subdirectory. Set up Claude Code with the repo open. Test that the agent can read across the monorepo.
- [ ] **Supabase project.** Create the Supabase project (Mumbai region). Set up auth with email/password + OAuth. Define initial schema: `hospitals`, `wards`, `beds`, `patients`, `users`, `roles`. Define RLS policies. Generate TS + Python types.
- [ ] **Event schema.** Define every event type from V-01 to V-10 (and the audio events from your existing system) as a pydantic model + Zod schema. Auto-generate TypeScript types. Commit `packages/events/` package.
- [ ] **LLM router.** Build `apps/api/llm/router.py` with a unified interface. Supports Claude, Gemini, OpenRouter. Configurable per-call: model, temperature, max_tokens. Built-in retry, fallback model, cost logging, prompt versioning hook.
- [ ] **Cloud deployment.** Deploy `apps/api` to Fly.io (Mumbai region). Deploy `apps/web` to Vercel. Set up Supabase as the data layer. Confirm cloud → cloud connectivity works end-to-end.
- [ ] **Event bus.** Set up Upstash Redis. Define event publish/subscribe pattern. Build `apps/api/events/bus.py`. Write tests that publish an event and consume it.
- [ ] **Patient state model skeleton.** Build `apps/api/state/patient.py` — the canonical in-memory representation of a patient's current state (latest vitals, current events, last staff visit, etc.). Hydrate from Postgres, update from event bus, expose via REST + WebSocket.
- [ ] **Single-bed view skeleton.** Build the bare command-center UI in Next.js — login, single-bed dashboard with placeholders for camera feed, vitals panel, event timeline, Ask Aida panel. No real data yet.
- [ ] **Wire it together.** Manually fire an event from the API; confirm the UI updates in real-time via Supabase Realtime. This is your "hello world" for the full stack.

**Definition of done:** Can a manually-fired event from your terminal show up in real-time in the web UI within 2 seconds? Foundation is solid only when this works.

**Decision gate 1:** Does the foundation work end-to-end as above? If yes — proceed to Phase 2. If no — fix it before anything else. Every subsequent phase assumes this works.

### Phase 2: Vision pipeline (sequential within track, parallel with other tracks)

**Goal:** Vision detects all V-01 to V-05 events reliably on staged footage; single-bed UI shows them live.

#### 2.1 — Perception core

Critical path (vision):

- [ ] **Test footage.** Stage 2 hours of video in your apartment. Script: someone in bed normally, person leaving bed, person on floor (use a yoga mat — please don't actually fall), person sitting on edge of bed, no-movement for extended period (camera on, person reading still), attendant arriving, attendant leaving. Save as RTSP feed using OBS or stream from a phone camera as RTSP via the IP Webcam app.
- [ ] **RF-DETR + RTMPose pipeline.** Build `apps/edge/vision/pipeline.py`. Ingest RTSP, run RF-DETR for object detection and RTMPose for pose at 5 fps, output detections. Write tests against your staged footage. Get precision/recall numbers for person/bed detection.
- [ ] **Tracking + bed zones.** Add Norfair tracking on top of RF-DETR detections. Build a UI for manually drawing bed-zone polygons on a static frame (Streamlit is fine for this admin tool). Store zones in Postgres.
- [ ] **State machine v1.** Build `apps/edge/vision/state.py`. Implement V-01 (no movement, 3-hour window), V-02 (position change), V-04 (out of bed), V-05 (on floor). Use the staged footage to test each event.
- [ ] **Edge → cloud event publishing.** Wire the state machine to the event bus. Confirm a fall detection on local footage publishes a `PATIENT_ON_FLOOR` event to Upstash Redis and appears in the command center UI.

#### 2.2 — OCR + work-of-breathing + scene checks

Critical path:

- [ ] **Screenshot dataset.** Collect 30–50 IntelliVue and Mindray screenshots from Google Images and YouTube screenshots of medical product demos. Annotate the HR, BP, SpO2, RR locations.
- [ ] **OCR via Gemini Flash.** Build `apps/edge/vision/ocr.py`. Send monitor crops to Gemini 2.5 Flash with a structured-output prompt. Validate against your annotated dataset. Expected accuracy: >95% on HR/SpO2, >85% on BP/RR (smaller numbers).
- [ ] **Vitals event flow.** OCR runs every 60s, publishes `MONITOR_OCR_VITALS` event. Build threshold check for V-10 (vitals out of range). UI shows live vitals in the right panel.
- [ ] **Work-of-breathing v0.** This is the hard one. Approach: crop chest region from pose keypoints (shoulders + hips define the region), compute optical flow magnitude over a 10-second window, threshold for elevated WoB. Accept that this is research-grade — false positive rate will be high in v0.
- [ ] **VLM scene gate.** Build the motion-triggered Gemini Flash call. When motion exceeds a threshold OR every 60s, send a frame to Gemini Flash with the prompt "describe what's happening in this hospital room scene, focusing on the patient. Is anything concerning?" Use to confirm/reject events from the state machine, especially V-05.

**Definition of done:** Vision pipeline reliably detects V-01, V-02, V-04, V-05, V-09, V-10. V-03 (WoB) is best-effort. All events flow to UI in real time.

#### 2.3 — Single-bed view production-grade

Critical path:

- [ ] **Live camera feed in UI.** Set up an HLS or WebRTC stream from edge to web for the live preview. Don't ship video to cloud unless watching; use WebRTC direct-connect.
- [ ] **Event timeline.** Build the horizontal timeline component from the AINA reference. Events show as icons, click for detail, scrollable. 30s clip auto-saved for V-05 events and viewable in the timeline.
- [ ] **Vitals panel.** HR/BP/SpO2/RR in large display, AINA-style. "View trends" expands to a recharts multi-day plot.
- [ ] **Event sensitivity + ambient hook stub.** Build the API endpoint that lets the existing ambient/EHR system push a "raise sensitivity for bed N" command. Implement the V-08 ambient-triggered watch. (You'll wire your actual existing product to this next phase.)
- [ ] **Polish + record a 90-second demo clip.** Run the staged footage through, capture screen recording showing live detection. This is your interim asset.

**Decision gate 2:** Does the single-bed view, with live staged footage, look credible as a hospital monitoring product? Show it to one clinical advisor (use Doximity or just LinkedIn-message an ICU intensivist in India). If the answer is "this is interesting" — proceed. If "this looks like a toy" — figure out why and fix.

### Phase 3: Intelligence layer (parallel tracks possible)

**Goal:** Ask Aida works. Auto-charting works. Existing ambient product integrated.

This is the phase where parallelism actually helps. Three tracks can run simultaneously:

#### Track A: Ask Aida

- [ ] **Define the tools Ask Aida has access to.** Sketch this on paper first. At minimum:
  - `get_patient_summary(patient_id)` — pulls from EHR
  - `get_recent_events(patient_id, hours)` — pulls from event store
  - `get_vitals_trend(patient_id, hours)` — pulls vitals
  - `get_recent_transcripts(patient_id, hours)` — pulls from existing ambient layer
  - `get_imaging_list(patient_id)` — DICOMweb query (stub initially)
  - `fetch_xray(study_id)` — DICOMweb retrieve (stub initially)
  - `check_drug_interaction(drug_a, drug_b)` — call a drug DB API
  - `get_hospital_protocol(condition)` — RAG over hospital protocols
- [ ] **Build each tool as a FastAPI endpoint AND as a Claude tool definition.** Use the `prompts/` package to version the tool definitions.
- [ ] **Build the Ask Aida API endpoint** that takes a user message + patient context, calls Claude Sonnet 4.5 with tool access, returns the response.
- [ ] **Build the UI panel.** Pre-populated summary at top, chat input at bottom, streaming responses, citations inline. Mirror the AINA layout but with your own visual identity.
- [ ] **Cost budget:** ~$0.05–$0.20 per Ask Aida query. Track in PostHog.

#### Track B: Auto-charting

- [ ] **Define the chart entry format.** This depends on your existing EHR. If your EHR is your own product (which it is), define a `ChartEntry` model: structured fields (event_type, severity, observation, suggested_action) + free-text narrative + provenance tag.
- [ ] **Build the auto-chart generator.** Trigger: every event fires this. Logic: classify the event as "routine auto-chart" vs "needs sign-off." Generate the chart entry via Claude (with a structured-output prompt; use JSON mode).
- [ ] **Sign-off flow in the UI.** Pending chart entries appear in a queue. Clinician sees the proposed entry, can accept, edit, or reject. Audit log captures the decision.
- [ ] **AI-charted confirmations.** When the system auto-charts (no sign-off needed), show the AINA-style toast: "Change in patient position has been detected and automatically charted."

#### Track C: Existing product integration

- [ ] **Define the integration contract.** Your existing Bedside AI Assistant has an EHR and ambient transcripts. We need: read access to current patient + transcripts, write access to add events and chart entries.
- [ ] **Wrap your existing API in an adapter.** Build `apps/api/integrations/existing_emr.py`. Even if it's "talking to itself" (same codebase), use a clean adapter pattern so you can later support hospitals' own EMRs.
- [ ] **Wire round transcripts → vision sensitivity.** When the existing system records a transcript, parse for phrases like "fall risk", "watch closely", "restless overnight". Bump the V-08 sensitivity for the corresponding bed for 24h.
- [ ] **Wire events → existing EMR.** Auto-charted events appear in the existing EHR patient chart. Test the full loop: vision detects → event published → chart entry created → visible in existing EHR.

If you're doing this solo with AI agents, do these tracks **sequentially in this order** (A → B → C) rather than truly parallel. The AI agents can parallelize but your review and integration work cannot. If you have a collaborator joining, give them Track C (integration with your existing code, lowest risk for someone unfamiliar with your codebase).

### Phase 4: Communication + retrieval

#### 4.1 — LiveKit + DICOMweb

- [ ] **LiveKit integration.** Set up LiveKit Cloud account. Build the "Call bedside" feature. From command center: tap phone icon on bed view → LiveKit room created → tablet receives push → call connects. Audio captured into ambient transcript automatically.
- [ ] **DICOMweb client.** Build `apps/api/imaging/dicomweb.py`. For v0, point at the Orthanc DICOMweb sandbox (free public demo server). Implement: list studies for a patient, retrieve a specific image, return as base64 to the UI.
- [ ] **X-ray panel in Ask Aida.** When Ask Aida calls `get_imaging_list`, show the result as thumbnails in the chat. Click thumbnail → expand in modal. Mirror the AINA X-ray retrieval UX.

#### 4.2 — Bedside tablet extensions + alerting

- [ ] **Tablet receives alerts.** Extend your existing React Native app: subscribe to Supabase Realtime for events on assigned beds, show push notifications via Expo Push, render alert UI with acknowledge button.
- [ ] **Alert routing.** Build the alert router: based on event severity + assigned staff, route to right phones (push), nurse station (web), on-call physician (push + SMS via Twilio).
- [ ] **Tablet receives orders.** When the command center physician dictates an order during a call, the parsed structured order appears on the tablet for the bedside nurse to execute.
- [ ] **Round-camera capture.** During rounds (existing ambient flow), tablet front camera can be triggered to capture a frame, which gets attached to the round's structured note.

### Phase 5: Morning digest + polish

- [ ] **Morning digest generator.** Background worker (apps/worker/) runs at 6am per ward. For each patient: aggregate all events from last 24h, vitals trends, transcripts, staff visits. Generate structured digest via Claude Sonnet 4.5 with a long-form prompt. Store as a `patient.morning_digest` record.
- [ ] **Digest UI.** When physician starts a round (existing ambient flow), tablet shows the morning digest as the first screen for each patient. AINA doesn't have this — it's your differentiation.
- [ ] **Polish pass.** Bug fixes, UX cleanup, performance audit. Aim for <3s perceived latency on all common interactions.

### Phase 6: Demo data + demo video

This phase is treated as its own deliverable. The 5-minute demo video is what unlocks pilot conversations.

- [ ] **Staged shoot.** Rent a hospital-room mockup (~₹20K for a day in Mumbai via Justdial film studios) or use a friend's clinic. Hire 3 actors (₹5K each). Shoot a 30-minute clinical scenario. Use a real-looking bedside monitor display (a tablet running a custom React app showing IntelliVue-style vitals works fine). Include: a fall, a no-movement-3h event, a position change, a doctor round, a critical WoB scenario.
- [ ] **Run footage through system.** Process the recording, capture screen recordings of every event firing.
- [ ] **Edit the demo video.** 5 minutes max. Structure:
  - 0:00–0:30 Problem statement
  - 0:30–1:00 Cut to live monitoring; events firing on timeline
  - 1:00–2:00 Fall scenario end-to-end (detect → alert → call → resolution)
  - 2:00–3:00 Ask Aida deep dive (X-ray retrieval, multi-source synthesis)
  - 3:00–3:30 Auto-charting and sign-off flow
  - 3:30–4:00 Morning digest at round time
  - 4:00–4:30 Architecture/economics slide (one slide showing the unit economics)
  - 4:30–5:00 Pilot proposition / contact
- [ ] **Send the video to 20 hospital contacts.** Manipal Innovation, Apollo's CIO office, Fortis Healthcare Innovation, Max innovation, Aster DM CTO, AIIMS innovation cell, JIPMER, NIMHANS. For public sector: state health secretaries via PM-ABHIM contacts, district hospital CEOs. Personal note with each.

**Decision gate 3:** Did at least 3 of the 20 contacts respond with serious interest (request a meeting, ask for an in-person demo)? If yes → pilot conversations. If 1–2 → iterate the pitch. If zero → fundamentally re-examine the offering, possibly with a different demo or different target customer.

---

## 4. Pilot deployment and iteration

### First pilot signed and deployed

The shape of this depends on which pilot signs first (private chain vs public hospital). Plan for both in parallel; deploy whichever signs first.

#### Pre-deployment

- [ ] **Data Sharing Agreement.** Standard template, reviewed by a lawyer once (then reused). Specifies: what data flows where, anonymization commitments, IP ownership, termination clauses.
- [ ] **Clinical Co-Design Workshop.** Half-day with 3–5 clinicians at the pilot hospital. Walk through every screen. Capture every objection and feature request. This is when you find out what the demo got wrong.
- [ ] **Hospital IT survey.** Network architecture, existing CCTV brand/model/RTSP availability, EMR system, PACS system, WiFi coverage in target wards. Spend a full day on-site if possible.
- [ ] **Production-readiness audit.** Logging, error tracking, backups, disaster recovery, security review (even informal). You're going live in a hospital — this matters.

#### Deployment

- [ ] **Edge box prep.** Buy 2–3 Jetson Orin Nano dev kits. Image them with your software. Test in your apartment first, then ship to hospital.
- [ ] **On-site install.** 1–2 days at the hospital. Plug into existing CCTV NVR via RTSP, set up bed zones manually for each camera, train hospital IT on the admin UI.
- [ ] **Soft launch.** Initial period: shadow mode. System runs but only logs events; doesn't alert. You're checking false-positive rates before you let alerts fire.
- [ ] **Full launch.** Alerting turned on. Daily check-ins with hospital staff for the first phase post-launch. Iterate prompts and thresholds based on actual ward behavior.

### Iteration and data collection

- [ ] **Weekly metric reviews.** Time-to-clinician-response, falls per patient-day, vitals charting completeness, false-positive rate. Track against baseline.
- [ ] **Annotation pipeline.** Set up CVAT (free, self-hostable). Annotate footage from the pilot. Build a Manipal/AIIMS dataset that nobody else has.
- [ ] **Model fine-tuning.** Once you have ~2000 annotated frames, fine-tune RF-DETR on Indian hospital scenes via Roboflow. Deploy the fine-tuned model behind a feature flag.
- [ ] **Weekly clinician feedback session.** 30 minutes with the lead intensivist and lead nurse. What's working, what's not, what's missing.

### Second pilot + early commercial conversations

- [ ] **Second pilot signed and deployed.** Whichever one didn't sign first (likely the public hospital, since procurement is slower).
- [ ] **Case study writeup.** Publishable summary of pilot 1 results, ideally co-authored with the lead clinician. Submit to a conference (IndiaCom, ETHealthworld Innovation Awards, AIIMS innovation summit) for visibility.
- [ ] **Commercial pricing structure.** Based on pilot data, finalize the per-bed-per-month pricing for India private (₹8K–15K) and India public (₹3K–5K) segments.
- [ ] **Pre-fundraise conversations.** With clinical case study + 2 deployments + measurable KPIs, you're ready for seed conversations. Target India healthtech VCs: Sequoia/Peak, Elevation Capital, Stellaris, 3one4, Pi Ventures. Aim for $1.5M–$3M seed.

---

## 5. Parallel work — what AI agents can do while you sleep

A key advantage of agentic development: agents work asynchronously. Set up overnight workflows.

### Patterns that work overnight (or while you're at Aquatech)

1. **Test generation.** Agent reads a module and generates pytest cases. Review in morning.
2. **Documentation.** Agent writes docstrings, README sections, ADRs based on the code.
3. **Boilerplate.** New API endpoints, new React components from a template.
4. **Annotation prep.** Agent generates pre-annotations on video frames (using RF-DETR inference); you review and correct in CVAT.
5. **Prompt iteration.** Agent runs 50 variations of a prompt against your test set, scores each, picks the best.
6. **Data labeling assistance.** Agent generates synthetic transcript variations, OCR test cases, edge case scenarios.

### Patterns that don't work overnight

1. **Anything requiring clinical judgment.** Even "is this prompt clinically reasonable" requires you (or your clinical advisor) in the loop.
2. **UI design decisions.** Agents can implement specs but shouldn't design from scratch.
3. **Architecture decisions.** Agents are excellent at filling in patterns but mediocre at choosing patterns.
4. **Integrating with anything new.** First connection to LiveKit, first DICOMweb call — do these yourself, then let agents extend.
5. **Anything customer-facing for the first time.** Hospital deployment cannot be agent-led.

### Recommended rhythm

- **Plan blocks:** Plan a set of agent-completable tasks. Generate a Linear/GitHub board.
- **Deep work blocks:** Pair-code with the agent on the hardest task. Let agent run autonomously on the second hardest in parallel; you review at end.
- **Integration blocks:** Pull all the agent work, run end-to-end tests, fix integrations, deploy.
- **Customer development blocks:** Clinical conversations, hospital outreach, the things only you can do.

Don't try to do all four at once. Different brain states.

---

## 6. AGPL — what it means for you specifically

Quick deep-dive since you asked.

**The scenario where AGPL bites you:** You sell a SaaS product to Manipal Hospital. The product includes Ultralytics' code (not just YOLO weights — their Python library). Manipal staff use the product over the network. Under AGPL Section 13, you must offer to Manipal staff the *complete source code* of your application — not just the YOLO parts, your whole codebase.

In practice, AGPL compliance for a closed-source startup means:
- Your entire backend source code becomes publicly available to anyone with login access
- Competitors can copy it
- Your investors hate this (it's a real diligence flag)
- Hospitals' lawyers may also flag it depending on jurisdiction

**The development trigger:** AGPL only triggers on *distribution* — and "distribution" in AGPL terms includes "making the software available over a network." So:
- Running RF-DETR or Ultralytics on your laptop for development → no trigger, no license needed
- Running it on a Jetson at your own desk → no trigger
- Running it as part of a system that hospital staff use over the network → trigger, license needed

So you have lots of development runway before licensing matters. The decision point is "before first pilot deployment," not "before first line of code."

**Why RF-DETR is the cleaner choice from day one:** It's Apache 2.0. The license question never has to be answered. The model is competitive in accuracy. The library API is similar enough that AI agents can work with it as easily as Ultralytics. The "save it for later" migration path doesn't really save anything — you'd have to relearn the API anyway, and you'd have one extra dependency to retire.

**Full list of license cleanliness in the recommended stack:**
- ✅ RF-DETR — Apache 2.0 (clean)
- ✅ RTMPose / MMPose — Apache 2.0 (clean)
- ✅ Norfair (tracking) — BSD-3-Clause (clean)
- ✅ PaddleOCR — Apache 2.0 (clean)
- ✅ ONNX Runtime — MIT (clean)
- ✅ Hugging Face Transformers — Apache 2.0 (clean for Qwen-VL etc)
- ✅ FastAPI — MIT (clean)
- ✅ Supabase — Apache 2.0 (clean)
- ✅ LiveKit — Apache 2.0 (clean)
- ✅ Next.js — MIT (clean)
- ✅ dicomweb-client — MIT (clean)

With this stack, your entire dependency chain is commercial-clean. No license decision ever needs to be made about your dependencies. You're free to focus on the product.

**Models that you'd use weights from but not the library:**
- YOLOv11 weights — Apache (clean to use the weights with your own inference code, if you wanted)
- This is the "use weights without using AGPL library" pattern; not needed if you're on RF-DETR

---

## 7. Failure modes — what tells you to slow down, speed up, or pivot

### Signals to **slow down**

- Vision precision/recall on UR Fall Dataset is below 75% after the perception phase (means your pipeline isn't ready for real data yet)
- You're spending more than 2 hours reviewing each agent output (means tasks are too large; decompose)
- Three consecutive planned deliverables ship late or incomplete (means the plan is wrong; rescope)
- Cloud costs exceed $200/month before any pilot (means architecture is too cloud-heavy; push to edge)
- LLM costs per Ask Aida query exceed $0.50 (prompts are wrong or model is wrong)

### Signals to **speed up**

- Decision Gate 1 passes ahead of schedule — push forward, don't pad
- Pilot interest from 5+ hospitals after demo — you have leverage, sign one faster
- Clinical advisor says "this could save lives" without being asked — the wedge is real, scale faster
- Investor reaches out unprompted (will happen if your demo video is good) — accelerate fundraise

### Signals to **pivot**

- Zero pilot interest after demo with 20+ outreaches — the product, the pitch, or the market is wrong
- Pilot hospital can't get clinicians to actually use the system after 4 weeks of deployment — UX or workflow fit is wrong; don't add features, fix the friction
- False positive rate stays above 25% on critical events after 2 months of pilot data — the detection problem is harder than thought; bring in a CV specialist or reduce scope
- Cloudphysician launches their own public-hospital product (highly unlikely but possible) — your wedge has been taken; pivot to Gulf or to a different vertical (senior care, step-down ward)

### Signals to **abandon**

This is the hardest signal to recognize, but worth pre-committing to:

- Long stretch with no pilot deployed, no paying customer, no investor commitment, and no compelling reason to believe the next stretch will be different
- Your existing Bedside AI Assistant product is gaining traction and the vision layer is distracting from it
- A clear regulatory blocker emerges (CDSCO declares this a Class C medical device requiring 3-year approval cycle) — pivot to a market with less regulation

Pre-commit to the abandonment criteria *now*, with dates and metrics, so you don't fall into sunk-cost reasoning later.

---

## 8. What you should specifically NOT do (anti-patterns)

These are mistakes that single-founder + AI-agent builds frequently make.

1. **Don't build the multi-bed grid in v0.** You said single-bed only — stick to it. Multi-bed is a different UX problem (information density, prioritization, attention management) and a different technical problem (handling 25 simultaneous streams). It will eat significant effort for marginal demo value. Defer to v1.

2. **Don't integrate with a real hospital EMR before the pilot.** Hospitals use Akhil, MEDITECH, Cerner, custom systems, paper. Each integration is substantial work. For v0, use your own existing EHR. Integration with the pilot hospital's EMR is a pilot-time activity, not a pre-pilot activity.

3. **Don't try to be HIPAA-compliant in v0.** You're not in the US. Focus on DPDP Act compliance (much simpler), get a basic security posture (encryption, RBAC, audit logs), and move on. HIPAA is for when you go to the US or Gulf.

4. **Don't write your own LLM evaluation harness early.** Use simple "does it pass these 20 hand-crafted tests" until you have real usage data. Formal eval comes after pilot.

5. **Don't build admin tooling beyond the bare minimum.** Bed zone drawing tool in Streamlit, manual patient creation via Supabase Studio, manual user management via Supabase Auth dashboard. Beautiful admin UIs come post-revenue.

6. **Don't optimize the vision pipeline for speed in v0.** 5 fps is fine. Real-time isn't required for any of the v0 events. You can optimize once you have a working system and real bottleneck data.

7. **Don't try to handle every edge case.** What happens if RTSP drops? Retry with exponential backoff. What happens if Gemini is down? Fall back to Claude. What happens if the edge box reboots? Rejoin the bus. Beyond that — log it and handle it when it happens.

8. **Don't build a "platform."** Build a product. The platform abstraction tempts solo founders constantly. Resist. Build the specific thing for the specific customer; abstract only after the third customer asks for the same change.

9. **Don't talk to investors before the demo video is done.** Tempting after gate 2 passes, but premature. You need the demo video as a credibility lever. Talking to VCs without it is wasted ammunition.

10. **Don't fall in love with the AI agent productivity gain.** AI agents make individual tasks faster but introduce a new failure mode: shallow understanding. You can ship code you don't understand, and it will haunt you when something breaks at 2am in the pilot hospital. Build deep understanding of every critical path module yourself; let agents own the boilerplate.

---

## 9. Quick reference — the four documents you need

By the end of Phase 1, these four documents should exist and be maintained.

1. **`docs/prd.md`** — the PRD (already drafted)
2. **`docs/build-guide.md`** — this document
3. **`docs/adr/`** — Architecture Decision Records, one per major decision. Format: context, decision, consequences. Examples to write:
   - ADR-001: Why Supabase over self-hosted Postgres
   - ADR-002: Why hybrid edge-cloud (not pure cloud)
   - ADR-003: Why Claude + Gemini hybrid (not single LLM)
   - ADR-004: Why React Native (not native iOS)
   - ADR-005: Why LiveKit (not Google Meet)
   - ADR-006: Why RF-DETR (not Ultralytics YOLO)
4. **`CLAUDE.md`** at repo root + one per major subdirectory — context for AI agents

If a teammate or contractor joins later, these four documents onboard them quickly. Without them, onboarding takes much longer.

---

## 10. The honest version

A few things this guide papers over that you should know:

**The plan is more optimistic than reality.** Solo dev with AI agents alongside a full-time job is hard. Expect things to take longer than your gut estimate. Build margin in.

**You will rewrite the patient state model twice.** First version will be too simple. Second version will be too complex. Third version will be right. Plan for this; don't over-engineer the first one.

**The hardest part is not the technology.** It's getting one hospital to actually deploy and one clinician to actually use the system every day. Most healthtech startups die at this step. Budget 2x the effort here vs the technical build.

**Gemini Flash for OCR will work surprisingly well for v0.** When you eventually need higher reliability, PaddleOCR with a fine-tune will be the answer. Don't switch until Gemini Flash actually fails you.

**The morning digest is more valuable than you think.** Take it seriously. It's the feature clinicians will tell their friends about. The Ask Aida panel is what investors will demo. Different audiences.

**You will know whether this works once two pilots are deployed and running.** If KPIs are moving and clinicians are giving unsolicited praise — you have a company. If pilots are stalled, clinicians aren't using it, and the only feedback is polite interest — you don't, and continuing is sunk-cost reasoning. Set this checkpoint clearly in your head before you start.

---

**End of build guide.**

**Next document to write (after this one is reviewed):** `docs/adr/001-stack-choices.md` — the rationale for each major stack choice, so you don't relitigate them in later phases.
