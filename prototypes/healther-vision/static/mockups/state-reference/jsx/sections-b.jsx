/* global React, Icon, AidaMark, SectionHead, Variant */
// Aida State Reference — Sections 6-10

const { useState: useStateB, useEffect: useEffectB, useRef: useRefB } = React;

// ============================================================
// SECTION 6 — Critical alert handling
// ============================================================
function CriticalAlerts() {
  const [audioVisible, setAudioVisible] = useStateB(true);

  // Cycle the audio indicator for the demo
  useEffectB(() => {
    const i = setInterval(() => setAudioVisible((v) => !v), 3000);
    return () => clearInterval(i);
  }, []);

  return (
    <section id="s6" className="ref-section">
      <SectionHead
        num="06"
        tag="Escalation"
        title="Critical alert handling"
        desc="A genuinely critical event is allowed to break Aida's calm posture. The chrome stays steady; the alert itself owns the red. We earn the clinician's eye by spending it rarely."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Variant name="Critical row in active alerts" caption="list item · 4px stripe · rose-50">
          <div className="crit-row">
            <span className="stripe" />
            <div className="top">
              <span className="ico"><Icon name="shieldAlert" size={14} /></span>
              <span className="label">Fall confirmed</span>
              <span className="sep">·</span>
              <span className="time">07:46:12</span>
              <span className="conf">conf 0.97</span>
            </div>
            <div className="msg">Patient on floor — left side of bed</div>
            <div className="sub">
              No staff in room for 8 minutes prior. HR rising (78 → 96 bpm in 40s).
            </div>
            <div className="actions">
              <button className="a-btn primary">
                <Icon name="bell" size={11} strokeWidth={2} />
                Respond now
              </button>
              <button className="a-btn">Acknowledge</button>
              <button className="a-btn">Open review</button>
            </div>
          </div>
        </Variant>

        <Variant name="Critical modal — FALL_CONFIRMED" caption="centered · scrim · Esc to dismiss">
          <div className="crit-modal-stage">
            <div className="scrim-hint" />
            <span className="stage-label">scrim · 40% black</span>
            <div className="crit-modal" role="dialog" aria-labelledby="crit-title">
              <div className="head">
                <div className="top-line">
                  <span className="pip">
                    <Icon name="shieldAlert" size={10} strokeWidth={2.5} />
                    Critical
                  </span>
                  <span className="esc">
                    Dismiss <kbd>Esc</kbd>
                  </span>
                </div>
                <h3 id="crit-title">Fall confirmed — Bed ICU-04</h3>
                <p className="sub">07:46:12 · 14 seconds ago · conf 0.97</p>
              </div>
              <div className="body">
                <div className="grid">
                  <span className="k">Patient</span>
                  <span className="v txt">Margaret Chen · 67F · MRN 4837210</span>
                  <span className="k">Detected</span>
                  <span className="v txt">Patient on floor, left of bed (Bedside Cam 1)</span>
                  <span className="k">Last vitals</span>
                  <span className="v">HR 96 bpm · BP 124/82 · SpO₂ 95% · RR 22</span>
                  <span className="k">Staff in room</span>
                  <span className="v txt">None — last visit 07:38 (8 min ago)</span>
                </div>
              </div>
              <div className="foot">
                <button className="btn-ghost">Acknowledge</button>
                <span className="spacer" />
                <button className="btn-sec">Open review</button>
                <button className="btn-pri">
                  <Icon name="bell" size={13} strokeWidth={2} />
                  Respond now
                </button>
              </div>
            </div>
          </div>
        </Variant>

        <Variant name="Audio cue indicator" caption="single tone on fire · indicator visible 2s">
          <div style={{
            background: "var(--surface-2)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 22,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            minHeight: 72,
          }}>
            <div style={{
              opacity: audioVisible ? 1 : 0,
              transform: audioVisible ? "translateY(0)" : "translateY(-4px)",
              transition: "opacity 200ms ease-out, transform 200ms ease-out",
            }}>
              <div className="audio-cue">
                <span className="wave">
                  <span className="bar" /><span className="bar" /><span className="bar" />
                  <span className="bar" /><span className="bar" />
                </span>
                <span>Audio alert played</span>
              </div>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
              {audioVisible ? "visible · 2s window" : "hidden"}
            </div>
          </div>
        </Variant>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 7 — Theme transitions
// ============================================================
function ThemeTransitions() {
  return (
    <section id="s7" className="ref-section">
      <SectionHead
        num="07"
        tag="Theme"
        title="Theme transitions"
        desc="Light ↔ dark crossfade is a single 150ms ease-out on background and text color. Severity hues, charts, and brand teal must all remain legible on either side."
      />

      <div className="theme-demo">
        <div className="theme-pane light">
          <div className="pane-lbl">Light · default shift</div>
          <ThemeDemoChart light />
          <div className="demo-card">
            <div className="lbl">HR · bedside cam OCR</div>
            <div className="num">72<span className="unit"> bpm</span></div>
          </div>
          <div className="swatches">
            <span className="sw brand">Brand</span>
            <span className="sw crit">Crit</span>
            <span className="sw warn">Warn</span>
            <span className="sw succ">OK</span>
          </div>
        </div>
        <div className="theme-pane dark">
          <div className="pane-lbl">Dark · night shift</div>
          <ThemeDemoChart />
          <div className="demo-card">
            <div className="lbl">HR · bedside cam OCR</div>
            <div className="num">72<span className="unit"> bpm</span></div>
          </div>
          <div className="swatches">
            <span className="sw brand">Brand</span>
            <span className="sw crit">Crit</span>
            <span className="sw warn">Warn</span>
            <span className="sw succ">OK</span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 20,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        fontSize: 12, color: "var(--fg-2)",
      }}>
        <FactRow k="Duration" v="150ms" />
        <FactRow k="Easing" v="ease-out" />
        <FactRow k="Properties" v="background-color, color" />
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="r-btn"
          onClick={() => {
            const r = document.documentElement;
            const next = r.getAttribute("data-theme") === "dark" ? "light" : "dark";
            r.setAttribute("data-theme", next);
            try { localStorage.setItem("aida-ref-theme", next); } catch {}
          }}
        >
          <Icon name="moon" size={13} />
          Toggle whole page
        </button>
      </div>
    </section>
  );
}

