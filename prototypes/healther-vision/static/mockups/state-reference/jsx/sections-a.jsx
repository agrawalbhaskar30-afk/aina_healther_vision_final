/* global React, Icon, AidaMark */
// Aida State Reference — Sections 1-5

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// ============================================================
// SECTION 1 — Connection states
// ============================================================
function ConnectionStates() {
  const variants = [
    {
      name: "Connected",
      caption: "default · stream ok · 23 fps",
      pill: (
        <span className="conn-pill">
          <span className="dot success pulse" />
          Live
        </span>
      ),
    },
    {
      name: "Reconnecting",
      caption: "transient · retrying every 2s",
      pill: (
        <span className="conn-pill warn">
          <span className="dot warning" />
          <span className="spinner" />
          Reconnecting…
        </span>
      ),
    },
    {
      name: "Degraded",
      caption: "stream up · bandwidth-limited",
      pill: (
        <span className="conn-pill warn">
          <span className="dot warning" />
          Low FPS <span className="meta">— 8 fps</span>
        </span>
      ),
    },
    {
      name: "Offline",
      caption: "no frames in 2m · backup queued",
      pill: (
        <span className="conn-pill crit">
          <span className="dot critical" />
          Offline <span className="meta">· last seen 2m ago</span>
        </span>
      ),
    },
    {
      name: "Initializing",
      caption: "first connect · pre-stream",
      pill: (
        <span className="conn-pill muted">
          <span className="dot gray" />
          <span className="spinner" />
          Initializing…
        </span>
      ),
    },
  ];

  return (
    <section id="s1" className="ref-section">
      <SectionHead
        num="01"
        tag="Status"
        title="Connection states"
        desc="The pill in the top bar communicates the health of the bedside camera stream. It never alarms — degraded states use amber, full loss uses red, but the rest of the chrome stays calm."
      />

      {/* Each row: full top-bar mock with the pill in its real position */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {variants.map((v) => (
          <div key={v.name} className="var">
            <div className="var-cap">
              <span className="name">{v.name}</span>
              <span className="meta">{v.caption}</span>
            </div>
            <div className="var-stage flush" style={{ background: "transparent", border: "none", padding: 0 }}>
              <MockTopBar trailing={v.pill} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockTopBar({ trailing }) {
  return (
    <div className="mock-topbar">
      <span className="mb-mark"><AidaMark size={20} /></span>
      <span className="mb-crumbs">
        <span className="seg">Wards</span>
        <span className="slash">/</span>
        <span className="seg">ICU-2</span>
        <span className="slash">/</span>
        <span className="seg current">Bed 4</span>
      </span>
      <span className="mb-spacer" />
      {trailing}
      <span className="mb-avatar">RP</span>
    </div>
  );
}

// ============================================================
// SECTION 2 — Bed state variations
// ============================================================
function BedStates() {
  const states = [
    { name: "In bed",            tone: "tone-success",  icon: "bed",         meta: "Confirmed 47s ago",  conf: "0.96", desc: "calm · default" },
    { name: "Sitting on edge",   tone: "tone-warning",  icon: "bed",         meta: "Detected 14s ago",   conf: "0.88", desc: "watch" },
    { name: "Out of bed",        tone: "tone-warning",  icon: "footprints",  meta: "Out for 1m 22s",      conf: "0.93", desc: "watch · pre-fall risk" },
    { name: "On floor",          tone: "tone-critical", icon: "shieldAlert", meta: "Detected 6s ago",     conf: "0.97", desc: "fall · escalate immediately", critical: true },
    { name: "Bed empty",         tone: "tone-neutral",  icon: "bed",         meta: "Patient off scene",   conf: "0.91", desc: "patient not present" },
    { name: "Unknown",           tone: "tone-mystery",  icon: "circle",      meta: "View obstructed",     conf: "0.42", desc: "low-confidence", mystery: true },
  ];

  return (
    <section id="s2" className="ref-section">
      <SectionHead
        num="02"
        tag="Detector"
        title="Bed state variations"
        desc="The bed-state card is the primary surface for Aida's spatial inference. Color tracks clinical urgency, never inference confidence — that's surfaced separately as a number."
      />

      <div className="var-grid cols-3">
        {states.map((s) => (
          <div key={s.name} className="var">
            <div className="var-cap">
              <span className="name">{s.name}</span>
              <span className="meta">{s.desc}</span>
            </div>
            <div className={`bed-card ${s.critical ? "tone-critical" : ""} ${s.tone === "tone-warning" ? "tone-warning" : ""}`}>
              <span className={`ico ${s.tone}`}>
                <Icon name={s.icon} size={16} />
              </span>
              <div className="txt">
                <span className="state">{s.name}</span>
                <span className="meta">{s.meta}</span>
              </div>
              <span className="conf">{s.conf}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// SECTION 3 — Empty states
// ============================================================
function EmptyStates() {
  return (
    <section id="s3" className="ref-section">
      <SectionHead
        num="03"
        tag="Zero data"
        title="Empty states"
        desc="When there's nothing to show, the panels stay quiet — never marketing copy, never illustration. Aida communicates the absence of signal as a fact, not a feature."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* No alerts */}
        <Variant name="No alerts" caption="alerts panel · zero active">
          <div className="empty-card clear">
            <span className="ico">
              <Icon name="check" size={16} strokeWidth={2} />
            </span>
            <div className="txt">
              <span className="ttl">All clear · No active alerts</span>
              <span className="sub">Last alert cleared 2h ago</span>
            </div>
          </div>
        </Variant>

        {/* No timeline events */}
        <Variant name="No timeline events" caption="last hour · no signal">
          <EmptyTimeline />
        </Variant>

        {/* No vitals yet */}
        <Variant name="No vitals yet" caption="post-connect · OCR warming">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["HR", "BP", "SpO₂", "RR"].map((lbl) => (
              <div key={lbl} className="vital-skel">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="lbl-skel skel pulse-only" />
                  <div style={{ marginLeft: "auto", width: 10, height: 8 }} className="skel pulse-only" />
                </div>
                <div className="num-skel skel pulse-only" />
                <div className="ft-skel skel pulse-only" />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
            Reading vitals from monitor… first frame in 3–5s.
          </div>
        </Variant>

        {/* No staff history */}
        <Variant name="No staff history" caption="staff card · pristine">
          <div className="bed-card">
            <span className="ico tone-neutral">
              <Icon name="userX" size={16} />
            </span>
            <div className="txt">
              <span className="state" style={{ color: "var(--fg-2)", fontWeight: 500 }}>No staff visits recorded yet</span>
              <span className="meta">Detection window: last 12h</span>
            </div>
          </div>
        </Variant>

        {/* Ask Aida — first message */}
        <Variant name="Ask Aida — first message" caption="assistant panel · cold state">
          <AskAidaCold />
        </Variant>
      </div>
    </section>
  );
}

function EmptyTimeline() {
  return (
    <div className="tl-empty">
      <div className="now" style={{ left: "78%" }}>
        <span className="now-lbl">now</span>
      </div>
      <div className="msg">No events in the last hour</div>
      <div className="axis">
        {["07:00", "07:15", "07:30", "07:45", "08:00"].map((t, i) => {
          const left = (i / 4) * 100;
          return (
            <React.Fragment key={t}>
              <span className="tick" style={{ left: `${left}%` }} />
              <span className="tick-label" style={{ left: `${left}%` }}>{t}</span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function AskAidaCold() {
  const chips = [
    "What's changed in the last 30 minutes?",
    "Any vitals trending out of range?",
    "Who last entered the room?",
    "Summarize the night shift",
  ];
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: 20,
      boxShadow: "var(--shadow-1)",
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 6,
          background: "var(--surface)", border: "1px solid var(--border)",
          color: "var(--brand)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <AidaMark size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>
            Aida
          </div>
          <div style={{ fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
            Patient is stable. HR 72, BP 118/76, SpO₂ 96%, RR 14. Last position change 23 minutes ago. No alerts in the past hour.
          </div>
          <div style={{ marginTop: 10, display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { ico: "activity", label: "Vitals 07:42" },
              { ico: "clock",    label: "Position 07:19" },
            ].map((c) => (
              <span key={c.label} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--fg-2)",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)", padding: "2px 8px",
              }}>
                <Icon name={c.ico} size={11} strokeWidth={1.75} /> {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8,
      }}>
        Suggested
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map((c) => (
          <button key={c} type="button" className="suggest-chip">{c}</button>
        ))}
      </div>

      <div style={{
        marginTop: 16, paddingTop: 12,
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          flex: 1,
          height: 34,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center",
          padding: "0 12px",
          fontSize: 12.5, color: "var(--fg-3)",
        }}>
          Ask Aida about this patient…
        </div>
        <button type="button" className="r-btn primary" disabled style={{ opacity: 0.5 }}>
          <Icon name="send" size={12} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 4 — Loading states
// ============================================================
function LoadingStates() {
  return (
    <section id="s4" className="ref-section">
      <SectionHead
        num="04"
        tag="In-flight"
        title="Loading states"
        desc="Loading should reassure, never spin endlessly without context. Always name the source (which camera, which monitor) and where possible, show progress."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Variant name="Video feed loading" caption="bedside cam · first connect">
          <div className="video-loading">
            <div className="grain" />
            <div className="mark-wrap"><AidaMark size={36} /></div>
            <div className="title-text">Connecting to Bedside Cam 1…</div>
            <div className="progress-bar"><div className="fill" /></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(245,245,244,0.45)" }}>
              Handshake · negotiating codec
            </div>
          </div>
        </Variant>

        <Variant name="Vitals card loading" caption="4-up · skeleton + subtle pulse">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["HR","BP","SpO₂","RR"].map((lbl, i) => (
              <div key={lbl} className="vital-skel">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "var(--fg-3)",
                  }}>{lbl}</div>
                </div>
                <div className="num-skel skel" style={{ animationDelay: `${i * 120}ms` }} />
                <div className="ft-skel skel" style={{ animationDelay: `${i * 120 + 80}ms` }} />
              </div>
            ))}
          </div>
        </Variant>

        <Variant name="Timeline loading" caption="lanes drawn · markers pending">
          <TimelineSkel />
        </Variant>

        <Variant name="Event review loading" caption="tabs visible · evidence pending">
          <ReviewSkel />
        </Variant>
      </div>
    </section>
  );
}

function TimelineSkel() {
  const lanes = [
    { lbl: "Critical", color: "var(--critical)" },
    { lbl: "Warning",  color: "var(--warning)" },
    { lbl: "Info",     color: "var(--info)" },
    { lbl: "Vitals",   color: "var(--fg-3)" },
  ];
  return (
    <div className="tl-skel">
      {lanes.map((l) => (
        <div key={l.lbl} className="row">
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--fg-3)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.color, opacity: 0.5 }} />
            {l.lbl}
          </div>
          <div className="lane">
            {/* Faint dotted "expected event positions" */}
            {[18, 38, 64, 82].map((pct) => (
              <span key={pct} style={{
                position: "absolute",
                left: `${pct}%`, top: "50%",
                width: 6, height: 6,
                background: "var(--border-strong)",
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                opacity: 0.6,
                animation: "skel-pulse 1.6s ease-in-out infinite",
                animationDelay: `${pct * 8}ms`,
              }} />
            ))}
          </div>
        </div>
      ))}
      <div className="axis-row">
        <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12 }}>
          <div />
          <div className="ticks">
            {["04:00","05:00","06:00","07:00","08:00"].map((t) => (
              <span key={t} className="t">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewSkel() {
  return (
    <div className="review-skel">
      <div className="tabs">
        <span className="tab active">Evidence</span>
        <span className="tab">Timeline</span>
        <span className="tab">Vitals context</span>
        <span className="tab">Notes</span>
      </div>
      <div className="body">
        <div className="spinner" />
        <div className="label">Loading evidence…</div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 5 — Error states
// ============================================================
function ErrorStates() {
  return (
    <section id="s5" className="ref-section">
      <SectionHead
        num="05"
        tag="Failure"
        title="Error states"
        desc="Aida tells clinicians what failed, what it's already doing about it, and what they can do next. Errors are never red unless a patient is at risk."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Variant name="Camera offline" caption="calm · self-recovery in progress">
          <CamOfflineError />
        </Variant>

        <Variant name="Failed note save" caption="toast · auto-retry then success">
          <ToastDemo />
        </Variant>

        <Variant name="API timeout" caption="banner · dismissible">
          <div className="ref-banner">
            <span className="ico"><Icon name="alert" size={15} /></span>
            <span className="body">
              <strong style={{ fontWeight: 600 }}>Aida is taking longer than usual to respond.</strong>{" "}
              Some data may be delayed.
            </span>
            <button type="button" className="x" aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        </Variant>
      </div>
    </section>
  );
}

function CamOfflineError() {
  return (
    <div className="cam-error">
      <span className="ico">
        <Icon name="camera" size={20} />
      </span>
      <h4>Bedside Cam 1 is offline</h4>
      <p>
        Aida is attempting to reconnect every 10 seconds.<br />
        Last successful frame: 07:42 (4 min ago)
      </p>
      <div className="actions">
        <button type="button" className="r-btn primary">
          <Icon name="refresh" size={13} strokeWidth={2} />
          Switch to backup camera
        </button>
        <button type="button" className="r-btn">
          <Icon name="video" size={13} />
          View last 1 min
        </button>
      </div>
    </div>
  );
}

function ToastDemo() {
  // Cycles: retrying → saved
  const [phase, setPhase] = useStateA("retrying");
  useEffectA(() => {
    const t1 = setTimeout(() => setPhase("saved"),  3000);
    const t2 = setTimeout(() => setPhase("retrying"), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px dashed var(--border)",
      borderRadius: "var(--radius-md)",
      padding: 24,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div className="toast">
        {phase === "retrying" ? (
          <>
            <span className="spinner" />
            <span>Could not save note</span>
            <span className="sep">·</span>
            <span style={{ color: "#a8a29e" }}>Retrying…</span>
          </>
        ) : (
          <>
            <span className="dot" />
            <span>Saved</span>
          </>
        )}
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
        State cycles every 3s · {phase === "retrying" ? "1 / 2" : "2 / 2"}
      </div>
    </div>
  );
}

// ============================================================
// Shared helpers
// ============================================================
function SectionHead({ num, tag, title, desc }) {
  return (
    <div className="ref-section-head">
      <div className="meta">
        <span className="num">§ {num}</span>
        <span className="tag">{tag}</span>
      </div>
      <h2>{title}</h2>
      <p className="desc">{desc}</p>
    </div>
  );
}

function Variant({ name, caption, children, full = false }) {
  return (
    <div className="var">
      <div className="var-cap">
        <span className="name">{name}</span>
        <span className="meta">{caption}</span>
      </div>
      {full ? children : (
        <div className="var-stage flush" style={{ background: "transparent", border: "none", padding: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  ConnectionStates, BedStates, EmptyStates, LoadingStates, ErrorStates,
  SectionHead, Variant, MockTopBar,
});
