/* global React, Icon, AidaMark, StatusDot, StatusBadge, Button */
// Clinical-specific components — the parts that make Aida feel like Aida.

// ----- Sparkline (decorative, behind vitals number) ---------------
function Sparkline({ data, color = "currentColor", width = 240, height = 56 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(max - min, 0.0001);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 2) - 1;
    return [x, y];
  });
  const d = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const dFill = d + ` L${width},${height} L0,${height} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={dFill} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ----- Patient header strip ---------------------------------------
function PatientHeader({
  name = "Margaret Chen",
  age = 67,
  sex = "F",
  mrn = "4837210",
  bed = "ICU-04",
  diagnosis = "Post-op CABG, day 2",
  status = { tone: "success", label: "Stable" },
}) {
  return (
    <div className="patient-strip">
      <div className="name">{name}</div>
      <div className="meta">
        <div className="meta-item">
          <span className="k">Age / Sex</span>
          <span className="v">{age} · {sex}</span>
        </div>
        <span className="sep" />
        <div className="meta-item">
          <span className="k">MRN</span>
          <span className="v">{mrn}</span>
        </div>
        <span className="sep" />
        <div className="meta-item">
          <span className="k">Bed</span>
          <span className="v">{bed}</span>
        </div>
        <span className="sep" />
        <div className="meta-item">
          <span className="k">Admission</span>
          <span className="v v-text">{diagnosis}</span>
        </div>
      </div>
      <div className="right">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="secondary" size="sm" icon="more" iconOnly aria-label="More patient actions" />
      </div>
    </div>
  );
}

// ----- Vitals card -------------------------------------------------
function VitalCard({ label, value, unit, trend, data, alert = false }) {
  const trendDir = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
  const trendIcon = trend > 0 ? "arrowUp" : trend < 0 ? "arrowDown" : "arrowFlat";
  const sparkColor = alert ? "var(--critical)" : "var(--brand)";
  return (
    <div className={"vital-card" + (alert ? " alert" : "")}>
      <Sparkline data={data} color={sparkColor} />
      <div className="vitals-label">{label}</div>
      <div className="vitals-value">
        <span className="vitals-num">{value}</span>
        <span className="vitals-unit">{unit}</span>
        <span className={`vitals-trend ${trendDir}`}>
          <Icon name={trendIcon} size={12} strokeWidth={2} />
          {Math.abs(trend)}
        </span>
      </div>
    </div>
  );
}

// ----- Event timeline ---------------------------------------------
function EventTimeline({
  startHour = 4,
  endHour = 8,
  nowFraction = 0.78,
  events = [],
}) {
  const ticks = [];
  for (let h = startHour; h <= endHour; h++) {
    ticks.push({ hour: h, label: `${String(h).padStart(2, "0")}:00`, pos: (h - startHour) / (endHour - startHour) });
  }
  return (
    <div className="timeline">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Last 4 hours</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {String(startHour).padStart(2, "0")}:00 – {String(endHour).padStart(2, "0")}:00
        </div>
      </div>
      <div className="axis">
        {ticks.map((t) => (
          <React.Fragment key={t.hour}>
            <span className="tick" style={{ left: `${t.pos * 100}%` }} />
            <span className="tick-label" style={{ left: `${t.pos * 100}%` }}>{t.label}</span>
          </React.Fragment>
        ))}
        {events.map((e, i) => (
          <span
            key={i}
            className={`marker ${e.tone}${e.large ? " large" : ""}`}
            style={{ left: `${e.at * 100}%` }}
            title={`${e.label} · ${e.time}`}
          />
        ))}
        <span className="now" style={{ left: `${nowFraction * 100}%` }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
        {[
          { tone: "info",     label: "Info" },
          { tone: "warning",  label: "Warning" },
          { tone: "critical", label: "Critical" },
          { tone: "success",  label: "Resolved" },
        ].map((t) => (
          <div key={t.tone} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-2)" }}>
            <span className={`marker ${t.tone}`} style={{ position: "static", transform: "none", border: "none" }} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Alert banners ----------------------------------------------
function AlertBanner({ variant = "subtle", title, message, action, onDismiss }) {
  const icon = variant === "prominent" ? "shieldAlert" : "alert";
  return (
    <div className={`banner ${variant}`}>
      <Icon name={icon} size={16} className="icon" />
      <div className="body">
        {title && <div className="ttl">{title}</div>}
        {message && <div className="msg">{message}</div>}
      </div>
      {action && <button type="button" className="btn sm secondary" onClick={action.onClick}>{action.label}</button>}
      {variant === "subtle" && onDismiss && (
        <button type="button" className="btn sm tertiary icon" aria-label="Dismiss" onClick={onDismiss}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

// ----- Assistant chat bubble --------------------------------------
function AssistantBubble({ children, citations = [] }) {
  return (
    <div className="chat-bubble">
      <span className="chat-avatar">
        <AidaMark size={18} />
      </span>
      <div className="chat-body">
        <div className="who">Aida</div>
        <div>{children}</div>
        {citations.length > 0 && (
          <div className="chat-cites">
            {citations.map((c, i) => (
              <button key={i} className="cite-chip" type="button">
                <Icon name={c.icon || "activity"} size={11} strokeWidth={1.75} />
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  Sparkline, PatientHeader, VitalCard, EventTimeline, AlertBanner, AssistantBubble,
});