function ThemeDemoChart({ light = false }) {
  // Same dataset rendered with theme-appropriate strokes
  const w = 280, h = 50;
  const data = [62, 63, 65, 64, 66, 68, 67, 70, 72, 74, 73, 72, 71, 72, 73, 74, 76, 78, 76, 75];
  const min = 58, max = 82;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / (max - min)) * (h - 6) - 3]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`)).join(" ");
  const brand = light ? "#0F766E" : "#2DD4BF";
  const crit  = light ? "#E11D48" : "#F43F5E";
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {/* grid line */}
      <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke={light ? "#E7E5E4" : "#292524"} strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={brand} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* a critical marker */}
      <circle cx={pts[16][0]} cy={pts[16][1]} r="3" fill={crit} stroke={light ? "#fff" : "#1C1C1B"} strokeWidth="1.5" />
    </svg>
  );
}

function FactRow({ k, v }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 3,
      padding: "10px 12px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--fg-3)",
      }}>{k}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12,
        color: "var(--fg-1)",
      }}>{v}</span>
    </div>
  );
}

// ============================================================
// SECTION 8 — Density variations
// ============================================================
function DensityVariations() {
  const densities = [
    { id: "compact",     name: "Compact",     meta: "−1 step · tight rows" },
    { id: "default",     name: "Default",     meta: "baseline · clinician default" },
    { id: "comfortable", name: "Comfortable", meta: "+1 step · accessibility" },
  ];

  const alerts = [
    { t: "07:46", sev: "crit", lbl: "Fall confirmed — left of bed" },
    { t: "07:31", sev: "warn", lbl: "RR rising · 14 → 22 over 40 min" },
    { t: "07:14", sev: "warn", lbl: "Patient out of bed for 1m 22s" },
    { t: "06:58", sev: "info", lbl: "Nurse R. Okafor entered room" },
  ];

  return (
    <section id="s8" className="ref-section">
      <SectionHead
        num="08"
        tag="Preferences"
        title="Density variations"
        desc="A user setting in preferences. Type size shifts one step in either direction; row padding adjusts proportionally. Numerical hierarchy and tabular alignment are preserved across all three."
      />

      <div className="density-demo">
        {densities.map((d) => (
          <div key={d.id} className="density-row">
            <div className="d-lbl">
              <span className="name">{d.name}</span>
              <span className="meta">{d.meta}</span>
            </div>
            <div className="d-body">
              <div className={`d-vital ${d.id}`}>
                <div className="head">HR</div>
                <div className="num">72<span className="unit">bpm</span></div>
              </div>
              <div className={`d-list ${d.id}`}>
                {alerts.map((a) => (
                  <div key={a.t + a.lbl} className="d-row">
                    <span className="t">{a.t}</span>
                    <span className={`sev ${a.sev}`} />
                    <span className="lbl">{a.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// SECTION 9 — Accessibility highlights
// ============================================================
function AccessibilityHighlights() {
  return (
    <section id="s9" className="ref-section">
      <SectionHead
        num="09"
        tag="A11y"
        title="Accessibility highlights"
        desc="Aida ships to clinicians who may use keyboards, screen readers, or have reduced-motion preferences set system-wide. None of these flips a 'simpler' mode — they refine the existing one."
      />

      <div className="a11y-grid">
        <div className="a11y-card">
          <div className="ttl">Focus rings</div>
          <div className="desc">2px brand-teal ring at 50% opacity with 2px offset. Visible only on keyboard focus (<code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>:focus-visible</code>).</div>
          <div className="demo">
            <button type="button" className="focus-btn">Acknowledge</button>
            <input className="focus-input" placeholder="Search patients…" readOnly />
          </div>
        </div>

        <div className="a11y-card">
          <div className="ttl">Skip-to-content</div>
          <div className="desc">First focusable element on every page. Appears above the top bar when tabbed, hidden otherwise.</div>
          <div className="demo" style={{ alignItems: "center", justifyContent: "center" }}>
            <a className="skip-link" href="#main">
              <Icon name="arrowRight" size={12} strokeWidth={2.5} />
              Skip to main content
            </a>
          </div>
        </div>

        <div className="a11y-card">
          <div className="ttl">Contrast on severity colors</div>
          <div className="desc">All four semantic tokens meet WCAG AAA against their tinted backgrounds in both themes.</div>
          <div className="demo" style={{ gap: 6 }}>
            <ContrastRow tone="crit" label="Critical · CRIT" ratio="7.2:1" />
            <ContrastRow tone="warn" label="Warning · WARN" ratio="6.4:1" />
            <ContrastRow tone="succ" label="Success ·  OK " ratio="6.9:1" />
            <ContrastRow tone="info" label="Info · INFO" ratio="7.0:1" />
          </div>
        </div>

        <div className="a11y-card">
          <div className="ttl">Reduced motion</div>
          <div className="desc">When <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>prefers-reduced-motion: reduce</code> is set, all non-essential animation is removed. Counters always animate instantly regardless.</div>
          <div className="demo">
            <div className="motion-list" style={{ width: "100%" }}>
              <ReducedRow label="Live-pill pulse" defaultV="2.4s loop" reducedV="none" />
              <ReducedRow label="Now-line pulse" defaultV="2.4s loop" reducedV="none" />
              <ReducedRow label="Theme crossfade" defaultV="150ms ease" reducedV="0ms" />
              <ReducedRow label="Modal entrance" defaultV="120ms ease" reducedV="0ms" />
              <ReducedRow label="Number counters" defaultV="instant" reducedV="instant" same />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContrastRow({ tone, label, ratio }) {
  return (
    <div className="contrast-row">
      <span className={`swatch ${tone}`}>{label}</span>
      <span className="ratio">{ratio}</span>
      <span className="badge">AAA</span>
    </div>
  );
}

function ReducedRow({ label, defaultV, reducedV, same = false }) {
  return (
    <div className="m-row">
      <span>{label}</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <span className={`v ${same ? "" : "strike"}`}>{defaultV}</span>
        <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>→</span>
        <span className="v">{reducedV}</span>
      </span>
    </div>
  );
}

// ============================================================
// SECTION 10 — Mobile responsive snapshot (tablet width)
// ============================================================
function TabletSnapshot() {
  const [fabOpen, setFabOpen] = useStateB(false);
  return (
    <section id="s10" className="ref-section">
      <SectionHead
        num="10"
        tag="Responsive"
        title="Tablet snapshot — 768px"
        desc="A hint of how the live monitor reflows at tablet width. The right Ask Aida rail collapses into a floating action button; the vitals 2×2 grid stays; video remains dominant."
      />

      <div className="tablet-frame">
        <div className="bar"><div className="speaker" /></div>
        <div className="tablet-screen">
          <div className="tablet-topbar">
            <span style={{ color: "var(--brand)", display: "inline-flex" }}><AidaMark size={18} /></span>
            <span className="name">Margaret Chen</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>
              Bed ICU-04 · 67F
            </span>
            <span className="right">
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--fg-1)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                Live
              </span>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--brand)", color: "var(--fg-on-brand)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 600,
              }}>RP</span>
            </span>
          </div>
          <div className="tablet-content">
            <div className="tablet-video">
              <div className="placeholder" />
              <div className="live">
                <span className="rec" /> REC · CAM 1
              </div>
              {/* Tiny pretend overlay */}
              <svg viewBox="0 0 480 270" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <rect x="240" y="120" width="120" height="50" fill="none" stroke="#2dd4bf" strokeWidth="1.2" />
                <rect x="240" y="106" width="76" height="14" rx="2" fill="rgba(15,118,110,0.92)" />
                <text x="246" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#f0fdfa">patient · 0.94</text>
              </svg>
            </div>
            <div className="tablet-side">
              <div className="tablet-vitals">
                <div className="tablet-vital">
                  <div className="h">HR</div>
                  <div className="n">72<span className="u">bpm</span></div>
                </div>
                <div className="tablet-vital">
                  <div className="h">SpO₂</div>
                  <div className="n">96<span className="u">%</span></div>
                </div>
                <div className="tablet-vital">
                  <div className="h">BP</div>
                  <div className="n">118<span style={{ fontSize: 12, color: "var(--fg-3)", margin: "0 1px" }}>/</span>76</div>
                </div>
                <div className="tablet-vital">
                  <div className="h">RR</div>
                  <div className="n">14<span className="u">/min</span></div>
                </div>
              </div>
              <div className="tablet-alerts">
                <div className="h">Active alerts · 2</div>
                <div className="row"><span className="dot warn" /><span>RR rising · 40m</span><span className="t">07:31</span></div>
                <div className="row"><span className="dot warn" /><span>Out of bed · 1m 22s</span><span className="t">07:14</span></div>
              </div>
            </div>
          </div>

          {/* Floating Ask Aida button */}
          <button
            type="button"
            className="tablet-fab"
            onClick={() => setFabOpen((o) => !o)}
            aria-label="Open Ask Aida"
          >
            <AidaMark size={22} />
            <span className="badge-num">3</span>
          </button>

          {fabOpen && (
            <div style={{
              position: "absolute",
              bottom: 70, right: 14,
              width: 260,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-2)",
              padding: 12,
              fontSize: 11.5,
              color: "var(--fg-1)",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: "var(--brand)",
                marginBottom: 6,
              }}>Aida</div>
              <div style={{ lineHeight: 1.5 }}>
                Patient is stable. RR has trended up over the last 40 minutes — still within normal range.
              </div>
              <div style={{
                marginTop: 8, paddingTop: 8,
                borderTop: "1px solid var(--border)",
                fontSize: 10, color: "var(--fg-3)",
                fontFamily: "var(--font-mono)",
              }}>
                Tap mark to expand
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "center", gap: 16,
        marginTop: 16,
        fontSize: 11, color: "var(--fg-3)",
        fontFamily: "var(--font-mono)",
      }}>
        <span>viewport 768 × 480 (hint)</span>
        <span>·</span>
        <span>video flex 1 · side rail 280px</span>
        <span>·</span>
        <span>FAB 48px · bottom-right</span>
      </div>
    </section>
  );
}

Object.assign(window, {
  CriticalAlerts, ThemeTransitions, DensityVariations,
  AccessibilityHighlights, TabletSnapshot,
});
