# Bedside AI Assistant — Vision Layer v0 Plan

**Goal:** Add a vision layer to the existing ambient/EHR bedside assistant that can monitor patients between rounds and enrich documentation during rounds. Build the v0 entirely on hosted APIs first; port to edge hardware later once the product logic is validated.

**Positioning:** A NETRA-equivalent (Cloudphysician's CV module) that's built on top of an existing ambient assistant — making it strictly more capable than any audio-only or vision-only competitor.

---

## 1. What the system does

### Two camera roles

| Role | Source | Duty cycle | Purpose |
|---|---|---|---|
| **Round camera** | Bedside tablet front cam | On only during rounds | Augment ambient documentation: capture surgical sites, patient appearance, monitor screens, what the doctor points at |
| **Monitoring camera** | Hospital CCTV / IP camera (RTSP) | Continuous, 24/7 | Autonomous monitoring between rounds: falls, out-of-bed, staff visits, agitation, vital sign OCR |

### v0 feature set (six features that work bulletproof)

1. **Person detection + tracking** in each bed zone
2. **Bed-zone state machine** — in bed / sitting on edge / out of bed / on floor
3. **Fall detection** — real-time + post-fall confirmation
4. **Staff presence + time-since-last-visit** per bed
5. **Bedside monitor OCR** — heart rate, SpO2, BP, RR pulled into EHR
6. **Audio-vision fusion** — round transcript modifies monitoring sensitivity per bed
7. **Morning digest** (the killer feature) — overnight summary per patient, generated from vision events + audio transcripts + OCR'd vitals

### Alert tiers

- **Critical (red):** fall, vitals critical, prolonged unresponsiveness → push to nurse phone + station + on-call doctor
- **Warning (amber):** pre-fall posture, prolonged agitation, no-staff-visit-2h → assigned nurse only
- **Informational (blue):** logged to patient timeline, surfaced in morning digest

---

## 2. The API-first architecture

```
                   ┌─────────────────────┐
                   │ Camera source       │
                   │ (RTSP / tablet cam) │
                   └──────────┬──────────┘
                              │
                  ┌───────────▼────────────┐
                  │ Local motion detector  │
                  │ (OpenCV, free, CPU)    │
                  │ Background subtraction │
                  └───────────┬────────────┘
                              │ motion event OR
                              │ scheduled tick (30s)
                              ▼
        ┌──────────────────────────────────────────┐
        │ Frame router (Python)                    │
        │ Decides: which API to call, how often    │
        └──────┬─────────────┬──────────────┬──────┘
               │             │              │
       ┌───────▼──────┐ ┌────▼────┐ ┌──────▼───────┐
       │ Detection    │ │ VLM     │ │ OCR          │
       │ (Roboflow /  │ │ (Claude/│ │ (Gemini /    │
       │  Replicate)  │ │  Gemini)│ │  Mistral)    │
       └───────┬──────┘ └────┬────┘ └──────┬───────┘
               │             │              │
               └─────────────▼──────────────┘
                             │
                  ┌──────────▼───────────┐
                  │ State machine        │
                  │ (Python, in-memory)  │
                  │ Bed zones, timers,   │
                  │ event detection      │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │ Event bus            │
                  │ (FastAPI + Redis)    │
                  └──────┬───────────┬───┘
                         │           │
         ┌───────────────▼─┐    ┌────▼────────────────┐
         │ Existing        │    │ Alert dispatcher    │
         │ ambient/EHR     │    │ (Telegram, push,    │
         │ backend         │    │  WhatsApp, SMS)     │
         └─────────────────┘    └─────────────────────┘
```

---

## 3. Tech stack — API-first version

### Vision-language models (smart layer)

| Provider | Model | Best for | Pricing |
|---|---|---|---|
| Anthropic | Claude Sonnet 4.5 | Event confirmation, morning digest, structured JSON output | $3 / $15 per Mtok |
| Anthropic | Claude Opus 4.7 | Highest-quality reasoning when needed | Higher tier |
| Google | Gemini 2.5 Flash | Cheap continuous monitoring, native video input (up to ~1hr) | ~$0.075 / $0.30 per Mtok |
| Google | Gemini 2.5 Pro | Higher accuracy when Flash isn't enough | Mid tier |
| OpenAI | GPT-4.1 / GPT-5 | Fallback / comparison | Mid-high tier |
| OpenRouter | Qwen2.5-VL-72B | Test what your future edge model behavior looks like | Cheap, ~$0.40-0.80 per Mtok |

**Default choice for v0:** Gemini 2.5 Flash for routine scene checks, Claude Sonnet 4.5 for event confirmation and the morning digest.

### Detection / pose

| Provider | What | Pricing |
|---|---|---|
| Roboflow Hosted Inference | Any YOLO model, fine-tunable | ~$0.0001–0.001 per call |
| Replicate | Any HF model (YOLO, pose, etc.) | Per-second compute |
| Hugging Face Inference Endpoints | Dedicated endpoints | Per-hour |
| Google Cloud Vision API | Object/face/OCR detection (Cloudphysician's choice) | Per call, expensive at scale |

**Default choice for v0:** Roboflow Hosted Inference with a generic YOLOv11 endpoint. Migrate to a fine-tuned model on Roboflow once you have ~1,000 labeled hospital frames.

### OCR

| Option | Use case |
|---|---|
| Claude/Gemini directly | v0 default — they're good enough at monitor screens |
| Google Cloud Vision OCR | When you need higher reliability |
| Mistral OCR API | Newer, cheap, good quality |
| AWS Textract | For paper charts and structured forms |

### Audio (already in your stack)

Whisper / faster-whisper / WhisperX (you already have this).

### Backend

- **FastAPI** — API layer
- **Redis** — event bus, caching, pub/sub
- **Postgres** — events, patient state, audit log (SQLite fine for v0)
- **MinIO or S3** — short clips of high-priority events for review

### Frontend

- **Streamlit** for v0 dashboard (build in a day)
- **Next.js** for v1

---

## 4. Frame rates and call budget

### Frequency by task

| Task | Frequency | Why |
|---|---|---|
| Local motion detection (OpenCV) | 5–10 fps | Free, runs locally, only triggers API calls |
| Detection API call | On motion event, max 1 per 10 sec per bed | Cost control |
| VLM scene check | Every 60 sec OR event-triggered | Most expensive, use sparingly |
| Monitor OCR | Every 30–60 sec | Vitals don't change fast |
| VLM event confirmation | On suspected fall / critical event | Burst priority |
| Morning digest | Once per patient per day at round time | Batch overnight events |

### Cost estimate per bed per day

Assumptions: 16 motion-triggered API calls per hour, 1 VLM scene check per minute, 1 OCR per minute, 1 morning digest per day.

- **Detection (Roboflow):** ~400 calls/day × $0.001 = $0.40
- **VLM scene checks (Gemini Flash, ~500 tokens in/out per call):** ~1,440 calls/day × ~$0.0003 = $0.43
- **OCR (Gemini Flash):** ~1,440 calls/day × ~$0.0002 = $0.29
- **Event confirmation (Claude Sonnet):** ~10 calls/day × ~$0.005 = $0.05
- **Morning digest (Claude Sonnet, ~5K tokens):** ~$0.04

**Total: ~$1.20 per bed per day, ~$36 per bed per month.**

This is high but acceptable for v0 (you're proving the product, not optimizing cost). Edge deployment in v1 brings this near zero.

---

## 5. The state machine — concrete event logic

```python
EVENTS = {
    "PATIENT_OUT_OF_BED": {
        "trigger": "person centroid outside bed_zone for >3s",
        "alert": "info",
        "action": "log + increment counter",
    },
    "PATIENT_ON_FLOOR": {
        "trigger": "person bbox below bed_floor_line + horizontal posture + 5s",
        "alert": "critical",
        "action": "save 30s clip + VLM confirm + page nurse + escalate",
    },
    "PRE_FALL_RISK_POSTURE": {
        "trigger": "legs over edge of bed AND patient.fall_risk == True",
        "alert": "warning",
        "action": "notify assigned nurse",
    },
    "NO_STAFF_VISIT": {
        "trigger": "no staff-classified person in bed_zone for >2h",
        "alert": "warning",
        "action": "notify nurse station + log compliance",
    },
    "VITALS_OUT_OF_RANGE": {
        "trigger": "OCR'd HR or SpO2 outside thresholds for 3 consecutive readings",
        "alert": "critical or warning depending on values",
        "action": "alert nurse + auto-write to EHR via existing system",
    },
    "AGITATION_HIGH": {
        "trigger": "motion magnitude > threshold for >10 minutes",
        "alert": "info",
        "action": "log + flag for delirium screening",
    },
    "AMBIENT_TRIGGERED_WATCH": {
        "trigger": "round transcript contains 'fall risk' / 'watch closely' / 'restless'",
        "alert": "n/a",
        "action": "raise sensitivity for that bed for 24h",
    },
}
```

### The unique audio→vision fusion

When the doctor says during the round: *"Patient in bed 4 is a fall risk, keep close watch overnight"*, your existing ambient system already transcribes this. New behavior: this transcript is parsed for monitoring intent and modifies the state machine sensitivity for bed 4 for the next 24 hours.

This is the feature no one else has. Vision-only systems can't do it. Audio-only systems can't do it.

---

## 6. The morning digest — your killer feature

At round time, the doctor opens the bedside tablet and sees, per patient:

> **Patient 4B — Day 3 post-cholecystectomy**
> 
> Overnight summary (10pm – 8am):
> - Sleep: 4.2 hours estimated, fragmented
> - Out of bed: 12 events (high — likely toileting frequency)
> - Vitals trend: HR 88→102 between 3–5am, SpO2 stable 96–98%
> - Agitation peak: 3:14am, 22 minutes duration
> - Staff visits: 4 (last at 5:50am)
> - No falls, no critical events
> - Audio note from night nurse at 3:20am: "Patient complained of pain, given paracetamol IV"
>
> **AI suggestion:** Consider checking for UTI given urinary frequency + nighttime tachycardia.

Generated by passing all the events + transcripts + OCR'd vitals to Claude Sonnet 4.5 with a structured prompt. ~$0.05 per patient per day. This sells itself.

---

## 7. Six-week build plan (API-first)

### Week 1 — Skeleton + first API calls
- Set up Python project, FastAPI, Redis, SQLite
- Get a single RTSP stream working (use any IP camera or even OBS streaming a video file)
- OpenCV motion detection running locally
- Wire up first API call: send a motion-triggered frame to Gemini Flash, ask "describe what's happening, is anyone on the floor?"
- **Output:** A script that watches a video stream and prints AI descriptions when motion happens

### Week 2 — Detection + state machine
- Add Roboflow Hosted Inference for YOLO person/bed detection
- Define bed_zone polygons (manual setup per camera, one-time)
- Implement the state machine for in-bed / sitting-on-edge / out-of-bed / on-floor
- Test on UR Fall Dataset clips streamed as fake RTSP
- **Output:** Reliable bed-state detection on test footage

### Week 3 — OCR + multi-event handling
- Add monitor OCR via Gemini Flash (or Mistral OCR)
- Implement staff-vs-patient role classification (use Claude Sonnet — pass detected person crops with the question "is this person hospital staff or a patient/visitor")
- Add the staff-presence timer
- Build Redis event bus + event publisher
- **Output:** Five of the six core events firing correctly

### Week 4 — Integration with existing ambient/EHR system
- Define event API contract between vision module and your existing backend
- Implement the audio→vision sensitivity change feature
- Build the morning digest generator (Claude Sonnet 4.5 with structured prompt over events + transcripts)
- **Output:** Unified patient timeline and first morning digest

### Week 5 — Demo dashboard + alert routing
- Streamlit dashboard: grid view of all beds, live event feed, morning digest preview
- Telegram bot for instant alerts (fastest path to working push notifications)
- Add Twilio/WhatsApp Business for production-grade alerts later
- **Output:** End-to-end working system on a laptop

### Week 6 — Stage data + demo video
- Stage 2-hour video shoot, scripted scenarios:
  - Fall (3 variations)
  - Out of bed → return to bed (2x)
  - Sitting on edge (pre-fall posture)
  - Attendant arrival
  - No-staff-for-2-hours
  - Doctor round (with audio for fusion test)
  - Agitation/restlessness
  - Multiple patients in frame
- Run system against staged footage end-to-end
- Produce a 5-minute demo video for hospital pitches
- **Output:** Working demo + recorded demo video + numbers (precision/recall per event)

---

## 8. Where data comes from

### Public datasets (no permission needed) for validation

| Dataset | Purpose | Where |
|---|---|---|
| UR Fall Detection | Fall benchmark | fenix.ur.edu.pl/~mkepski/ds/uf.html |
| Le2i Fall Detection | Indoor falls (request access) | le2i.cnrs.fr |
| LookDeep AI-NORMS-2024 | Hospital ward footage with annotations | github.com/lookdeep/ai-norms-2024 |
| MultiCam Fall | Multi-camera fall scenarios | researchgate / paper authors |
| TST Fall Detection v2 | Falls with depth + skeletal data | available on request |
| MIMIC-IV | Open ICU data (text/EHR, not video) | physionet.org |
| eICU Collaborative Research DB | ICU data for context | physionet.org |

### Your own pilot data — the moat

Three options in priority order:

1. **One private hospital partner** (Manipal, Apollo, Fortis innovation arms; Aster/NMC in Dubai) — free deployment in exchange for anonymized footage and a data-sharing agreement
2. **Self-collected staged data** — rent a hospital room mockup, hire actors, ~$5K for hundreds of hours of high-quality labeled scenarios
3. **Medical college partnership** (AIIMS, JIPMER, KEM, ICT-adjacent) — co-author a paper, they let you collect data; slow but high clinical credibility

### Annotation tooling
- CVAT (self-hosted, full-featured)
- Label Studio (easier setup)
- Roboflow (best free tier for small projects)

---

## 9. What's possible vs. what's in v0

### Capabilities possible with current AI (the dream space)

**Easy:** person detection, presence, posture, fall detection, equipment detection, monitor OCR, paper chart OCR, visitor counting, staff visits, hand hygiene, basic agitation, scene description (VLM)

**Medium:** detailed activity recognition, IV/oxygen mask state, multi-bed cross-camera tracking, respiratory rate from chest motion, action recognition, pain estimation from face

**Hard / research-grade:** rPPG (heart rate from face video), cyanosis/pallor detection, predictive deterioration from multimodal trends, fine-grained behavior classification

### What's in v0 (the buildable subset)

Tier 1 — six core features listed in section 1, plus the morning digest.

### What's in v1 (months 3–6)

- Restlessness/agitation scoring (proper)
- IV pole and oxygen mask detection
- Hand hygiene compliance
- Visitor counting and after-hours alerts
- Migration to fine-tuned models on collected hospital data
- Edge deployment path (Jetson) for cost reduction

### What's in v2+ (year 2)

- rPPG and respiratory rate
- Pain estimation
- Cross-camera patient tracking
- Predictive deterioration

---

## 10. The competitive wedge — why this works

| Dimension | Cloudphysician (NETRA) | You |
|---|---|---|
| Cameras | PTZ, human-piloted from Bengaluru | Fixed CCTV (existing) + bedside tablet |
| AI hosting | Google Cloud Vision API | Hosted APIs (v0) → edge inference (v1) |
| Audio integration | None | Native (existing ambient layer) |
| Alerting | Through human intensivist team | Direct AI → nurse, optional human layer |
| Per-bed cost | High (clinician hours bundled) | Low (software-first, optional services) |
| Target customer | Tier-2 private hospitals | Public hospitals, step-down wards, Gulf |
| Killer feature | Remote intensivist availability | Morning digest + audio-vision fusion |

The structural advantages:
1. **You already have the hardware in the room** (tablet)
2. **You already have audio context** (ambient transcripts modify vision sensitivity)
3. **You can use existing CCTV** (zero hardware cost for monitoring layer)
4. **API-first means fast iteration** (no edge deployment until product-market fit)

---

## 11. API keys you'll need before Week 1

- Anthropic API key (claude.com/api)
- Google AI Studio key (aistudio.google.com) for Gemini
- Roboflow account (roboflow.com) — free tier covers v0
- Optional: Replicate, Hugging Face, OpenAI for comparison testing
- Telegram bot token (BotFather, free) for alerts

---

## 12. Open questions to resolve before Week 1

1. What's the existing ambient/EHR backend stack? (Need to define event API contract)
2. What patients/scenarios do hospital partners care most about? (Falls vs vitals vs staff compliance — this prioritizes which event to perfect first)
3. Tablet hardware: Android or iPad? (Affects how round camera integration works)
4. First pilot target — Indian public hospital, Indian private chain, or Gulf hospital? (Affects what data you'll have access to)
5. Budget for staged data shoot in Week 6? (~$2-5K range)
