// Right column — Interpretation, surrounding context, review actions, notes.

const { useState: useStateR } = React;

function AidaMark({ size = 18 }) {
  return (
    <span
      style={{
        width: size + 8, height: size + 8,
        borderRadius: 6,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--brand)",
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M14 0h36a14 14 0 0 1 14 14v36a14 14 0 0 1-14 14H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Zm-2 25a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h40a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H12Z"
        />
      </svg>
    </span>
  );
}

// --- Interpretation -------------------------------------------

function Interpretation() {
  const conf = EVENT.interpretation.confidence;
  const citeIcon = (k) => {
    if (k === "trend")  return <ITrendDown size={11}/>;
    if (k === "camera") return <ICamera size={11}/>;
    if (k === "user")   return <IUserMinus size={11}/>;
    return <IInfo size={11}/>;
  };
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <AidaMark size={16}/>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="label-caps" style={{ color: "var(--brand)" }}>Aida's interpretation</div>
          <div className="tiny fg-3">Generated 07:14:28 · Model v4.18</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="tag brand">AI</span>
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fg-1)", display: "flex", flexDirection: "column", gap: 8 }}>
        {EVENT.interpretation.paragraphs.map((p, i) => (<p key={i} style={{ margin: 0, color: "var(--fg-1)" }}>{p}</p>))}
      </div>

      {/* Confidence */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="tiny fg-2" style={{ fontWeight: 500 }}>Aida confidence</span>
          <span className="mono small fg-1">{EVENT.interpretation.confidenceLabel} · {Math.round(conf * 100)}%</span>
        </div>
        <div className="conf-track">
          <div className="conf-fill" style={{ width: `${conf * 100}%` }}></div>
        </div>
      </div>

      {/* Citations */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {EVENT.interpretation.citations.map((c, i) => (
          <span className="cite-chip" key={i}>{citeIcon(c.icon)}{c.label}</span>
        ))}
      </div>
    </section>
  );
}

// --- Surrounding context --------------------------------------

function SurroundingContext() {
  return (
    <section className="card" style={{ padding: 16 }}>
      <div className="sec-h" style={{ marginBottom: 8 }}>
        <span>Events ±15 min</span>
        <span className="mono tiny" style={{ color: "var(--fg-3)", textTransform: "none", letterSpacing: 0 }}>06:59 – 07:29</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {EVENT.contextEvents.map((e, i) => (
          <div
            key={i}
            className={"ctx-row" + (e.isCurrent ? " current" : "")}
            onClick={() => !e.isCurrent && console.log("[navigate to event]", e)}
            role={e.isCurrent ? undefined : "button"}
            tabIndex={e.isCurrent ? -1 : 0}
          >
            <span className="mono t">{e.time}</span>
            <span className={"dot " + e.severity}></span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span className="lbl" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
              {e.isCurrent && <span className="tiny fg-2" style={{ color: "var(--critical-fg)", opacity: 0.85 }}>This event</span>}
            </div>
            <span className="mono o">{e.offset}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Review actions -------------------------------------------

const REVIEW_ACTIONS = [
  { id: "ack",   nm: "Acknowledge",      ds: "I've seen this",          tone: "gray",     icon: IEye,         status: { label: "Acknowledged",  tone: "info"     } },
  { id: "tp",    nm: "True positive",    ds: "Real clinical event",     tone: "success",  icon: ICheckCircle, status: { label: "True positive", tone: "success"  } },
  { id: "fp",    nm: "False positive",   ds: "AI was wrong",            tone: "warning",  icon: IX,           status: { label: "False positive",tone: "warning"  } },
  { id: "unc",   nm: "Unclear",          ds: "Need more info",          tone: "gray",     icon: IHelpCircle,  status: { label: "Unclear",       tone: "gray"     } },
  { id: "esc",   nm: "Escalate",         ds: "Send to senior on-call",  tone: "critical", icon: IChevronsUp,  status: { label: "Escalated",     tone: "critical" } },
  { id: "note",  nm: "Create note draft",ds: "Add to chart",            tone: "brand",    icon: IFilePlus,    status: { label: "Note drafted",  tone: "info"     } },
];

function ReviewActions({ activeId, onPick }) {
  return (
    <section className="card" style={{ padding: 16 }}>
      <div className="sec-h" style={{ marginBottom: 12 }}>
        <span>Review</span>
        <span className="tiny mono" style={{ color: "var(--fg-3)", textTransform: "none", letterSpacing: 0 }}>One action required</span>
      </div>

      <div className="action-grid">
        {REVIEW_ACTIONS.map((a) => {
          const Ic = a.icon;
          const isActive = activeId === a.id;
          return (
            <button
              key={a.id}
              className={"action-btn" + (isActive ? " active" : "")}
              data-tone={a.tone}
              onClick={() => onPick(a)}
            >
              <span className="ic"><Ic size={16}/></span>
              <span className="nm">{a.nm}</span>
              <span className="ds">{a.ds}</span>
            </button>
          );
        })}
      </div>

      <div className="tiny fg-3" style={{ marginTop: 12, lineHeight: 1.5 }}>
        Your review will be logged with timestamp and user ID. Aida learns from these labels over time.
      </div>
    </section>
  );
}

// --- Notes section --------------------------------------------

function NotesSection() {
  const [draft, setDraft] = useStateR("");
  const [attach, setAttach] = useStateR(true);
  const [notes, setNotes] = useStateR(EVENT.notes);
  const [savedFlash, setSavedFlash] = useStateR(false);

  const save = () => {
    if (!draft.trim()) return;
    setNotes((ns) => [
      ...ns,
      { author: "Dr. K. Owens", time: nowHHmm(), text: draft.trim(), justAdded: true, attached: attach },
    ]);
    setDraft("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  return (
    <section className="card" style={{ padding: 16 }}>
      <div className="sec-h" style={{ marginBottom: 10 }}>
        <span>Notes</span>
        <span className="tiny mono" style={{ color: "var(--fg-3)", textTransform: "none", letterSpacing: 0 }}>{notes.length} {notes.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* Existing notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {notes.map((n, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>{n.author}</span>
              <span className="mono tiny fg-3">{n.time}</span>
              {n.attached && <span className="tag neutral" style={{ marginLeft: "auto" }}>Attached to chart</span>}
            </div>
            <div className="small" style={{ color: "var(--fg-2)", lineHeight: 1.55 }}>{n.text}</div>
          </div>
        ))}
      </div>

      {/* Draft */}
      <textarea
        className="textarea"
        placeholder="Add a note about this event…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
          <span className={"toggle" + (attach ? " on" : "")} onClick={() => setAttach((v) => !v)}></span>
          <span className="small fg-2">Attach to patient chart</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {savedFlash && <span className="small" style={{ color: "var(--success-fg)" }}>Saved</span>}
          <button className="btn primary sm" disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : 0.4 }} onClick={save}>
            <ISave size={13}/>Save note
          </button>
        </div>
      </div>
    </section>
  );
}

function nowHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

Object.assign(window, { Interpretation, SurroundingContext, ReviewActions, NotesSection, REVIEW_ACTIONS, AidaMark });
