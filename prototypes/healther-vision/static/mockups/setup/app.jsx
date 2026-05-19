/* global React, ReactDOM */
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  /* Theme */
  const [theme, setTheme] = useStateApp(() => {
    try { return localStorage.getItem("aida-theme") || "light"; } catch { return "light"; }
  });
  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("aida-theme", theme); } catch {}
  }, [theme]);

  /* Sections */
  const [sections, setSections] = useStateApp(INITIAL_SECTIONS);
  const toggle = (key) => setSections(s => ({ ...s, [key]: { ...s[key], open: !s[key].open } }));
  const setStatus = (key, status) => setSections(s => ({ ...s, [key]: { ...s[key], status } }));

  /* Shapes */
  const [shapes, setShapes] = useStateApp(INITIAL_SHAPES);
  const [tool, setTool] = useStateApp("bed");
  const [showFloor, setShowFloor] = useStateApp(false);

  /* Optional crops */
  const [monitorOn, setMonitorOn] = useStateApp(true);
  const [ivOn, setIvOn] = useStateApp(false);

  /* Update crops section status based on toggles */
  useEffectApp(() => {
    const next = (monitorOn || ivOn) ? "in-progress" : "not-started";
    setSections(s => s.crops.status === next ? s : { ...s, crops: { ...s.crops, status: next } });
  }, [monitorOn, ivOn]);

  /* Test feed */
  const [tested, setTested] = useStateApp(false);
  const [testing, setTesting] = useStateApp(false);
  const runTest = () => {
    setTesting(true);
    setTested(false);
    setStatus("test", "in-progress");
    setTimeout(() => {
      setTesting(false);
      setTested(true);
      setStatus("test", "complete");
    }, 1800);
  };

  /* Modal */
  const [modal, setModal] = useStateApp(null); // null | "live" | "saved"

  /* Bed-zone area percentage */
  const areaPct = useMemoApp(() => {
    const total = 1280 * 720;
    return Math.round((polygonArea(shapes.bed.points) / total) * 100);
  }, [shapes.bed]);

  /* History */
  const [history, setHistory] = useStateApp([]);
  const [future, setFuture] = useStateApp([]);
  const pushHistory = (s) => {
    setHistory(h => [...h.slice(-20), s]);
    setFuture([]);
  };
  const wrappedSetShapes = (updater) => {
    setShapes(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // dedupe — only push on a real change
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setHistory(h => [...h.slice(-20), prev]);
        setFuture([]);
      }
      return next;
    });
  };
  const undo = () => {
    setHistory(h => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setFuture(f => [shapes, ...f]);
      setShapes(last);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture(f => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setHistory(h => [...h, shapes]);
      setShapes(next);
      return rest;
    });
  };
  const resetAll = () => {
    pushHistory(shapes);
    setShapes(INITIAL_SHAPES);
  };
  const clearShape = () => {
    pushHistory(shapes);
    setShapes(s => {
      const next = { ...s };
      if (tool === "bed") next.bed = INITIAL_SHAPES.bed;
      else if (tool === "monitor") next.monitor = INITIAL_SHAPES.monitor;
      else next.iv = INITIAL_SHAPES.iv;
      return next;
    });
  };

  /* Counts */
  const completeCount = Object.values(sections).filter(s => s.status === "complete").length;
  const total = 4;

  /* Selecting a tool also opens its section + opens bed section if drawing bed */
  const handleSetTool = (id) => {
    setTool(id);
    const key = id === "bed" ? "bed" : "crops";
    setSections(s => ({ ...s, [key]: { ...s[key], open: true } }));
  };

  return (
    <>
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
        onSave={() => setModal("saved")}
      />

      <main className="page">
        {/* ============ LEFT — CANVAS ============ */}
        <div className="canvas-col" data-screen-label="left/canvas">
          <Toolbar
            tool={tool}
            onTool={handleSetTool}
            onUndo={undo}
            onRedo={redo}
            onReset={resetAll}
            onClearShape={clearShape}
          />
          <Stage
            shapes={shapes}
            setShapes={wrappedSetShapes}
            tool={tool}
            onTool={handleSetTool}
            showFloor={showFloor}
          />
          <div className="caption">
            <span>
              Drag points to adjust. Click a shape to select it. Press <kbd>⌫</kbd> to remove a point.
            </span>
            <span className="mono" style={{color:"var(--fg-3)"}}>
              History · {history.length} actions
            </span>
          </div>
        </div>

        {/* ============ RIGHT — FORM ============ */}
        <div className="form-col" data-screen-label="right/form">
          <div className="form-head">
            <h1>Configure Bed ICU-2</h1>
            <span className="meta">4 steps · ~3 minutes</span>
          </div>

          <SourceSection section={sections.source} toggle={() => toggle("source")}/>
          <BedSection
            section={sections.bed}
            toggle={() => toggle("bed")}
            shapes={shapes}
            areaPct={areaPct}
            showFloor={showFloor}
            setShowFloor={setShowFloor}
            onTool={handleSetTool}
          />
          <CropsSection
            section={sections.crops}
            toggle={() => toggle("crops")}
            monitorOn={monitorOn}
            setMonitorOn={setMonitorOn}
            ivOn={ivOn}
            setIvOn={setIvOn}
            onTool={handleSetTool}
          />
          <TestSection
            section={sections.test}
            toggle={() => toggle("test")}
            tested={tested}
            testing={testing}
            onRunTest={runTest}
          />

          <SummaryCard
            completeCount={completeCount}
            total={total}
          />

          <div className="actions-row">
            <button className="btn secondary" onClick={() => setModal("saved")}>Save draft</button>
            <button
              className="btn primary"
              style={{flex:1}}
              onClick={() => setModal("live")}
              title={completeCount < total ? "Some sections still incomplete — enabled for demo" : ""}
            >
              <I.CheckCircle size={15}/> Save &amp; go live
            </button>
          </div>

          <div style={{
            display:"flex", alignItems:"center", gap:8,
            fontSize:11, color:"var(--fg-3)",
            padding:"0 4px",
          }}>
            <I.Eye size={12}/>
            Changes are not visible to ward staff until you go live.
          </div>
        </div>
      </main>

      {modal && (
        <ResultModal
          kind={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function ResultModal({ kind, onClose }) {
  if (kind === "live") {
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Configuration live">
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <span className="icon-circle">
              <I.Check size={18}/>
            </span>
            <div>
              <h2>Bed ICU-2 is now live</h2>
              <p style={{marginTop:2}}>
                <span className="mono">cam-04</span> · streaming · 24fps
              </p>
            </div>
            <button className="btn icon tertiary" style={{marginLeft:"auto"}} onClick={onClose} aria-label="Close">
              <I.X size={14}/>
            </button>
          </div>
          <p>
            Aida is monitoring this bed. Events, vitals, and the live still are
            visible in the monitor view. Configuration can be edited any time —
            it will pause briefly while you make changes.
          </p>
          <div style={{
            background:"var(--surface-2)", border:"1px solid var(--border)",
            borderRadius:"var(--radius-md)", padding:"10px 12px",
            display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 12px",
            fontSize:12,
          }}>
            <span style={{color:"var(--fg-2)"}}>Bed zone</span>
            <span className="mono">enabled · 4 points</span>
            <span style={{color:"var(--fg-2)"}}>Floor zone</span>
            <span className="mono">auto-derived</span>
            <span style={{color:"var(--fg-2)"}}>Monitor OCR</span>
            <span className="mono">enabled · conf 0.94</span>
            <span style={{color:"var(--fg-2)"}}>IV/oxygen</span>
            <span className="mono" style={{color:"var(--fg-3)"}}>disabled</span>
          </div>
          <div className="row">
            <button className="btn tertiary" onClick={onClose}>Stay on setup</button>
            <button className="btn primary" onClick={onClose}>
              <I.ArrowLeft size={14}/> Back to monitor
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Draft saved">
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span className="icon-circle" style={{background:"var(--info-bg)", color:"var(--info)"}}>
            <I.Check size={18}/>
          </span>
          <div>
            <h2>Draft saved</h2>
            <p style={{marginTop:2}}>Bed ICU-2 will continue with previous configuration.</p>
          </div>
          <button className="btn icon tertiary" style={{marginLeft:"auto"}} onClick={onClose} aria-label="Close">
            <I.X size={14}/>
          </button>
        </div>
        <div className="row">
          <button className="btn primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
