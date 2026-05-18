# Product Requirements Document
# Bedside AI Co-Pilot (working title: project)

**Version:** 0.1 (draft)
**Date:** May 2026
**Author:** Bhaskar
**Status:** Reference build target — AINA by Cloudphysician (analyzed from product demo video, May 2026)

---

## 0. Executive summary

We are building a production-ready ambient AI co-pilot for hospital patient monitoring, modeled on Cloudphysician's AINA but architected for a structurally lower cost base and a different distribution wedge (public hospitals, multi-bed wards, and Gulf hospital expansion — not tier-2 private Indian ICUs).

The product is a unified bedside intelligence layer that:

1. **Continuously monitors** patients via existing CCTV or bedside cameras, detecting clinically meaningful events without wearables
2. **Auto-charts** changes to the EMR with clinician sign-off
3. **Routes alerts** to bedside staff and (optionally) remote intensivists through a single command-center interface
4. **Answers clinical questions** about any patient via a conversational interface ("Ask Aina"-style)
5. **Seamlessly bridges** remote clinicians and bedside teams via integrated video/audio
6. **Builds on an existing ambient/EHR layer** rather than starting from scratch — making it strictly more capable than vision-only competitors

We already have the ambient audio/EHR foundation deployed. This PRD covers the vision and intelligence layers on top.

---

## 1. Reference product analysis: AINA

### 1.1 What AINA actually does (from the demo)

The video demonstrates a complete clinical workflow loop with three distinct surfaces and one connecting fabric.

**Surface 1: The room (camera and physical environment).** Cloudphysician-branded PTZ camera mounted on the wall. Real Philips IntelliVue MX450 bedside monitor showing live vitals (HR 60, SpO2 99, RR 13 in one shot; HR 145 BPM, BP 145/80, SpO2 88%, RR 45 in a critical-event shot). Real Dräger ventilator with EPAP/IPAP settings visible. The room is a recognizable Indian hospital ICU layout.

**Surface 2: The command center (remote physician workstation).** Bald clinician in scrubs operating on a dual-monitor Lenovo ThinkCentre setup. Hospital-style office with a whiteboard. Implied: a Bengaluru-based intensivist watching multiple ICU rooms.

**Surface 3: The AINA interface itself.** This is the actual product. It overlays/integrates the following panels:

- **Multi-bed grid view** with 6 live camera feeds (intro splash: "My ambient video monitoring is active")
- **Vitals side panel** with HR, BP, SpO2, RR in large numbers, plus a "View trends" link
- **Charted-events timeline** running horizontally across the bottom with timestamps (e.g., "07 Feb 2025") and event icons (the alarm bell, the document, the link)
- **Auto-generated event annotations** appearing inline on the timeline (e.g., "No movement detected for the last 3 hours" as a yellow banner with dismiss button; "Change in patient position has been detected and automatically charted" as a blue toast)
- **"Ask Aina" conversational panel** on the right side — pre-populated patient summary ("A 74-year-old South Asian female is admitted to the ICU for the last three weeks after developing aspiration pneumonia secondary to dysphagia post-stroke…") with a free-form chat input
- **In-line critical alerts** in the Ask Aina panel ("Patient with shortness of breath detected on bed 3 → Take me there" red CTA button)
- **One-click bedside contact** (green phone icon overlaid on the bed view; triggers a video/audio call to bedside staff)
- **Trends/charting view** with multi-day vitals plots (Feb 6 17:00 through Feb 7 04:00 visible)
- **X-ray retrieval panel** showing thumbnails of chest X-rays with a search field; clinician can pull up imaging mid-conversation
- **Patient status indicator** ("CodeBlue" badge next to patient name, configurable)
- **Confirmation toasts** after AI actions ("The bedside nurse has been informed"; "The patient is stable")

**The connecting fabric.** All four surfaces are integrated into a single workflow: vision detects → AINA charts → AINA alerts → physician reviews → physician calls bedside → physician dictates orders ("Administer nebulized albuterol... start NIV with an EPAP of 8 and IPAP of 14. Let's also get an ABG and a pro BNP and stop all IV fluids now") → AINA captures the orders → bedside nurse executes → ventilator settings change → AINA confirms stability.

### 1.2 What vision is actually doing (the bar is lower than it looks)

Reading the demo carefully, AINA's vision layer detects only a small number of things:

