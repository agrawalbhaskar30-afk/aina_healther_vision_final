// Mock event payload + helpers.

const EVENT = {
  id: "E-2847",
  type: "VITALS_OUT_OF_RANGE",
  label: "SpO\u2082 trending down",
  severity: "critical",
  patient: { name: "George Vattoli", bed: "ICU-2", mrn: "5821974", admission: "Post-op AAA repair d3" },
  firedAt: "07:14:23",
  firedAtFull: "07:14:23 AM",
  firedAgo: "23m ago",
  source: "Bedside Cam 1 · Monitor OCR",
  clipMeta: "Auto-saved evidence clip · 1080p · captured from Bedside Cam 1",
  reviewStatus: "Unreviewed",
  interpretation: {
    paragraphs: [
      "SpO\u2082 dropped from 99% to 94% over the last 30 minutes — a 5-point decline that exceeds the warning threshold.",
      "Patient is in bed and appears to be resting; the VLM scene check at 07:14:25 noted no visible signs of acute distress.",
      "However, absence of staff for 2h 14m combined with this decline warrants attention. Possible considerations: positional desaturation, oxygen interruption, or early respiratory compromise. Recommend in-person assessment.",
    ],
    confidence: 0.6,
    confidenceLabel: "Moderate",
    citations: [
      { icon: "trend", label: "SpO\u2082 trend 06:44\u201307:14" },
      { icon: "camera", label: "VLM 07:14:25" },
      { icon: "user",   label: "Staff absence 2h 14m" },
    ],
  },
  contextEvents: [
    { time: "07:08", offset: "\u22126m", label: "Position change",          severity: "info" },
    { time: "07:14", offset: "0",       label: "SpO\u2082 trending down",   severity: "critical", isCurrent: true },
    { time: "07:18", offset: "+4m",     label: "Aida assessment generated", severity: "info" },
    { time: "07:21", offset: "+7m",     label: "Nurse paged",               severity: "info" },
  ],
  notes: [
    {
      author: "Dr. Mehta",
      time: "07:25",
      text:
        "Visited bedside, patient stable, no intervention needed. SpO\u2082 recovered to 97% after repositioning. Likely positional desat.",
    },
  ],
  trace: [
    { t: "07:14:13", kind: "ok",   text: "SpO\u2082 reading: 99% (within range)" },
    { t: "07:14:23", kind: "warn", text: "SpO\u2082 reading: 94% (within range, but trend detected)" },
    { t: "07:14:23", kind: "warn", text: "Rolling 30-min trend: \u22125% (threshold: \u22123%)" },
    { t: "07:14:23", kind: "crit", text: "Triggering VITALS_OUT_OF_RANGE \u2014 slope criterion met" },
    { t: "07:14:23", kind: "crit", text: "Severity: Critical (drop > 4% within 30min)" },
    { t: "07:14:23", kind: "meta", text: "VLM scene check: requested" },
    { t: "07:14:25", kind: "meta", text: "VLM response: \u201Cpatient appears restful, no visible distress, no staff present\u201D" },
    { t: "07:14:25", kind: "meta", text: "Event published to bus" },
    { t: "07:14:25", kind: "meta", text: "Alert routed to: assigned nurse (Bed ICU-2), on-call physician" },
  ],
};

// Vitals window: 10 minutes, every 10s. Index 0 = -5min, index 60 = event, index 60 = mid.
// We'll generate deterministic series.
function genVitals() {
  const points = 61; // 10 min @ 10s = 60 intervals + 1 endpoint
  const out = { hr: [], spo2: [], rr: [], times: [] };
  // Time axis: -5:00 to +5:00 relative to event, label every minute
  for (let i = 0; i < points; i++) {
    const tSec = -300 + i * 10; // -300 .. +300
    out.times.push(tSec);

    // HR: drifts 72-78 slightly, tiny rise after event
    const hrBase = 73 + Math.sin(i * 0.18) * 1.2;
    const hrPost = tSec > 0 ? 1.1 * (tSec / 300) : 0;
    out.hr.push(+(hrBase + hrPost + (i % 7 === 0 ? 0.4 : 0)).toFixed(1));

    // SpO2: starts 99, falls roughly linearly to 94 by the event, holds, slow recover after
    let sp;
    if (tSec <= 0) {
      const f = (tSec + 300) / 300; // 0 at -5min, 1 at event
      sp = 99 - 5 * f;
    } else {
      // hold at 94 then climb back
      const f = tSec / 300; // 0..1 over +5min
      sp = 94 + 1.6 * f;
    }
    sp += Math.sin(i * 0.55) * 0.15;
    out.spo2.push(+sp.toFixed(1));

    // RR: 17-19
    out.rr.push(+(18 + Math.sin(i * 0.34) * 0.7).toFixed(1));
  }
  return out;
}
const VITALS = genVitals();

Object.assign(window, { EVENT, VITALS });
