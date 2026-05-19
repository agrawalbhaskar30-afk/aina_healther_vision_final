/* global React, Icon, ICURoomScene, DetectionOverlay */
// Center column: video feed with overlays + event timeline.

const { useState: useStateCenter, useRef: useRefCenter, useEffect: useEffectCenter } = React;

// ----- Camera source dropdown ---------------------------------
const CAMERAS = [
  { id: "bedside-1", label: "Bedside Cam 1", group: "Live" },
  { id: "wall-wide", label: "Wall Cam (Wide)", group: "Live" },
];
const SWITCH_OPTS = [
  { id: "synthetic", label: "Switch to synthetic feed" },
  { id: "rtsp",      label: "Switch to RTSP stream…" },
  { id: "file",      label: "Switch to file…" },
];

function CameraDropdown({ active, onChange }) {
  const [open, setOpen] = useStateCenter(false);
  const activeLabel = CAMERAS.find((c) => c.id === active)?.label
                    || SWITCH_OPTS.find((c) => c.id === active)?.label
                    || "Camera";
  return (
    <div className="cam-dropdown">
      <button
        type="button"
        className="cam-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name="video" size={14} className="cam-ico" />
        <span>{activeLabel}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <>
          <div className="popover-catch" onClick={() => setOpen(false)} />
          <div className="cam-menu" role="listbox">
            <div className="group">Live</div>
            {CAMERAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`item ${c.id === active ? "active" : ""}`}
                onClick={() => { onChange(c.id); setOpen(false); }}
              >
                <Icon name="video" size={13} />
                <span style={{ flex: 1 }}>{c.label}</span>
                {c.id === active && <Icon name="check" size={13} className="check" />}
              </button>
            ))}
            <div className="sep" />
            <div className="group">Source</div>
            {SWITCH_OPTS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`item ${c.id === active ? "active" : ""}`}
                onClick={() => { onChange(c.id); setOpen(false); }}
              >
                <Icon name="refresh" size={13} />
                <span style={{ flex: 1 }}>{c.label}</span>
                {c.id === active && <Icon name="check" size={13} className="check" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ----- Video feed --------------------------------------------
function VideoFeed({
  activeCam,
  onCamChange,
  toastAlert,
  onDismissToast,
}) {
  return (
    <div className="video-card">
      <div className="video-stage">
        <ICURoomScene variant={activeCam} />
        <DetectionOverlay />

        {/* Top-left: active event toast */}
        {toastAlert && (
          <div className="vid-tl">
            <div className="vid-event-toast" role="status">
              <span className="dot" />
              <span>{toastAlert.message}</span>
              <button
                type="button"
                className="x"
                aria-label="Dismiss"
                onClick={onDismissToast}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Top-right: camera dropdown */}
        <div className="vid-tr">
          <CameraDropdown active={activeCam} onChange={onCamChange} />
        </div>

        {/* Bottom-left: live badge */}
        <div className="vid-bl">
          <span className="live-badge">
            <span className="rec" />
            LIVE · 1080p · 23 fps
          </span>
        </div>

        {/* Bottom-right: small ops */}
        <div className="vid-br">
          <button type="button" className="vid-iconbtn" aria-label="Audio" title="Toggle audio">
            <Icon name="mic" size={14} />
          </button>
          <button type="button" className="vid-iconbtn" aria-label="Fullscreen" title="Fullscreen">
            <Icon name="expand" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Event timeline (swim-lane) ----------------------------
// Catmull-Rom -> cubic Bezier helper for smooth trace curves.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function parseAgo(s) {
  let m = 0;
  const hm = s.match(/(\d+)\s*h/);
  if (hm) m += parseInt(hm[1], 10) * 60;
  const mm = s.match(/(\d+)\s*m/);
  if (mm) m += parseInt(mm[1], 10);
  return m;
}

const LANES = [
  { id: "critical", label: "Critical", filterKey: "critical" },
  { id: "warning",  label: "Warning",  filterKey: "warning" },
  { id: "info",     label: "Events",   filterKey: "info" },
];

// Time tick definitions
const TL_TICKS = [
  { label: "4h ago", frac: 0,    pos: "first" },
  { label: "3h",     frac: 0.25, pos: "mid" },
  { label: "2h",     frac: 0.50, pos: "mid" },
  { label: "1h",     frac: 0.75, pos: "mid" },
  { label: "Now",    frac: 1,    pos: "last" },
];

function EventTimelinePanel({ events, vitals, filters, setFilters, onEventClick }) {
  const [hovered, setHovered] = useStateCenter(null);
  const [mutedTraces, setMutedTraces] = useStateCenter(new Set());

  function fracForAgo(mins) { return Math.max(0, Math.min(1, (240 - mins) / 240)); }

  // Bucket events by lane (severity)
  const byLane = { critical: [], warning: [], info: [] };
  events.forEach((e) => {
    const lane = e.severity === "critical" ? "critical"
              : e.severity === "warning" ? "warning"
              : "info";
    byLane[lane].push(e);
  });

  function isVisible(e) {
    if (filters.has("all")) return true;
    if (e.type.includes("VITAL") && filters.has("vitals")) return true;
    return filters.has(e.severity);
  }
  function toggleFilter(key) {
    const next = new Set(filters);
    if (key === "all") { next.clear(); next.add("all"); }
    else {
      next.delete("all");
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) next.add("all");
    }
    setFilters(next);
  }

  function toggleTrace(key) {
    const next = new Set(mutedTraces);
    if (next.has(key)) next.delete(key); else next.add(key);
    setMutedTraces(next);
  }

  // Vital traces — brand teal for HR, semantic colors for the rest.
  const traces = [
    { key: "hr",   data: vitals.hr.spark,   color: "var(--brand)",   label: "HR",   value: vitals.hr.value + " bpm" },
    { key: "bp",   data: vitals.bp.spark,   color: "var(--info)",    label: "BP",   value: vitals.bp.value },
    { key: "spo2", data: vitals.spo2.spark, color: "var(--warning)", label: "SpO₂", value: vitals.spo2.value + "%" },
    { key: "rr",   data: vitals.rr.spark,   color: "var(--fg-2)",    label: "RR",   value: vitals.rr.value + "/min" },
  ];

  // SVG viewBox for the vitals lane
  const VW = 1000, VH = 48;
  const traceTop = 4, traceBot = VH - 4;
  const traceH = traceBot - traceTop;

  function tracePoints(data) {
    if (!data || data.length < 2) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(max - min, 0.01);
    const n = data.length;
    return data.map((v, i) => {
      const x = (i / (n - 1)) * VW;
      const y = traceBot - ((v - min) / span) * traceH;
      return [x, y];
    });
  }

  const counts = {
    all: events.length,
    critical: events.filter((e) => e.severity === "critical").length,
    warning:  events.filter((e) => e.severity === "warning").length,
    info:     events.filter((e) => e.severity === "info").length,
    vitals:   events.filter((e) => e.type.includes("VITAL")).length,
  };

  return (
    <div className="tl-card">
      <div className="tl-head">
        <div className="tl-title">
          <span className="ttl">Event timeline</span>
          <span className="rng">last 4 hours · {events.length} events</span>
        </div>
        <div className="tl-legend">
          {traces.map((t) => (
            <span
              className={"leg" + (mutedTraces.has(t.key) ? " muted" : "")}
              key={t.key}
              onClick={() => toggleTrace(t.key)}
              title={mutedTraces.has(t.key) ? `Show ${t.label}` : `Hide ${t.label}`}
            >
              <span className="leg-line" style={{ background: t.color }} />
              <span className="leg-lbl">{t.label}</span>
              <span className="leg-val">{t.value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="tl-grid">
        {/* Now line — spans all rows, anchored to chart right edge */}
        <div className="tl-now" style={{ left: "calc(100% - 24px)" }}>
          <span className="tl-now-pulse" />
        </div>

        {/* Lane: Critical */}
        <div className="tl-label critical" style={{ gridRow: "1 / 2" }}>
          <span className="dot" /> Critical
        </div>
        <div className="tl-track" style={{ gridRow: "1 / 2" }}>
          <span className="tl-row-band critical" style={{ top: 2, bottom: 2 }} />
          <span className="baseline" />
          {byLane.critical.map((e) => {
            const frac = fracForAgo(parseAgo(e.ago));
            const visible = isVisible(e);
            return (
              <button
                key={e.id}
                type="button"
                className={`tl-mark critical big pulse${visible ? "" : " dim"}`}
                style={{ left: `${frac * 100}%` }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                onClick={() => onEventClick(e)}
                aria-label={`${e.label}, ${e.ago} ago`}
              >
                {hovered === e.id && (
                  <span className="tl-tip">
                    <span className="t-lbl">{e.label}</span>
                    <span className="t-time">{e.time} · {e.ago} ago</span>
                    {e.desc && <span className="t-desc">{e.desc}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lane: Warning */}
        <div className="tl-label warning" style={{ gridRow: "2 / 3" }}>
          <span className="dot" /> Warning
        </div>
        <div className="tl-track" style={{ gridRow: "2 / 3" }}>
          <span className="tl-row-band warning" style={{ top: 2, bottom: 2 }} />
          <span className="baseline" />
          {byLane.warning.map((e) => {
            const frac = fracForAgo(parseAgo(e.ago));
            const visible = isVisible(e);
            return (
              <button
                key={e.id}
                type="button"
                className={`tl-mark warning big${visible ? "" : " dim"}`}
                style={{ left: `${frac * 100}%` }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                onClick={() => onEventClick(e)}
                aria-label={`${e.label}, ${e.ago} ago`}
              >
                {hovered === e.id && (
                  <span className="tl-tip">
                    <span className="t-lbl">{e.label}</span>
                    <span className="t-time">{e.time} · {e.ago} ago</span>
                    {e.desc && <span className="t-desc">{e.desc}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lane: Events (info) */}
        <div className="tl-label info" style={{ gridRow: "3 / 4" }}>
          <span className="dot" /> Events
        </div>
        <div className="tl-track" style={{ gridRow: "3 / 4" }}>
          <span className="baseline" />
          {byLane.info.map((e) => {
            const frac = fracForAgo(parseAgo(e.ago));
            const visible = isVisible(e);
            return (
              <button
                key={e.id}
                type="button"
                className={`tl-mark info${visible ? "" : " dim"}`}
                style={{ left: `${frac * 100}%` }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                onClick={() => onEventClick(e)}
                aria-label={`${e.label}, ${e.ago} ago`}
              >
                {hovered === e.id && (
                  <span className="tl-tip">
                    <span className="t-lbl">{e.label}</span>
                    <span className="t-time">{e.time} · {e.ago} ago</span>
                    {e.desc && <span className="t-desc">{e.desc}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lane: Vitals (trace chart) */}
        <div className="tl-label vitals" style={{ gridRow: "4 / 5" }}>
          <span className="dot" /> Vitals
        </div>
        <div className="tl-track vitals-track" style={{ gridRow: "4 / 5" }}>
          <svg
            className="vitals-svg"
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Soft grid - the lane baseline at 50% */}
            <line
              x1="0" x2={VW}
              y1={VH / 2} y2={VH / 2}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              opacity="0.5"
            />
            {/* Hour tick guides */}
            {TL_TICKS.map((t, i) => (
              <line
                key={i}
                x1={t.frac * VW} x2={t.frac * VW}
                y1="2" y2={VH - 2}
                stroke="var(--border)"
                strokeDasharray="1.5 3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                opacity="0.4"
              />
            ))}
            {/* Vital traces */}
            {traces.map((t) => mutedTraces.has(t.key) ? null : (
              <path
                key={t.key}
                d={smoothPath(tracePoints(t.data))}
                fill="none"
                stroke={t.color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                opacity="0.65"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>

        {/* Time axis */}
        <div className="tl-axis" style={{ gridRow: "5 / 6" }}>
          {TL_TICKS.map((t) => (
            <React.Fragment key={t.label}>
              <span className="tick-mark" style={{ left: `${t.frac * 100}%` }} />
              <span
                className={`tick ${t.pos === "first" ? "first" : t.pos === "last" ? "last" : ""}`}
                style={{ left: `${t.frac * 100}%` }}
              >
                {t.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="tl-filters">
        {[
          { key: "all",      label: "All events", count: counts.all,      dot: null       },
          { key: "critical", label: "Critical",   count: counts.critical, dot: "critical" },
          { key: "warning",  label: "Warning",    count: counts.warning,  dot: "warning"  },
          { key: "info",     label: "Events",     count: counts.info,     dot: "info"     },
          { key: "vitals",   label: "Vitals only",count: counts.vitals,   dot: null       },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            className={`tl-chip ${filters.has(f.key) ? "active" : ""}`}
            onClick={() => toggleFilter(f.key)}
          >
            {f.dot && <span className={`ch-dot ${f.dot}`} />}
            <span>{f.label}</span>
            <span className="ch-count">{f.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
// ----- Center column composition -----------------------------
function CenterColumn(props) {
  return (
    <div className="col center">
      <VideoFeed
        activeCam={props.activeCam}
        onCamChange={props.onCamChange}
        toastAlert={props.toastAlert}
        onDismissToast={props.onDismissToast}
      />
      <EventTimelinePanel
        events={props.events}
        vitals={props.vitals}
        filters={props.filters}
        setFilters={props.setFilters}
        onEventClick={props.onEventClick}
      />
    </div>
  );
}

Object.assign(window, { CenterColumn });