1. **No movement / sustained immobility** ("No movement detected for the last 3 hours") — frame differencing or motion magnitude over a long window
2. **Position change** ("Change in patient position has been detected and automatically charted") — pose or bbox change classification
3. **Respiratory distress / work-of-breathing** ("Patient with shortness of breath detected on bed 3") — likely chest-region motion analysis or facial cues
4. **Bedside monitor screen reading** — OCR of the Philips IntelliVue display to extract HR/BP/SpO2/RR into the EMR
5. **Bed/patient presence** — basic person-in-bed-zone state

That's it on the pure vision side. The "magic" of the demo isn't the vision tech — it's the **integration of vision events with the conversational interface, the EMR auto-charting, and the bedside call workflow**. This is good news for us: the vision pipeline is buildable in weeks; the experience layer is where the real product work lives.

### 1.3 What AINA is NOT doing (gaps and limits)

Important to internalize before we copy them:

- **No rPPG or contactless vitals from face video.** All vitals come from the bedside monitor via OCR (or device integration). They are not deriving HR or SpO2 from camera frames.
- **No multi-patient cross-camera tracking.** Each bed has its own dedicated PTZ camera and feed.
- **No predictive deterioration models** visible in the demo. The AI flags events that have already happened; it doesn't predict 4 hours ahead.
- **No autonomous clinical decision-making.** Every order goes through the remote physician. AINA is a co-pilot, not an agent.
- **No multi-bed Indian ward handling.** Single patient per camera feed. Wide-bay wards with floor-mat attendants are out of scope.
- **No paper chart OCR.** They assume EMR-native operation.
- **Heavy dependency on Cloudphysician-branded PTZ cameras.** Custom hardware sold/installed per bed.

### 1.4 Stack inference

From their public footprint (Google Cloud Vision API, Med-PaLM, Gemini for Google Cloud, GKE, Google Meet) plus the visual cues in the demo:

- **Cameras:** Cloudphysician-branded PTZ IP cameras (likely OEM'd from Hikvision/Dahua, rebranded). Stream RTSP to cloud.
- **Frame processing:** Cloud-based, likely Google Cloud Vision API for object/scene detection plus custom models for motion/posture/WoB.
- **OCR:** Google Cloud Vision OCR for the bedside monitor.
- **LLM/VLM:** Med-PaLM and Gemini for "Ask Aina" conversational layer.
- **EMR write-back:** Custom integration per hospital (HL7 FHIR or direct DB writes, depending on customer).
- **Video calls:** Google Meet (rebranded inside AINA).
- **Compute:** Google Kubernetes Engine.

This is a **cloud-first architecture with no edge inference**. The implication for us: we can match feature parity with a hybrid edge-cloud architecture at substantially lower per-bed cost, while supporting low-connectivity Indian public hospitals where their cloud-only stack would fail.

---

## 2. Product positioning and strategic intent

### 2.1 Target customers (in priority order)

1. **Indian public hospitals** — district hospitals, CHCs, state-run medical college hospitals. Buy via state health ministries, GeM portal, PM-ABHIM and Ayushman Bharat infrastructure funds. Cannot afford AINA's per-bed pricing.
2. **Step-down wards and post-op wards in tier-1 private Indian chains** (Manipal, Apollo, Fortis, Max, Aster) — they have intensivists for ICU but no monitoring for wards.
3. **Gulf hospitals** (UAE MOH, Saudi MOH, Qatar) — high willingness to pay, India-built tech-bridge advantage, less Cloudphysician fortification.
4. **Senior care and home-step-down** (longer term) — adjacency expansion.

Explicitly NOT in scope for v1: tier-2 private Indian ICUs where Cloudphysician/AINA is already entrenched. Don't fight them on their home turf.

### 2.2 Competitive position vs AINA

| Dimension | AINA (Cloudphysician) | Project (us) |
|---|---|---|
| Architecture | Cloud-only (Google Cloud Vision, Med-PaLM, Gemini) | Hybrid edge-cloud (v1) → edge-first (v2) |
| Cameras | Cloudphysician-branded PTZ, per-bed | Existing CCTV (preferred) + bedside tablet camera |
| Hardware cost per bed | High (PTZ + install + cloud bandwidth) | Low (uses existing infra; edge box ~$200/ward) |
| Connectivity requirements | Continuous high-bandwidth uplink | Tolerant of poor/intermittent connectivity |
| Bundled clinical service | Yes — remote intensivists included | Optional — software-first |
| EMR | Integrates with hospital EMR | Native EMR layer (built on existing ambient/EHR product) |
| Ambient documentation | Not a focus | Core feature (already built) |
| Vision events | ~5 types | Same 5 in v1, expand to ~12 in v2 |
| Conversational layer | Ask Aina (Med-PaLM/Gemini) | Ask Aida (Claude Sonnet + Gemini Flash hybrid) |
| Pricing model | Per-bed-per-month, clinician hours bundled | Per-bed-per-month, software only; optional clinician layer |
| Target ICU/ward | ICU (single bed per camera) | ICU + wards + multi-bed bays |

### 2.3 The unique wedge

Three things this product can do that AINA structurally cannot:

1. **Ambient + vision fusion.** Round transcript modifies vision sensitivity per bed. ("Patient 4 is a fall risk" said in rounds → vision system raises sensitivity automatically for 24 hours.) AINA has no ambient round capture.
2. **Edge-tolerant deployment.** Works on poor connectivity, intermittent power, no existing EMR. Critical for Indian public sector.
3. **Multi-bed ward optimization.** Wide-angle camera + multi-patient pose classification handles the bay-ward setup that single-PTZ AINA cannot.

---

## 3. Product scope

### 3.1 In scope for v1

**Bedside layer (already built):**
- Ambient round transcription
- Native EHR with structured note auto-generation
- Tablet UI for bedside doctors and nurses

**New: Vision monitoring layer**
- Continuous monitoring from existing CCTV or new IP cameras
- Five core vision events (see section 4.1)
- Bedside monitor OCR
- Edge box for processing (one per ward)

**New: Intelligence and command center layer**
- Command center web UI with multi-bed grid view
- Unified patient timeline (ambient transcripts + vision events + vitals)
- Ask Aida conversational interface per patient
- Auto-charting with one-tap clinician sign-off
- Critical alert routing (push, WhatsApp, in-app)
- One-click bedside contact (Jitsi or LiveKit, not Google Meet)
- Morning digest generation

**New: Integration layer**
- HL7 FHIR write-back to hospital EMR (where one exists)
- Read access to imaging archives (PACS via DICOMweb) for X-ray retrieval
- Bedside monitor OCR pipeline

### 3.2 Explicitly out of scope for v1

- rPPG / contactless vitals from face video
- Predictive deterioration models
- Autonomous clinical orders (always require physician sign-off)
- Cross-camera patient tracking
- Pain estimation from face
- Pure ICU vital integration via device protocols (use OCR instead in v1)
- Mobile native apps (web responsive only)
- Multi-tenant SaaS (single-tenant deployments only in v1)

### 3.3 In scope for v2 (6–12 months out)

- rPPG and respiratory rate from chest motion
- Fine-tuned vision models on collected hospital data
- Edge-first inference (Jetson Orin Nano deployment) for cost compression
- Multi-bed bay handling with attendant differentiation
- Predictive deterioration (sepsis early-warning style)
- Mobile native apps

---

## 4. Functional requirements

### 4.1 Vision events (v1)

The five events that comprise AINA's vision feature parity, plus our additions:

| ID | Event | Trigger | Severity | Action |
|---|---|---|---|---|
| V-01 | NO_MOVEMENT_SUSTAINED | No detectable patient motion for configurable threshold (default 3h) | Warning | Yellow banner on timeline + push to nurse |
| V-02 | POSITION_CHANGE | Detected pose/bbox change classified as repositioning | Info | Auto-chart entry + blue toast confirmation |
| V-03 | WORK_OF_BREATHING_ELEVATED | Chest-region motion analysis flags elevated WoB | Critical | Red alert in Ask Aida + page on-call physician |
| V-04 | PATIENT_OUT_OF_BED | Person bbox leaves bed-zone polygon for >3s | Info → Warning if >5min | Log + escalate if prolonged |
| V-05 | PATIENT_ON_FLOOR | Pose centroid below bed-floor line + horizontal posture, sustained 5s | Critical | Save 30s clip + VLM verify + page nurse + escalate |
| V-06 | NO_STAFF_VISIT | No staff-classified person in bed-zone for >2h | Warning | Notify nurse station + compliance log |
| V-07 | AGITATION_HIGH | Motion magnitude exceeds threshold for >10min | Info | Log + flag for delirium screen |
| V-08 | AMBIENT_TRIGGERED_WATCH | Round transcript contains flagged phrases ("fall risk", "watch closely") | n/a | Increase sensitivity for that bed for 24h |
| V-09 | MONITOR_OCR_VITALS | Periodic OCR of bedside monitor screen | n/a | Auto-write vitals to EMR every 60s |
| V-10 | VITALS_OUT_OF_RANGE | OCR'd HR/SpO2/RR outside configurable bounds for 3 consecutive reads | Critical | Alert + EMR write |

V-01 through V-03 match AINA's demonstrated capabilities. V-04 through V-10 are our extensions.

### 4.2 Command center web UI

The web UI must replicate the AINA experience but on commodity hardware and with our pricing structure.

**Multi-bed grid view (analogous to AINA's 6-tile splash):**
- Configurable grid (1, 4, 6, 9, 16, 25 beds visible at once)
- Each tile shows: live or near-live camera frame, patient name + age + sex, current critical vitals (HR/SpO2/RR), latest event badge, status indicator (Stable/Watch/Critical/CodeBlue)
- Click tile → expand to full single-bed view
- Auto-prioritization: critical patients float to top-left

**Single-bed expanded view:**
- Large camera frame (live)
- Vitals side panel (HR, BP, SpO2, RR — current values, large display, like AINA)
- "View trends" expands to multi-day plot (analogous to AINA's Feb 6 to Feb 7 chart)
- Timeline of events at bottom — scroll-able, icon-indexed
- Ask Aida panel on right with patient summary auto-loaded
- Quick actions: Call bedside, Open chart, Review event clip, Annotate

**Ask Aida panel:**
- Pre-populated summary at top (1–2 sentence patient context, like AINA's "74-year-old South Asian female…")
- "Show more" expands to full chart summary
- Inline critical alerts as red CTA cards ("Patient with elevated WoB detected on bed 3 → Take me there")
- Free-form chat input at bottom
- The model has tool access to: patient history, vitals trends, imaging via DICOMweb, drug interactions, hospital protocols
- Every response cites its source from the EMR
- Confirmation toasts after AI-initiated actions

**Event timeline (per patient):**
- Horizontal scroll, time-anchored
- Event icons match AINA conventions (bell = alert, doc = charted, link = referenced, photo = clip)
- Click event → opens 30s video clip + EMR entry + nurse acknowledgment status
- Date/time chips like AINA's "07 Feb 2025" marker

**Bedside call:**
- One-tap from any bed view
- Opens Jitsi or LiveKit video call to bedside tablet
- Audio captured into ambient transcript automatically
- Orders dictated are parsed and proposed as structured EMR entries for physician sign-off (like AINA's nebulized albuterol order flow)

### 4.3 Bedside tablet (already exists; extend)

Existing capability: ambient round transcription, structured note generation, native EHR.

Extensions for v1:
- Receive call from command center, show patient context overlay during call
- Capture round-camera frames (tablet front cam) on demand for documentation
- Display vision-generated alerts for assigned patients
- Allow nurse to acknowledge alerts (closes the loop on AINA's "The bedside nurse has been informed" toast)
- Display incoming orders from command center for execution

### 4.4 Morning digest

Generated for each patient at the start of the day shift round (default 7am, configurable).

Content (mirroring what AINA implicitly does in continuous monitoring but not as an explicit digest):
- Patient identifier and current diagnosis/admission summary
- Overnight sleep estimate
- Out-of-bed events count and times
- Vitals trends (key changes flagged)
- Agitation peaks
- Staff visits count and last visit timestamp
- All critical or warning events
- Audio notes from night staff (from ambient transcripts)
- AI-suggested actions for the round ("Consider checking for UTI given urinary frequency + nighttime tachycardia")

This is our differentiation vs AINA — they don't show this as a structured deliverable in the demo.

### 4.5 Auto-charting

When the AI detects an event (V-01 through V-10), it generates a structured EMR entry and either:
- **Auto-chart immediately** for routine/informational events (V-02 position change, V-09 vitals OCR) — like AINA's "Change in patient position has been detected and automatically charted"
- **Propose for physician sign-off** for clinically meaningful events (V-03, V-05, V-10)

All entries are tagged with provenance ("AI-charted", "AI-proposed → physician signed", "AI-proposed → physician modified") for medico-legal traceability.

---

## 5. Non-functional requirements

### 5.1 Performance and latency

| Metric | Target |
|---|---|
| Frame ingestion rate (per camera) | 5–10 fps |
| Detection latency (frame → event) | < 3 seconds |
| Critical alert latency (event → push) | < 5 seconds |
| Command center UI load time | < 2 seconds per bed view |
| Ask Aida response time | < 4 seconds for typical query |
| Bedside call connect time | < 3 seconds |
| Edge box capacity | 4 cameras at 5 fps + 1 VLM call/30s |

### 5.2 Reliability

- 99.5% uptime SLA for command center
- Local edge box must continue detecting and queuing events for ≥4 hours during cloud connectivity loss
- Automatic resync of queued events when connectivity restored
- Graceful degradation: if VLM is unavailable, fall back to detection-only mode with reduced richness

### 5.3 Security and compliance

- HIPAA-compatible architecture (US deployments)
- DPDP Act 2023 compliance (India)
- UAE Federal Data Protection Law compliance (Gulf)
- All video processed at the edge — raw video must not leave the hospital network without explicit configuration
- Only structured events, anonymized clips (when needed for clinical review), and OCR'd vitals traverse the cloud boundary
- All data at rest encrypted (AES-256)
- All data in transit encrypted (TLS 1.3)
- Role-based access control: bedside nurse, ward nurse, attending physician, intensivist, admin, auditor
- Audit log for every AI action, every clinician action, every patient data access

### 5.4 Cost targets

| Metric | v1 target (cloud-API era) | v2 target (edge era) |
|---|---|---|
| Hardware per bed | < $150 (using existing CCTV) | < $80 (purpose-built kit) |
| Software cost per bed per month (API costs) | < $40 | < $5 |
| Total per-bed price to public hospital | ₹3,000–5,000/month | ₹1,500–2,500/month |
| Total per-bed price to private hospital | ₹8,000–15,000/month | ₹5,000–8,000/month |

For reference, AINA-equivalent products in tier-2 Indian private hospitals price at ₹50,000–1,00,000/bed/month with clinician hours bundled. We are targeting roughly 1/10th to 1/20th the price point for software-only deployment.

### 5.5 Connectivity tolerance

- Must function with intermittent connectivity (4-hour buffer at edge)
- Must function with low-bandwidth uplink (< 1 Mbps sustained per ward)
- Must NOT require video upload to cloud for core functionality

---

## 6. Technical architecture

### 6.1 High-level architecture

```
        ┌──────────────────────────────────────────────────┐
        │                  HOSPITAL NETWORK                 │
        │                                                    │
        │  ┌──────────────────────┐                         │
        │  │ Existing CCTV / IP   │                         │
        │  │ cameras (RTSP)       │                         │
        │  └──────────┬───────────┘                         │
        │             │                                       │
        │  ┌──────────▼──────────────────────┐               │
        │  │ Edge box (one per ward)         │               │
        │  │ ─────────────────────────────── │               │
        │  │ • Motion detector (OpenCV)      │               │
        │  │ • YOLO + pose (gated by motion) │               │
        │  │ • ByteTrack for IDs             │               │
        │  │ • State machine (V-01 to V-10)  │               │
        │  │ • Monitor OCR pipeline          │               │
        │  │ • Local event buffer (4h)       │               │
        │  └──────────┬──────────────────────┘               │
        │             │ Events only (no video by default)    │
        │             │                                       │
        │  ┌──────────▼──────────┐  ┌─────────────────┐     │
        │  │ Bedside tablets     │  │ Hospital EMR/   │     │
        │  │ (existing ambient   │  │ PACS / HIS      │     │
        │  │  product)           │  │                 │     │
        │  └──────────┬──────────┘  └────────┬────────┘     │
        │             │                       │              │
        └─────────────┼───────────────────────┼──────────────┘
                      │                       │
                      │  Encrypted uplink     │
                      ▼                       ▼
        ┌─────────────────────────────────────────────┐
        │              CLOUD BACKEND                   │
        │                                              │
        │  ┌──────────────────────────────────────┐   │
        │  │ Event bus (Redis + persistence)      │   │
        │  └──────────────────────┬───────────────┘   │
        │                         │                    │
        │  ┌──────────────────────▼───────────────┐   │
        │  │ Patient state model                  │   │
        │  │ (audio + video + vitals + EHR)       │   │
        │  └──────────────────────┬───────────────┘   │
        │                         │                    │
        │  ┌──────────┬───────────┼──────────┬─────┐  │
        │  │ Ask Aida │ Morning   │ Alert    │ FHIR│  │
        │  │ (LLM)    │ digest    │ router   │ sync│  │
        │  │          │ generator │          │     │  │
        │  └──────────┴───────────┴──────────┴─────┘  │
        │                                              │
        └────────────────────┬─────────────────────────┘
                             │
        ┌────────────────────▼────────────────────────┐
        │     Command center web UI (intensivist /    │
        │     ward nurse station)                     │
        └─────────────────────────────────────────────┘
```

### 6.2 Tech stack

**Edge:**
- Hardware: NVIDIA Jetson Orin Nano 8GB Super Dev Kit (~$250) — primary; Rockchip RK3588 boards as cheaper alternative
- OS: Ubuntu 22.04 with JetPack 6.x
- Runtime: PyTorch + TensorRT (Jetson) or RKNN Toolkit (Rockchip)
- Frame ingestion: GStreamer / FFmpeg for RTSP
- Detection: YOLOv11 (Ultralytics, AGPL for dev; migrate to RF-DETR for commercial)
- Pose: YOLOv11-pose or RTMPose
- Tracking: ByteTrack
- OCR (monitor screens): PaddleOCR

**Cloud:**
- API: FastAPI (Python)
- Event bus: Redis with persistence
- Database: Postgres (events, state, audit log); MinIO/S3 (clips)
- LLM: Claude Sonnet 4.5 (Ask Aida primary), Gemini 2.5 Flash (high-volume scene checks, OCR fallback), Qwen2.5-VL-72B via OpenRouter (fallback)
- Inference for VLM scene checks: hosted APIs in v1; self-hosted in v2

**Frontend:**
- Command center: Next.js + TypeScript + TanStack Query, Tailwind
- Bedside tablet: extending existing app (assumed React Native or PWA)

**Video calling:**
- LiveKit (open-source WebRTC, self-hostable) or Jitsi Meet (open-source, self-hostable)
- NOT Google Meet (AINA's choice) — we want self-hosted for data sovereignty and cost

**Integrations:**
- EMR: HL7 FHIR R4 via Postgres-backed FHIR server (HAPI FHIR) or direct DB writes per customer
- PACS: DICOMweb (WADO-RS, QIDO-RS) for imaging retrieval
- Auth: Keycloak (OIDC/SAML) for hospital SSO
- Alerts: Firebase Cloud Messaging (push), Twilio (SMS), WhatsApp Business API

### 6.3 Data model (simplified)

```
Patient
  id, mrn, name, age, sex, admission_date, current_diagnosis, fall_risk_flag, ...

Bed
  id, ward_id, bed_number, camera_id, current_patient_id, zone_polygon

Camera
  id, hospital_id, rtsp_url, status, last_frame_ts

Event
  id, patient_id, bed_id, event_type (V-01..V-10), severity, confidence,
  detected_at, source (vision/audio/ocr/manual), 
  clip_path (optional), vlm_description (optional),
  charted (bool), signed_off_by (clinician_id), signed_off_at

Transcript  (from existing ambient layer)
  id, patient_id, recorded_at, raw_audio_path, structured_note, speakers[]

VitalSign
  id, patient_id, measured_at, hr, bp_sys, bp_dia, spo2, rr, source (ocr/manual/device)

Alert
  id, event_id, severity, recipient_role, sent_at, acknowledged_at, acknowledged_by

ClinicianAction
  id, clinician_id, patient_id, action_type, action_data, occurred_at
```

---

## 7. UX requirements (mapped to AINA reference)

### 7.1 Branding and identity

We need our own branded equivalent of AINA. Suggested working name: **"Aida"** (Ambient Intelligence Doctor's Aide). Final naming TBD.

Visual identity contrasts: AINA uses a glowing blue orb avatar. Our equivalent should be visually distinct (different geometry, different color palette, ideally one that reads well in both dark and light themes). Avoid the medical-cliché clipart aesthetic.

### 7.2 Critical interaction patterns from AINA we should replicate

1. **The unified overlay.** AINA's interface overlays on top of the camera view rather than living in a separate window. This is critical for clinician muscle memory — they can see the patient and the intelligence in one glance. Replicate.

2. **The "Take me there" red CTA on critical alerts.** Big, unmissable, one-tap navigation to the bed. Replicate.

3. **The dismiss-able timeline annotations.** Yellow banner for warnings ("No movement detected for the last 3 hours") with explicit dismiss control. Replicate.

4. **The phone-icon-on-camera-view bedside call.** Tap-to-call directly from the camera view. Replicate but use Jitsi/LiveKit not Google Meet.

5. **The pre-loaded patient summary in the Ask AI panel.** Saves the clinician from re-reading the chart. Replicate.

6. **The auto-chart confirmation toast.** "The bedside nurse has been informed" / "Change in patient position has been detected and automatically charted." Replicate — this builds trust in the AI by showing what it did.

7. **The X-ray retrieval inline.** Pull imaging into the conversation without leaving the workflow. Replicate (DICOMweb integration).

### 7.3 Interaction patterns we should improve on AINA

1. **AINA's interface is dense and could overwhelm a less-experienced clinician.** We should default to a calmer view with progressive disclosure — show critical info first, expand for detail. Configurable density.

2. **AINA's morning briefing isn't shown in the demo.** Our morning digest is a key differentiator — make it the first screen a clinician sees when they start a shift.

3. **AINA's multi-tile grid maxes out at 6 visible.** A ward nurse in an Indian public hospital might need to see 20 beds at once. Support up to 25 tiles with smart prioritization.

4. **AINA doesn't show audio context.** Our ambient transcripts should be surfaced inline on the timeline alongside vision events.

---

## 8. Build plan and milestones

### 8.1 Six-week v0 (already scoped in earlier work)

Already detailed — API-first stack, single-bed working demo, staged video for proof-of-concept. Output: working laptop demo + 5-minute video.

### 8.2 Six-month v1 (production pilot-ready)

**Month 1: Vision pipeline hardening**
- All five core events (V-01 to V-05) running with measured precision/recall on UR Fall, LookDeep, Le2i datasets
- Monitor OCR pipeline working on Philips IntelliVue and Mindray screens
- Edge box ported to Jetson Orin Nano with TensorRT
- Local event buffer with cloud resync

**Month 2: Command center UI**
- Multi-bed grid view, single-bed expanded view, timeline, Ask Aida panel
- Auth, RBAC, audit log
- Telegram/WhatsApp alert routing
- Bedside call via Jitsi (initial integration)

**Month 3: Ambient integration**
- Vision events fused with ambient transcripts in unified timeline
- Audio→vision sensitivity modification
- Morning digest generation
- Auto-charting pipeline with sign-off flow

**Month 4: EMR/PACS integrations**
- HL7 FHIR R4 write-back (one reference EMR — likely the hospital's existing one or a HAPI FHIR sandbox)
- DICOMweb integration for X-ray retrieval (one reference PACS)
- Bedside tablet extensions

**Month 5: First hospital pilot**
- Deploy in 1 pilot hospital (target: 50–100 beds)
- Initial cohort: tier-1 private chain (Manipal/Apollo innovation arm) for data quality, OR one state district hospital via PM-ABHIM/CSR for target customer fit
- 4-week observation, then iterate

**Month 6: Pilot evaluation and v1 GA**
- Measure clinical KPIs (see section 9)
- Iterate based on pilot feedback
- v1 GA release for next 2–5 hospital deployments

### 8.3 Twelve-month v2 (scale)

- Edge-first inference (cost compression)
- Fine-tuned models on collected pilot data
- rPPG + respiratory rate
- Multi-tenant SaaS
- Gulf market entry (UAE first)
- Mobile native apps

---

## 9. Success metrics

### 9.1 Clinical KPIs (must beat baseline)

| Metric | Baseline (no system) | v1 target |
|---|---|---|
| Time to clinician response on critical event | 8–20 min | < 3 min |
| Falls per 1000 patient-days | 5–10 | < 2 |
| Vitals charting completeness | 60–80% | > 95% |
| Time spent on routine charting per nurse-shift | 2–3 hours | < 1 hour |
| Sentinel events missed in first hour | varies | < 5% |

These align with what AINA implicitly claims (30% nursing efficiency gain, 40% documentation reduction in their RADAR platform).

### 9.2 Product KPIs

| Metric | v1 target |
|---|---|
| Beds deployed | 200+ (cumulative across pilots) |
| Active hospitals | 3+ |
| Daily active clinicians | 100+ |
| Average events flagged per bed per day | 8–15 |
| False positive rate on critical events | < 10% |
| Auto-chart acceptance rate (signed off as-is) | > 70% |
| Ask Aida queries per clinician per day | > 5 |

### 9.3 Business KPIs

| Metric | v1 target (12-month) |
|---|---|
| Cumulative pilots signed | 3 |
| Cumulative paying deployments | 1+ |
| ARR (annualized) | $100K–$300K |
| Per-bed gross margin | > 60% |

---

## 10. Risks and open questions

### 10.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudphysician/AINA enters our market segment (public hospitals) | Medium | High | Move fast on PM-ABHIM/CSR distribution; build moat via Indian-ward dataset |
| Indian public hospital procurement cycles too slow | High | Medium | Parallel-track private chain pilots and Gulf market |
| Vision precision/recall not clinically acceptable | Medium | High | Iterate on fine-tuning; clinical validation studies |
| EMR integration complexity blocks deployment | High | Medium | Build FHIR-native; offer parallel-EMR mode |
| Hospital IT pushback on edge box | Medium | Low | Use existing CCTV; keep edge box minimal footprint |
| Regulatory (CDSCO classification as medical device) | Medium | High | Engage regulatory consultant in month 4; design for SDLC compliance from start |
| Privacy/consent in Indian public sector | Low | High | Default to edge processing; never store raw video unless explicit consent |

### 10.2 Open questions

1. Final product name (Aida? Something else?)
2. Existing ambient/EHR product architecture details — exact API contract for vision event integration
3. First pilot hospital — Manipal/Apollo (private, data-rich) or state district hospital (target customer fit)?
4. Regulatory strategy — CDSCO clinical decision support classification or software-as-a-service exemption?
5. Pricing strategy — straight per-bed-per-month, or freemium with paid features?
6. Hardware partnership — direct sourcing of cameras for public hospitals, or pure software play?
7. India entity for billing public sector (GeM portal registration) vs Dubai entity for Gulf billing — how does this split?

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| AINA | Cloudphysician's Ambient AI co-pilot for ICU monitoring (the reference product) |
| Aida | Our working name for our equivalent (subject to change) |
| Bed-zone polygon | Manually-annotated polygon in the camera frame indicating which pixels are the bed |
| BoT / BoT-SORT | Multi-object tracking algorithm |
| ByteTrack | Multi-object tracking algorithm, default in Ultralytics |
| CCTV | Closed-circuit television — existing hospital security cameras |
| CHC | Community Health Centre — Indian public health facility |
| CodeBlue | Hospital emergency code for cardiac/respiratory arrest |
| CDSCO | Central Drugs Standard Control Organization — Indian medical device regulator |
| DICOMweb | Web-based DICOM imaging access protocol |
| DPDP Act | India's Digital Personal Data Protection Act 2023 |
| EHR / EMR | Electronic Health Record / Electronic Medical Record |
| EPAP / IPAP | Ventilator settings (expiratory and inspiratory positive airway pressure) |
| FHIR | Fast Healthcare Interoperability Resources — modern healthcare data standard |
| HL7 | Health Level 7 — healthcare data standard family |
| Jetson Orin Nano | NVIDIA edge AI computer |
| NETRA | Cloudphysician's computer vision module (part of RADAR/AINA) |
| NIV | Non-Invasive Ventilation |
| OCR | Optical Character Recognition |
| PACS | Picture Archiving and Communication System — hospital imaging archive |
| PM-ABHIM | Pradhan Mantri Ayushman Bharat Health Infrastructure Mission — Indian govt health infra fund |
| pro BNP | NT-proBNP — heart failure biomarker |
| PTZ | Pan-Tilt-Zoom (camera) |
| Qwen2.5-VL | Alibaba's open-source vision-language model |
| RADAR | Cloudphysician's broader platform (AINA is one component) |
| RTSP | Real Time Streaming Protocol — camera streaming standard |
| RTMPose | Real-time pose estimation model |
| rPPG | remote photoplethysmography — heart rate from video |
| WoB | Work of Breathing |
| YOLOv11 | Latest YOLO object detection model from Ultralytics |

---

## Appendix B: Reference media

- Cloudphysician AINA product demo video (analyzed for this PRD)
- Cloudphysician website: cloudphysician.ai
- Cloudphysician Google Cloud customer story (publicly available)
- LookDeep AI-NORMS-2024 dataset and paper (Frontiers, 2025) — for vision pipeline reference

---

**End of PRD v0.1**
