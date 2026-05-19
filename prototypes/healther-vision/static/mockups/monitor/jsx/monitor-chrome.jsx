/* global React, Icon, AidaMark, ThemeToggle */
// Top bar + patient header strip + status pill menu.

const { useState: useStateCh, useEffect: useEffectCh, useRef: useRefCh } = React;

function TopBar({ theme, setTheme }) {
  return (
    <div className="top-bar">
      <span className="mark"><AidaMark size={24} /></span>
      <span className="crumbs" aria-label="Breadcrumb">
        <span className="seg">Wards</span>
        <span className="slash">/</span>
        <span className="seg">ICU-2</span>
        <span className="slash">/</span>
        <span className="seg current">Bed 4</span>
      </span>
      <div className="right">
        <span className="live-pill" title="Stream connected · 23 fps">
          <span className="pulse" />
          Live
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Shortcuts"
          title="Keyboard shortcuts"
        >
          <Icon name="command" size={16} />
        </button>
        <span className="avatar" title="Dr. R. Patel">RP</span>
      </div>
    </div>
  );
}

// ----- Patient header strip --------------------------------------------------
const STATUS_DEFS = {
  Stable:   { tone: "tone-success",  dotTone: "success",  desc: "default" },
  Watch:    { tone: "tone-warning",  dotTone: "warning",  desc: "elevated" },
  Critical: { tone: "tone-critical", dotTone: "critical", desc: "alarm" },
};

function StatusPill({ status, onChange }) {
  const [open, setOpen] = useStateCh(false);
  const def = STATUS_DEFS[status];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={`status-pill ${def.tone}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change patient status"
      >
        <span className="dot" />
        {status}
        <span className="caret"><Icon name="chevronDown" size={12} /></span>
      </button>
      {open && (
        <>
          <div className="popover-catch" onClick={() => setOpen(false)} />
          <div className="status-menu" role="listbox">
            {Object.entries(STATUS_DEFS).map(([k, v]) => {
              const cls = v.dotTone === "success" ? "s" : v.dotTone === "warning" ? "w" : "c";
              return (
                <button
                  key={k}
                  type="button"
                  className={`opt ${cls} ${k === status ? "active" : ""}`}
                  onClick={() => { onChange(k); setOpen(false); }}
                >
                  <span className="dot" />
                  <span>{k}</span>
                  <span className="desc">{v.desc}</span>
                  {k === status && <Icon name="check" size={14} className="check" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PatientStrip({ patient, onStatusChange }) {
  return (
    <div className="p-strip">
      <div className="ident">
        <div className="name">{patient.name}</div>
        <div className="meta">
          {patient.age} / {patient.sex}
          <span className="dot-sep">·</span>
          MRN: {patient.mrn}
          <span className="dot-sep">·</span>
          Bed {patient.bed}
          <span className="dot-sep">·</span>
          {patient.diagnosis}
        </div>
      </div>
      <div className="spacer" />
      <StatusPill status={patient.status} onChange={onStatusChange} />
      <div className="spacer" />
      <div className="code-status">
        <span className="k">Code Status</span>
        <span className="v">{patient.codeStatus}</span>
      </div>
      <button type="button" className="icon-btn" aria-label="More patient actions">
        <Icon name="more" size={16} />
      </button>
    </div>
  );
}

Object.assign(window, { TopBar, PatientStrip });
