/* global React, Icon */
// Left rail: bed state, staff presence, vitals 2x2 grid, active alerts.

const { useState: useStateLeft } = React;

// ----- Tiny sparkline (drawn within vital-mini) --------------
function MiniSpark({ data, color = "var(--brand)" }) {
  if (!data || data.length < 2) return null;
  const w = 64, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(max - min, 0.01);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const dFill = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg className="v-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={dFill} fill={color} opacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ----- Combined bed + staff row -------------------------------
function BedStaffRow({ bedState, staffState }) {
  const bedToneMap = {
    "In bed":          { iconTone: "tone-success",  iconName: "bed" },
    "Sitting on edge": { iconTone: "tone-warning",  iconName: "bed" },
    "Out of bed":      { iconTone: "tone-warning",  iconName: "footprints" },
    "On floor":        { iconTone: "tone-critical", iconName: "shieldAlert" },
    "Unknown":         { iconTone: "tone-neutral",  iconName: "circle" },
  };
  const bedCfg = bedToneMap[bedState.state] || bedToneMap["Unknown"];

  const staffPresent = staffState.present;
  const staffTone = staffPresent ? "tone-success" : (
    staffState.absenceMinutes > 240 ? "tone-critical" :
    staffState.absenceMinutes > 120 ? "tone-warning" : "tone-neutral"
  );

  return (
    <div className="state-pair">
      <div className="cell">
        <div className="lbl">Bed state</div>
        <div className="row">
          <span className={`ico ${bedCfg.iconTone}`}>
            <Icon name={bedCfg.iconName} size={14} />
          </span>
          <div className="txt">
            <span className="state">{bedState.state}</span>
            <span className="meta">Confirmed {bedState.confirmedAgo} ago</span>
          </div>
        </div>
      </div>
      <div className="cell">
        <div className="lbl">Staff</div>
        <div className="row">
          <span className={`ico ${staffTone}`}>
            <Icon name={staffPresent ? "userCheck" : "userX"} size={14} />
          </span>
          <div className="txt">
            <span className="state">
              {staffPresent ? "Present" : `Absent — ${staffState.lastVisitAgo}`}
            </span>
            <span className="meta">
              {staffPresent ? "In room now" : `Last ${staffState.lastVisitTime}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Generic state card (kept for reuse) -------------------
function StateCard({ label, iconName, iconTone = "tone-neutral", state, meta, sub }) {
  return (
    <div className="mini-card">
      <div className="lbl">{label}</div>
      <div className="row">
        <span className={`ico ${iconTone}`}>
          <Icon name={iconName} size={16} />
        </span>
        <div className="txt">
          <span className="state">{state}</span>
          {meta && <span className="meta">{meta}</span>}
        </div>
        {sub}
      </div>
    </div>
  );
}

// ----- Vitals grid -------------------------------------------
function VitalMini({ label, value, unit, trend = "flat", source, warn = false, data }) {
  const trendIcon = trend === "up" ? "arrowUp" : trend === "down" ? "arrowDown" : "arrowFlat";
  const renderValue = () => {
    if (typeof value === "string" && value.includes("/")) {
      const [a, b] = value.split("/");
      return (<><span>{a}</span><span className="slash">/</span><span>{b}</span></>);
    }
    return value;
  };
  const sparkColor = warn ? "var(--warning)" : "var(--brand)";
  return (
    <div className={"vital-mini" + (warn ? " warn" : "")}>
      <div className="v-lbl">
        {label}
        <span className="trend"><Icon name={trendIcon} size={11} strokeWidth={2} /></span>
      </div>
      <div className="v-val">
        <span className="v-num">{renderValue()}</span>
        <span className="v-unit">{unit}</span>
      </div>
      <MiniSpark data={data} color={sparkColor} />
      <div className="v-foot">Source: {source}</div>
    </div>
  );
}

function VitalsGrid({ vitals }) {
  return (
    <div className="vitals-grid">
      <VitalMini label="HR"   value={vitals.hr.value}   unit={vitals.hr.unit}   trend={vitals.hr.trend}   source={vitals.hr.source}   data={vitals.hr.spark} />
      <VitalMini label="BP"   value={vitals.bp.value}   unit={vitals.bp.unit}   trend={vitals.bp.trend}   source={vitals.bp.source}   data={vitals.bp.spark} />
      <VitalMini label="SpO₂" value={vitals.spo2.value} unit={vitals.spo2.unit} trend={vitals.spo2.trend} source={vitals.spo2.source} data={vitals.spo2.spark} warn={vitals.spo2.warning} />
      <VitalMini label="RR"   value={vitals.rr.value}   unit={vitals.rr.unit}   trend={vitals.rr.trend}   source={vitals.rr.source}   data={vitals.rr.spark} />
    </div>
  );
}

// ----- Active alerts panel -----------------------------------
function AlertsPanel({ alerts, onDismiss, onReview }) {
  return (
    <div className="alerts-card">
      <div className="head">
        <span className="ttl">
          Active alerts
          <span className="count">({alerts.length})</span>
        </span>
        {alerts.length > 0 && (
          <button type="button" className="clear" aria-label="Clear all alerts">Clear all</button>
        )}
      </div>
      <div className="list">
        {alerts.length === 0 && (
          <div className="alerts-empty">No active alerts.</div>
        )}
        {alerts.map((a) => (
          <div key={a.id} className={`alert-row tone-${a.severity}`}>
            <span className="stripe" />
            <div className="top">
              <span className="icn">
                <Icon name={a.severity === "critical" ? "shieldAlert" : "alert"} size={14} />
              </span>
              <span className="msg">{a.message}</span>
            </div>
            <div className="bot">
              <span className="time">{a.time}</span>
              <span className="spacer" />
              <button type="button" className="ghost-btn" onClick={() => onReview(a)}>
                Review →
              </button>
              <button
                type="button"
                className="x-btn"
                aria-label="Dismiss alert"
                onClick={() => onDismiss(a.id)}
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Left column composition -------------------------------
function LeftColumn({ bedState, staffState, vitals, alerts, onDismissAlert, onReview }) {
  return (
    <div className="col left">
      <BedStaffRow bedState={bedState} staffState={staffState} />
      <VitalsGrid vitals={vitals} />
      <AlertsPanel
        alerts={alerts}
        onDismiss={onDismissAlert}
        onReview={onReview}
      />
    </div>
  );
}

Object.assign(window, { LeftColumn });
