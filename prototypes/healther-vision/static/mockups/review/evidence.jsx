// Left column — evidence tabs: Video clip, Still frame, Vitals trend, Detection trace.

const { useState, useMemo } = React;

// --- Video tab -------------------------------------------------

function VideoClip() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  return (
    <div>
      <div className="video-stage">
        <div className="corner-tl">
          <span className="rec">
            <span className="rec-dot"></span>
            <span>EVIDENCE CLIP</span>
          </span>
        </div>
        <div className="corner-br">
          <span>Bedside Cam 1 · ICU-2 · 1080p</span>
        </div>
        {/* Faint room composition — a suggestion of a bed, no detail */}
        <div className="room-glyph">
          <svg width="62%" height="46%" viewBox="0 0 600 240" preserveAspectRatio="xMidYEnd meet" aria-hidden="true">
            {/* horizon line */}
            <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>
            {/* bed silhouette */}
            <rect x="120" y="150" width="360" height="14" rx="3" fill="rgba(255,255,255,0.07)"/>
            <rect x="120" y="164" width="360" height="32" rx="4" fill="rgba(255,255,255,0.05)"/>
            <rect x="130" y="124" width="80"  height="30" rx="6" fill="rgba(255,255,255,0.08)"/>
            {/* pole + monitor at side */}
            <line x1="500" y1="80" x2="500" y2="196" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            <rect x="478" y="84" width="44" height="30" rx="3" fill="rgba(255,255,255,0.10)"/>
          </svg>
        </div>
      </div>

      {/* Scrubber */}
      <Scrubber />

      {/* Playback controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn tertiary icon sm" aria-label="Previous frame"><ISkipBack size={14}/></button>
          <button
            className="btn primary sm"
            onClick={() => setPlaying((p) => !p)}
            style={{ width: 32, height: 32, padding: 0 }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <IPause size={14}/> : <IPlay size={14}/>}
          </button>
          <button className="btn tertiary icon sm" aria-label="Next frame"><ISkipFwd size={14}/></button>

          <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 6px" }}></span>

          <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="mono"
                style={{
                  height: 26,
                  padding: "0 9px",
                  fontSize: 11,
                  fontWeight: 500,
                  background: speed === s ? "var(--surface-2)" : "var(--surface)",
                  color: speed === s ? "var(--fg-1)" : "var(--fg-2)",
                  border: 0,
                  borderRight: s !== 2 ? "1px solid var(--border-strong)" : "0",
                  cursor: "pointer",
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <button className="btn secondary sm">
          <IDownload size={13}/>
          Download clip
        </button>
      </div>

      <div className="small fg-3" style={{ marginTop: 10 }}>
        {EVENT.clipMeta}
      </div>
    </div>
  );
}

function Scrubber() {
  const ticks = [
    { label: "−30s", pct: 0   },
    { label: "−20s", pct: 1/6 },
    { label: "−10s", pct: 2/6 },
    { label: "Event", pct: 0.5, hide: true },
    { label: "+10s", pct: 4/6 },
    { label: "+20s", pct: 5/6 },
    { label: "+30s", pct: 1   },
  ];
  return (
    <div className="scrubber">
      <div className="track">
        <div className="played"></div>
        {ticks.filter(t => !t.hide).map((t) => (
          <span key={t.label} className="tick" style={{ left: `${t.pct * 100}%` }}></span>
        ))}
        <span className="event-flag">07:14:23 · EVENT</span>
        <span className="event-line"></span>
        <span className="head"></span>
        {ticks.filter(t => !t.hide).map((t) => (
          <span key={t.label} className="tick-label" style={{ left: `${t.pct * 100}%` }}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}

// --- Still frame tab ------------------------------------------

function StillFrame() {
  return (
    <div>
      <div className="video-stage">
        <div className="corner-tl">
          <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "3px 8px" }}>
            STILL · FRAME @ EVENT
          </span>
        </div>
        <div className="corner-br">
          <span className="mono">07:14:23.847</span>
        </div>
        <div className="room-glyph">
          <svg width="62%" height="46%" viewBox="0 0 600 240" preserveAspectRatio="xMidYEnd meet" aria-hidden="true">
            <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>
            <rect x="120" y="150" width="360" height="14" rx="3" fill="rgba(255,255,255,0.08)"/>
            <rect x="120" y="164" width="360" height="32" rx="4" fill="rgba(255,255,255,0.06)"/>
            <rect x="130" y="124" width="80"  height="30" rx="6" fill="rgba(255,255,255,0.09)"/>
            <line x1="500" y1="80" x2="500" y2="196" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            <rect x="478" y="84" width="44" height="30" rx="3" fill="rgba(255,255,255,0.10)"/>
          </svg>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div className="mono small fg-2">Frame timestamp · 07:14:23.847 AM</div>
        <button className="btn secondary sm"><ISave size={13}/>Save image</button>
      </div>

      <div className="small fg-3" style={{ marginTop: 10 }}>
        Sampled at event publication · Source: Bedside Cam 1
      </div>
    </div>
  );
}

// --- Vitals trend tab -----------------------------------------

function VitalsTrend() {
  const w = 760, h = 280;
  const padL = 44, padR = 16, padT = 16, padB = 32;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // y ranges
  // We display all three lines on one chart but each has its own visual scale.
  // Use one shared %-axis for SpO2 (90–100), separate small ticks for HR/RR text labels in legend.
  // To keep it readable, we'll just plot SpO2 on real % scale, and normalize HR and RR into
  // a compatible visual band (sub-label-only ranges).
  const xs = VITALS.times;
  const xAt = (t) => padL + ((t + 300) / 600) * innerW;

  // SpO2 axis: 90..100
  const spo2Min = 90, spo2Max = 100;
  const spo2Y = (v) => padT + (1 - (v - spo2Min) / (spo2Max - spo2Min)) * innerH;
  // HR axis: 60..90 mapped over the same chart for layering
  const hrMin = 60, hrMax = 90;
  const hrY = (v) => padT + (1 - (v - hrMin) / (hrMax - hrMin)) * innerH;
  // RR axis: 12..24
  const rrMin = 12, rrMax = 24;
  const rrY = (v) => padT + (1 - (v - rrMin) / (rrMax - rrMin)) * innerH;

  const path = (vals, yFn) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(xs[i]).toFixed(1)},${yFn(v).toFixed(1)}`).join(" ");

  const yTicks = [90, 92, 94, 96, 98, 100];

  const [hover, setHover] = useState(null); // { x, idx }
  const onMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (w / rect.width);
    if (px < padL || px > w - padR) { setHover(null); return; }
    const tSec = ((px - padL) / innerW) * 600 - 300;
    const idx = Math.max(0, Math.min(xs.length - 1, Math.round((tSec + 300) / 10)));
    setHover({ idx });
  };

  const minuteMarks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  const colors = {
    hr:   getComputedStyle(document.documentElement).getPropertyValue("--critical").trim() || "#E11D48",
    spo2: getComputedStyle(document.documentElement).getPropertyValue("--brand").trim()    || "#0F766E",
    rr:   getComputedStyle(document.documentElement).getPropertyValue("--info").trim()     || "#0284C7",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div className="label-caps">Vitals · 10-min window</div>
          <div className="small fg-2" style={{ marginTop: 4 }}>
            06:09:23 – 07:19:23 · Event marker at 07:14:23
          </div>
        </div>
        <div className="mono small fg-3">Δt = 10s</div>
      </div>

      <div style={{ width: "100%", overflow: "hidden", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface)" }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={h}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          style={{ display: "block" }}
        >
          {/* Y grid + labels (SpO2 axis) */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={w - padR} y1={spo2Y(v)} y2={spo2Y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 96 ? "0" : "0"}/>
              <text x={padL - 8} y={spo2Y(v) + 3} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">{v}</text>
            </g>
          ))}
          {/* X ticks */}
          {minuteMarks.map((m) => (
            <g key={m}>
              <line x1={xAt(m * 60)} x2={xAt(m * 60)} y1={padT} y2={h - padB} stroke="var(--border)" strokeWidth="1" strokeDasharray={m === 0 ? "0" : "1 4"}/>
              <text x={xAt(m * 60)} y={h - padB + 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">
                {m === 0 ? "EVT" : (m > 0 ? `+${m}m` : `${m}m`)}
              </text>
            </g>
          ))}

          {/* Event vertical (red dashed) */}
          <line
            x1={xAt(0)} x2={xAt(0)}
            y1={padT - 2} y2={h - padB}
            stroke={colors.hr} strokeWidth="1.25" strokeDasharray="4 4"
          />

          {/* Threshold band (94 critical) - very faint */}
          <rect x={padL} y={spo2Y(94)} width={innerW} height={spo2Y(90) - spo2Y(94)} fill={colors.hr} opacity="0.06"/>

          {/* Lines */}
          <path d={path(VITALS.hr, hrY)}     fill="none" stroke={colors.hr}   strokeWidth="1.4" opacity="0.55"/>
          <path d={path(VITALS.rr, rrY)}     fill="none" stroke={colors.rr}   strokeWidth="1.4" opacity="0.55"/>
          <path d={path(VITALS.spo2, spo2Y)} fill="none" stroke={colors.spo2} strokeWidth="1.8"/>

          {/* Hover */}
          {hover && (() => {
            const i = hover.idx;
            const t = xs[i];
            const x = xAt(t);
            return (
              <g>
                <line x1={x} x2={x} y1={padT} y2={h - padB} stroke="var(--fg-3)" strokeWidth="1" />
                <circle cx={x} cy={spo2Y(VITALS.spo2[i])} r="3" fill={colors.spo2} stroke="var(--surface)" strokeWidth="1.5"/>
                <circle cx={x} cy={hrY(VITALS.hr[i])}     r="2.5" fill={colors.hr}   stroke="var(--surface)" strokeWidth="1.5"/>
                <circle cx={x} cy={rrY(VITALS.rr[i])}     r="2.5" fill={colors.rr}   stroke="var(--surface)" strokeWidth="1.5"/>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend + readout */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
        <div className="legend">
          <span className="swatch hr">HR <span className="mono fg-2" style={{ marginLeft: 4 }}>{hover ? VITALS.hr[hover.idx].toFixed(0) : VITALS.hr[30].toFixed(0)} bpm</span></span>
          <span className="swatch spo2">SpO₂ <span className="mono fg-2" style={{ marginLeft: 4 }}>{hover ? VITALS.spo2[hover.idx].toFixed(0) : 94} %</span></span>
          <span className="swatch rr">RR <span className="mono fg-2" style={{ marginLeft: 4 }}>{hover ? VITALS.rr[hover.idx].toFixed(0) : 18} /min</span></span>
        </div>
        <div className="mono tiny fg-3">
          {hover ? formatRel(xs[hover.idx]) : "Hover for readings"}
        </div>
      </div>

      <div className="small fg-3" style={{ marginTop: 12 }}>
        Source: Monitor OCR · Readings every 10s
      </div>
    </div>
  );
}

function formatRel(secs) {
  const abs = Math.abs(secs);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = secs < 0 ? "−" : (secs > 0 ? "+" : "");
  return `t = ${sign}${m}m ${String(s).padStart(2, "0")}s · ${secs === 0 ? "event" : ""}`.trim();
}

// --- Detection trace tab --------------------------------------

function DetectionTrace() {
  return (
    <div>
      <div className="small fg-2" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <ITerminal size={14}/>
        <span>Detection trace · for debugging and audit. Helpful for understanding why this event fired.</span>
      </div>

      <div className="trace">
        {EVENT.trace.map((row, i) => (
          <div key={i} className="step">
            <span className="ts">[{row.t}] </span>
            <span className={row.kind}>{row.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
        <div className="tiny fg-3">Rule: <span className="mono">vitals.slope.spo2 &lt; −3% / 30m</span> · Engine v4.18.2</div>
        <button className="btn tertiary sm"><ICopy size={13}/>Copy trace</button>
      </div>
    </div>
  );
}

// --- Tab shell -------------------------------------------------

function EvidencePanel() {
  const [tab, setTab] = useState("video");
  const tabs = [
    { id: "video",  label: "Video clip",         icon: IVideo,    sub: "30s before / 30s after" },
    { id: "still",  label: "Still frame",        icon: IImage,    sub: "Frame at event" },
    { id: "vitals", label: "Vitals trend",       icon: IActivity, sub: "10-min window" },
    { id: "trace",  label: "Detection trace",    icon: ITerminal, sub: "Inference log" },
  ];
  const active = tabs.find(t => t.id === tab);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="label-caps">Evidence</div>
          <div className="small fg-2">{active.sub}</div>
        </div>
        <div className="badge">
          <IPaperclip size={12}/>
          <span>3 sources</span>
        </div>
      </div>

      <div className="tabs" style={{ paddingLeft: 8, paddingRight: 8 }}>
        {tabs.map((t) => {
          const Ic = t.icon;
          return (
            <button
              key={t.id}
              className={"tab" + (tab === t.id ? " active" : "")}
              onClick={() => setTab(t.id)}
            >
              <Ic size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 20 }}>
        {tab === "video"  && <VideoClip />}
        {tab === "still"  && <StillFrame />}
        {tab === "vitals" && <VitalsTrend />}
        {tab === "trace"  && <DetectionTrace />}
      </div>
    </div>
  );
}

Object.assign(window, { EvidencePanel });
