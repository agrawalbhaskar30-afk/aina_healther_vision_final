/* global React, Icon */
// Generic UI primitives — buttons, badges, inputs, dots, tags.

const { useState: useStatePrim } = React;

// ----- Buttons -----------------------------------------------------
function Button({ variant = "secondary", size = "md", icon = null, iconOnly = false, children, ...rest }) {
  const cls = ["btn", variant, size, iconOnly ? "icon" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 12 : size === "lg" ? 16 : 14} />}
      {!iconOnly && children}
    </button>
  );
}

// ----- Status dots & badges ---------------------------------------
function StatusDot({ tone = "gray" }) {
  return <span className={`dot ${tone}`} aria-hidden="true" />;
}

function StatusBadge({ tone = "success", children }) {
  return (
    <span className="badge">
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

function SeverityTag({ tone = "info", children }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

// ----- Inputs ------------------------------------------------------
function Field({ label, helper, error, children }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {error
        ? <span className="field-error">{error}</span>
        : helper && <span className="field-help">{helper}</span>}
    </label>
  );
}

function TextInput({ error, leadingIcon, ...rest }) {
  if (leadingIcon) {
    return (
      <span className="input-icon-wrap">
        <span className="leading-icon"><Icon name={leadingIcon} size={14} /></span>
        <input className={"input" + (error ? " error" : "")} {...rest} />
      </span>
    );
  }
  return <input className={"input" + (error ? " error" : "")} {...rest} />;
}

function Select({ children, ...rest }) {
  return (
    <span style={{ position: "relative", display: "block" }}>
      <select className="select" style={{ appearance: "none", paddingRight: 28 }} {...rest}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)", pointerEvents: "none" }}>
        <Icon name="chevronDown" size={14} />
      </span>
    </span>
  );
}

function Textarea(props) {
  return <textarea className="textarea" {...props} />;
}

function Toggle({ on, onChange, disabled = false }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      tabIndex={disabled ? -1 : 0}
      className={"toggle " + (on ? "on " : "") + (disabled ? "disabled" : "")}
      onClick={() => !disabled && onChange && onChange(!on)}
      onKeyDown={(e) => { if (!disabled && (e.key === " " || e.key === "Enter")) { e.preventDefault(); onChange && onChange(!on); } }}
    />
  );
}

function Checkbox({ on, onChange, disabled = false }) {
  return (
    <span
      role="checkbox"
      aria-checked={on}
      tabIndex={disabled ? -1 : 0}
      className={"checkbox " + (on ? "on " : "")}
      onClick={() => !disabled && onChange && onChange(!on)}
      onKeyDown={(e) => { if (!disabled && (e.key === " " || e.key === "Enter")) { e.preventDefault(); onChange && onChange(!on); } }}
      style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : null}
    >
      <Icon name="check" size={12} strokeWidth={2.5} />
    </span>
  );
}

// ----- Keyboard hint -----------------------------------------------
function Kbd({ children }) { return <kbd className="key">{children}</kbd>; }

function KbdRow({ label, keys }) {
  return (
    <div className="kbd-row">
      <span className="label">{label}</span>
      <span className="keys">
        {keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
      </span>
    </div>
  );
}

Object.assign(window, {
  Button, StatusDot, StatusBadge, SeverityTag,
  Field, TextInput, Select, Textarea, Toggle, Checkbox,
  Kbd, KbdRow,
});
