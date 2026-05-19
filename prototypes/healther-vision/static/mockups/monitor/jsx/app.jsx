/* global React, ReactDOM, Icon, AidaMark, useTheme,
   TopBar, PatientStrip,
   LeftColumn, CenterColumn, RightColumn */
// Main app — wires state, the modal, and the three columns.

(function () {
try {

const { useState, useEffect, useMemo } = React;

// ----- Mock data (per spec) ----------------------------------
const INITIAL_PATIENT = {
  name: "George Vattoli",
  age: 58,
  sex: "M",
  mrn: "A-49231",
  bed: "ICU-2",
  diagnosis: "Day 4 post-cholecystectomy",
  status: "Stable",
  codeStatus: "Full Code",
};

const VITALS = {
  hr:   { value: 72,       unit: "bpm",  trend: "down", source: "Monitor OCR", lastUpdate: "2s ago",
          // Stable around 70-74, slight rise at end with the SpO2 event
          spark: [70,70,71,71,72,71,70,71,71,72,71,72,72,73,72,72,73,72,72,72,72] },
  bp:   { value: "118/76", unit: "mmHg", trend: "flat", source: "Monitor OCR", lastUpdate: "2s ago",
          // Very stable, slight dip then return
          spark: [120,120,119,118,118,117,117,118,118,119,118,118,117,118,118,118,118,118,118,118,118] },
  spo2: { value: 94,       unit: "%",    trend: "down", source: "Monitor OCR", lastUpdate: "2s ago", warning: true,
          // The story: stable 99 for first 3 hours, then steady decline starting at index 14 (≈30 min ago)
          spark: [99,99,99,99,98,99,99,98,99,99,99,98,99,99,98,97,96,95,95,94,94] },
  rr:   { value: 18,       unit: "/min", trend: "flat", source: "Monitor OCR", lastUpdate: "2s ago",
          spark: [17,18,18,17,18,18,17,18,18,18,18,17,18,18,18,18,18,18,18,18,18] },
};

const BED_STATE   = { state: "In bed", confidence: 0.94, confirmedAgo: "2s" };
const STAFF_STATE = { present: false, lastVisitAgo: "2h 14m", lastVisitTime: "5:12 AM", absenceMinutes: 134 };

const INITIAL_ALERTS = [
  { id: 1, severity: "warning",  message: "No movement detected for 3 hours",                 time: "1h 02m ago" },
  { id: 2, severity: "critical", message: "SpO₂ trending down — 99 → 94 over 30 min",         time: "18m ago" },
];

const TIMELINE_EVENTS = [
  { id: 1, type: "STAFF_VISIT_STARTED",     severity: "info",     ago: "3h 12m", label: "Staff visit",          desc: "Charge nurse entered the room",        time: "04:18 AM" },
  { id: 2, type: "POSITION_CHANGE",         severity: "info",     ago: "2h 50m", label: "Position change",      desc: "Patient repositioned (assisted)",       time: "04:40 AM" },
  { id: 3, type: "STAFF_VISIT_ENDED",       severity: "info",     ago: "2h 18m", label: "Staff visit ended",    desc: "Last logged staff presence",            time: "05:12 AM" },
  { id: 4, type: "VITAL_READING_ACCEPTED",  severity: "info",     ago: "1h 45m", label: "Vitals accepted",      desc: "OCR confidence 0.96",                   time: "05:45 AM" },
  { id: 5, type: "NO_MOVEMENT_SUSTAINED",   severity: "warning",  ago: "1h 02m", label: "No movement detected", desc: "3h cumulative immobility threshold",    time: "06:28 AM" },
  { id: 6, type: "VITALS_OUT_OF_RANGE",     severity: "critical", ago: "18m",    label: "SpO₂ trending down",   desc: "99% → 94% over 30 min",                  time: "07:14 AM" },
  { id: 7, type: "POSITION_CHANGE",         severity: "info",     ago: "4m",     label: "Position change",      desc: "Patient shifted (unassisted)",          time: "07:28 AM" },
];

// ----- Event modal -------------------------------------------
function EventModal({ event, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!event) return null;

  const sev = event.severity;
  const sevLabel = sev === "critical" ? "Critical" : sev === "warning" ? "Warning" : "Info";

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="head">
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: `var(--${sev === "info" ? "info" : sev})`,
            display: "inline-block",
          }} />
          <span className="ttl">{event.label}</span>
          <span className="meta">{event.type}</span>
          <button
            type="button"
            className="btn sm tertiary icon"
            aria-label="Close"
            onClick={onClose}
            style={{ marginLeft: 8 }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="body">
          <div className="field-row">
            <span className="k">Time</span>
            <span className="v mono">{event.time} · {event.ago} ago</span>
          </div>
          <div className="field-row">
            <span className="k">Severity</span>
            <span className="v">
              <span style={{
                display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                background: `var(--${sev === "info" ? "info" : sev})`,
                marginRight: 8, verticalAlign: "middle",
              }} />
              {sevLabel}
            </span>
          </div>
          <div className="field-row">
            <span className="k">Source</span>
            <span className="v mono">Bedside Cam 1 · rule engine</span>
          </div>
          <div className="field-row">
            <span className="k">Description</span>
            <span className="v">{event.desc}</span>
          </div>
          <div className="field-row">
            <span className="k">Confidence</span>
            <span className="v mono">0.94</span>
          </div>
        </div>
        <div className="foot">
          <span className="note">Stub — full Event Review pending</span>
          <span className="actions">
            <button type="button" className="btn sm secondary" onClick={onClose}>Dismiss</button>
            <button type="button" className="btn sm primary" onClick={onClose}>Open in review</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// ----- App ---------------------------------------------------
function App() {
  const [theme, setTheme] = useTheme();
  const [patient, setPatient] = useState(INITIAL_PATIENT);
  const [alerts, setAlerts]   = useState(INITIAL_ALERTS);
  const [filters, setFilters] = useState(new Set(["all"]));
  const [activeCam, setActiveCam] = useState("bedside-1");
  const [openEvent, setOpenEvent] = useState(null);
  const [showVideoToast, setShowVideoToast] = useState(true);
  const [aidaOpen, setAidaOpen] = useState(true);

  function cycleStatus(next) {
    setPatient((p) => ({ ...p, status: next }));
  }
  function dismissAlert(id) {
    setAlerts((a) => a.filter((x) => x.id !== id));
  }
  function reviewAlert(a) {
    const ev = TIMELINE_EVENTS.find((e) => e.message === a.message)
            || TIMELINE_EVENTS.find((e) => e.severity === a.severity);
    if (ev) setOpenEvent(ev);
  }

  const toastAlert = showVideoToast
    ? (alerts.find((a) => a.severity === "warning") || alerts[0])
    : null;

  return (
    <div className="app-shell">
      <TopBar theme={theme} setTheme={setTheme} />
      <PatientStrip patient={patient} onStatusChange={cycleStatus} />

      <div className={"body" + (aidaOpen ? "" : " aida-closed")}>
        <LeftColumn
          bedState={BED_STATE}
          staffState={STAFF_STATE}
          vitals={VITALS}
          alerts={alerts}
          onDismissAlert={dismissAlert}
          onReview={reviewAlert}
        />
        <CenterColumn
          activeCam={activeCam}
          onCamChange={setActiveCam}
          toastAlert={toastAlert}
          onDismissToast={() => setShowVideoToast(false)}
          events={TIMELINE_EVENTS}
          vitals={VITALS}
          filters={filters}
          setFilters={setFilters}
          onEventClick={setOpenEvent}
        />
        <RightColumn open={aidaOpen} onToggle={() => setAidaOpen((o) => !o)} />
      </div>

      {openEvent && <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

} catch (e) {
  const r = document.getElementById("root");
  if (r) r.innerHTML = '<pre style="padding:24px;font-family:monospace;font-size:12px;color:#E11D48;white-space:pre-wrap;line-height:1.4;">RENDER ERROR\n\n' + ((e && (e.stack || e.message)) || String(e)) + '</pre>';
  throw e;
}
})();
