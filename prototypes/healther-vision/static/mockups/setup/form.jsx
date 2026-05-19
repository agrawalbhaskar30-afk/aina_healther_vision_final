/* global React */
const { useState: useState_F } = React;

/* ===================== STATUS PILL ===================== */
function StatusPill({ status }) {
  if (status === "complete") {
    return <span className="tag success"><span className="dot success"></span>Complete</span>;
  }
  if (status === "in-progress") {
    return <span className="tag warning"><span className="dot warning"></span>In progress</span>;
  }
  return <span className="tag neutral"><span className="dot gray"></span>Not started</span>;
}

/* ===================== SECTION SHELL ===================== */
function Section({ idx, title, subtitle, status, open, onToggle, children }) {
  let stepClass = "step-num";
  if (status === "complete") stepClass += " done";
  else if (status === "in-progress") stepClass += " active";

  return (
    <div className="section">
      <button className="section-head" onClick={onToggle} aria-expanded={open}>
        <span className={stepClass}>
          {status === "complete" ? <I.Check size={12}/> : idx}
        </span>
        <span style={{flex:1, minWidth:0}}>
          <div className="section-title">{title}</div>
          {subtitle && <div className="section-sub">{subtitle}</div>}
        </span>
        <span className="right">
          <StatusPill status={status}/>
          <span className={"chev" + (open ? " open" : "")}>
            <I.ChevronRight size={16}/>
          </span>
        </span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

/* ===================== SECTION 1: CAMERA SOURCE ===================== */
function SourceSection({ section, toggle }) {
  const [type, setType] = useState_F("rtsp");
  const [url, setUrl] = useState_F("rtsp://192.168.1.42:554/stream1");
  const [conn, setConn] = useState_F("connected"); // idle | testing | connected | failed

  const test = () => {
    setConn("testing");
    setTimeout(() => setConn("connected"), 1100);
  };

  return (
    <Section
      idx={1}
      title="Camera source"
      subtitle="RTSP · 1080p @ 24fps · Connected"
      status={section.status}
      open={section.open}
      onToggle={toggle}
    >
      <div className="field">
        <span className="field-label">Source type</span>
        <div className="radio-group">
          {[
            ["webcam","Webcam"],
            ["rtsp","RTSP"],
            ["file","Video file"],
            ["synthetic","Synthetic"],
          ].map(([k, label]) => (
            <button key={k} className={type === k ? "on" : ""} onClick={() => setType(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {type === "rtsp" && (
        <div className="field">
          <span className="field-label">Stream URL</span>
          <div style={{display:"flex", gap:8}}>
            <input
              className="input mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn secondary" onClick={test} disabled={conn === "testing"}>
              {conn === "testing" ? <><span className="spinner"></span>Testing…</> : "Test connection"}
            </button>
          </div>
          <span className="connection-status">
            {conn === "connected" && (<>
              <span className="dot success"></span>
              <span>Connected · <span className="meta-mono">1080p · 24fps · 4.2 Mbps</span></span>
            </>)}
            {conn === "testing" && (<>
              <span className="dot warning"></span><span>Negotiating stream…</span>
            </>)}
            {conn === "failed" && (<>
              <span className="dot critical"></span><span>Connection failed</span>
            </>)}
          </span>
        </div>
      )}

      <div className="kv" style={{marginTop:4}}>
        <span className="k">Codec · Resolution · Latency</span>
        <span className="v mono" style={{fontSize:12}}>H.264 · 1920×1080 · 180ms</span>
      </div>
      <div className="kv">
        <span className="k">Camera label</span>
        <span className="v mono" style={{fontSize:12}}>cam-04 (Axis P1378)</span>
      </div>
    </Section>
  );
}

/* ===================== SECTION 2: BED ZONE ===================== */
function BedSection({ section, toggle, shapes, areaPct, showFloor, setShowFloor, onTool }) {
  return (
    <Section
      idx={2}
      title="Bed-zone calibration"
      subtitle={`4 points · ${areaPct}% of frame · last edited 2 min ago`}
      status={section.status}
      open={section.open}
      onToggle={toggle}
    >
      <p>
        Draw a polygon around the bed area. Include the full mattress surface — this is
        the zone Aida uses to determine if the patient is in bed, sitting on the edge,
        or out of bed.
      </p>

      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr 1fr",
        gap:8,
        background:"var(--surface-2)",
        border:"1px solid var(--border)",
        borderRadius:"var(--radius-md)",
        padding:"10px 12px",
      }}>
        <Stat label="Points"     value={shapes.bed.points.length}/>
        <Stat label="Frame area" value={`${areaPct}%`}/>
        <Stat label="Last edit"  value="2m ago" mono={false}/>
      </div>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <label style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer"}}>
          <button
            className={"toggle" + (showFloor ? " on" : "")}
            onClick={() => setShowFloor(v => !v)}
            aria-label="Toggle floor zone overlay"
          ></button>
          <span style={{fontSize:13}}>Show floor zone <span style={{color:"var(--fg-2)"}}>(auto-derived)</span></span>
        </label>
        <button className="btn secondary sm" onClick={() => onTool("bed")}>
          <I.Edit size={13}/> Re-draw bed zone
        </button>
      </div>

      <div className="note">
        Aida derives the floor zone from the bed polygon's lower edge. Adjust the bed
        polygon and the floor follows.
      </div>
    </Section>
  );
}

function Stat({ label, value, mono = true }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:2}}>
      <span style={{fontSize:10.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--fg-3)"}}>{label}</span>
      <span className={mono ? "mono" : ""} style={{fontSize:13, fontWeight:500}}>{value}</span>
    </div>
  );
}

/* ===================== SECTION 3: CROPS ===================== */
function CropsSection({ section, toggle, monitorOn, setMonitorOn, ivOn, setIvOn, onTool }) {
  return (
    <Section
      idx={3}
      title="Optional crop zones"
      subtitle="Help Aida focus on bedside monitor & IV"
      status={section.status}
      open={section.open}
      onToggle={toggle}
    >
      <div className="subrow">
        <div className="body">
          <div className="head">
            <span style={{
              width:8, height:8, borderRadius:2,
              background:"var(--mon-stroke)",
              display:"inline-block"
            }}></span>
            Bedside monitor crop
            <span className="tag info" style={{marginLeft:4}}>OCR</span>
          </div>
          <div className="sub">Reads vitals from the bedside monitor when GE/Philips integration is unavailable.</div>

          {monitorOn && (
            <div className="crop-preview">
              <div className="thumb mono">
                <span style={{display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1.2, gap:1}}>
                  <span style={{fontSize:14, color:"#4ade80"}}>78</span>
                  <span style={{fontSize:8, color:"#94a3b8", letterSpacing:"0.1em"}}>HR</span>
                </span>
              </div>
              <div className="ocr">
                <span className="label">HR</span>   <span className="val">78 bpm</span>
                <span className="label">BP</span>   <span className="val">118/74</span>
                <span className="label">SpO2</span> <span className="val">97 %</span>
                <span className="label">RR</span>   <span className="val">14 /min</span>
              </div>
            </div>
          )}
          {monitorOn && (
            <div style={{display:"flex", alignItems:"center", gap:10, marginTop:10}}>
              <span className="connection-status">
                <span className="dot success"></span>
                <span>Crop quality: <span style={{color:"var(--fg-1)"}}>Good</span> · OCR confidence <span className="mono" style={{color:"var(--fg-1)"}}>0.94</span></span>
              </span>
              <button className="btn tertiary sm" style={{marginLeft:"auto"}} onClick={() => onTool("monitor")}>
                <I.Edit size={12}/> Adjust crop
              </button>
            </div>
          )}
        </div>
        <button
          className={"toggle" + (monitorOn ? " on" : "")}
          onClick={() => setMonitorOn(v => !v)}
          aria-label="Enable bedside monitor crop"
        ></button>
      </div>

      <div className="subrow">
        <div className="body">
          <div className="head">
            <span style={{
              width:8, height:8, borderRadius:2,
              background:"var(--iv-stroke)",
              display:"inline-block"
            }}></span>
            IV &amp; oxygen crop
            <span className="tag neutral" style={{marginLeft:4}}>
              <I.Lock size={10}/> Beta
            </span>
          </div>
          <div className="sub">Detects IV bag near-empty and oxygen mask displacement. Optional — can be added later.</div>
          {ivOn && (
            <div style={{display:"flex", alignItems:"center", gap:10, marginTop:10}}>
              <span className="connection-status">
                <span className="dot warning"></span>
                <span>Crop set · model training data still gathering (<span className="mono" style={{color:"var(--fg-1)"}}>14/100</span> samples)</span>
              </span>
              <button className="btn tertiary sm" style={{marginLeft:"auto"}} onClick={() => onTool("iv")}>
                <I.Edit size={12}/> Adjust crop
              </button>
            </div>
          )}
        </div>
        <button
          className={"toggle" + (ivOn ? " on" : "")}
          onClick={() => setIvOn(v => !v)}
          aria-label="Enable IV/oxygen crop"
        ></button>
      </div>

      <div className="note">
        These crops help Aida focus its attention. Leave disabled if not applicable — the bed-zone calibration alone is enough for movement, presence, and fall detection.
      </div>
    </Section>
  );
}

/* ===================== SECTION 4: TEST FEED ===================== */
function TestSection({ section, toggle, tested, onRunTest, testing }) {
  return (
    <Section
      idx={4}
      title="Test feed"
      subtitle={tested ? "Last test 14:29 · passed (5/5)" : "Run a 30-second test before going live"}
      status={section.status}
      open={section.open}
      onToggle={toggle}
    >
      {!tested && !testing && (
        <button className="btn primary xl" onClick={onRunTest} style={{width:"100%"}}>
          <I.Zap size={15}/> Start 30-second test
        </button>
      )}
      {testing && (
        <div className="card" style={{padding:14, display:"flex", alignItems:"center", gap:12}}>
          <span className="spinner" style={{color:"var(--brand)"}}></span>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:500}}>Running 30s test…</div>
            <div className="muted-mono" style={{marginTop:2}}>Capturing frames, evaluating bed zone, exercising OCR</div>
          </div>
          <span className="mono" style={{fontSize:13, color:"var(--fg-2)"}}>00:18 / 00:30</span>
        </div>
      )}

      {tested && (
        <>
          <div className="test-result">
            <div className="line"><span className="ok">✓</span><span>Camera stream stable — 24fps, 0 dropped frames</span></div>
            <div className="line"><span className="ok">✓</span><span>Bed zone detection — patient identified in <span style={{color:"var(--fg-1)"}}>28/30</span> frames</span></div>
            <div className="line"><span className="ok">✓</span><span>Monitor OCR — 5/5 readings (HR, BP, SpO2, RR, MAP)</span></div>
            <div className="line"><span className="warn">⚠</span><span>IV crop — not enabled</span></div>
            <div className="line"><span className="ok">✓</span><span>Events firing as expected — <span className="dim">3 movement, 1 sit-up, 0 critical</span></span></div>
            <div style={{height:1, background:"var(--border)", margin:"8px 0"}}></div>
            <div className="line" style={{color:"var(--success-fg)"}}>
              <span>Test passed.</span>
              <span className="dim">Ready to go live.</span>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <button className="btn tertiary sm" onClick={onRunTest}>
              <I.Refresh size={13}/> Re-run test
            </button>
            <span className="muted-mono" style={{marginLeft:"auto"}}>
              Report · <a href="#" style={{color:"var(--brand-subtle-fg)"}}>view full log</a>
            </span>
          </div>
        </>
      )}
    </Section>
  );
}

/* ===================== SUMMARY CARD ===================== */
function SummaryCard({ completeCount, total, onSaveDraft, onGoLive }) {
  const pct = (completeCount / total) * 100;
  return (
    <div className="card summary-card">
      <div className="progress">
        <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between"}}>
          <span style={{fontSize:13, fontWeight:600}}>Setup status</span>
          <span className="mono" style={{fontSize:12, color:"var(--fg-2)"}}>
            <span style={{color:"var(--fg-1)", fontWeight:600}}>{completeCount}</span> of {total} complete
          </span>
        </div>
        <div className="progress-bar">
          <div className="fill" style={{width: `${pct}%`}}></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Section, StatusPill,
  SourceSection, BedSection, CropsSection, TestSection,
  SummaryCard, Stat,
});
