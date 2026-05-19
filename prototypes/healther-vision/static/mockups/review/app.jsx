// App shell — top bar, event header strip, two-column layout, toast.

const { useState: useStateA, useEffect: useEffectA } = React;

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="btn tertiary icon" onClick={onToggle} aria-label="Toggle theme" title="Toggle theme">
      {theme === "dark" ? <ISun size={14}/> : <IMoon size={14}/>}
    </button>
  );
}

function TopBar({ theme, setTheme }) {
  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          className="btn tertiary"
          style={{ paddingLeft: 6, paddingRight: 10 }}
          onClick={() => console.log("[Back to live monitor]")}
        >
          <IArrowLeft size={15}/>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Back to monitor</span>
        </button>
        <span style={{ width: 1, height: 18, background: "var(--border)" }}></span>
        <div className="crumb">
          <AidaMark size={12}/>
          <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>Aida</span>
          <span className="sep">/</span>
          <span>Bed {EVENT.patient.bed}</span>
          <span className="sep">/</span>
          <span className="mono" style={{ fontSize: 12 }}>Event #{EVENT.id}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="mono small fg-2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IClock size={12}/>
          <span>Fired {EVENT.firedAtFull}</span>
          <span className="fg-3">·</span>
          <span className="fg-3">{EVENT.firedAgo}</span>
        </div>
        <span style={{ width: 1, height: 18, background: "var(--border)" }}></span>
        <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}/>
      </div>
    </div>
  );
}

function EventHeaderStrip({ reviewStatus }) {
  const sev = EVENT.severity;
  return (
    <div className="event-strip">
      <div className="stripe" style={{ background: "var(--critical)" }}></div>
      <div className="body">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--fg-3)" }}>
            {EVENT.type}
          </span>
          <span className="fg-3" style={{ fontSize: 12 }}>·</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{EVENT.label}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
          <span className="tag critical" style={{ padding: "2px 8px" }}>
            <span className="dot critical dot-pulse" style={{ width: 6, height: 6 }}></span>
            Critical
          </span>
          <span className="small fg-2" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>{EVENT.patient.name}</span>
            <span className="fg-3">·</span>
            <span>Bed {EVENT.patient.bed}</span>
            <span className="fg-3">·</span>
            <span className="mono">MRN {EVENT.patient.mrn}</span>
            <span className="fg-3">·</span>
            <span>{EVENT.patient.admission}</span>
          </span>
          <span className="fg-3 small">·</span>
          <span className="mono small fg-2">Fired {EVENT.firedAt}</span>
        </div>
      </div>
      <div className="right">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span className="label-caps">Review status</span>
          <span className={`status-pill ${reviewStatus.tone}`}>
            <span className={`dot ${reviewStatus.tone === "gray" ? "gray" : reviewStatus.tone}`}></span>
            {reviewStatus.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, sub }) {
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <ICheck size={14}/>
      <span>{msg}</span>
      {sub && <span className="meta">· {sub}</span>}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useStateA("light");
  const [reviewStatus, setReviewStatus] = useStateA({ label: "Unreviewed", tone: "gray" });
  const [toast, setToast] = useStateA(null);

  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleReview = (a) => {
    setReviewStatus(a.status);
    setToast({
      msg: `Marked as ${a.nm.toLowerCase()}`,
      sub: "Logged to audit trail",
    });
    console.log("[review]", a.id, a.nm);
    clearTimeout(handleReview._t);
    handleReview._t = setTimeout(() => setToast(null), 2400);
  };

  return (
    <div>
      <TopBar theme={theme} setTheme={setTheme}/>
      <EventHeaderStrip reviewStatus={reviewStatus}/>

      <div className="page">
        <div className="columns">
          {/* Left — evidence */}
          <div>
            <EvidencePanel />
          </div>

          {/* Right — interpretation, context, review, notes */}
          <div className="rail">
            <Interpretation />
            <SurroundingContext />
            <ReviewActions activeId={REVIEW_ACTIONS.find(a => a.status.label === reviewStatus.label)?.id} onPick={handleReview}/>
            <NotesSection />
          </div>
        </div>
      </div>

      <Toast msg={toast?.msg} sub={toast?.sub}/>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
