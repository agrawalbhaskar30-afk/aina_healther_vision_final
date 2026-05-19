/* global React, ReactDOM, AidaMark, Icon, useTheme,
   ConnectionStates, BedStates, EmptyStates, LoadingStates, ErrorStates,
   CriticalAlerts, ThemeTransitions, DensityVariations,
   AccessibilityHighlights, TabletSnapshot */

const { useState, useEffect, useRef } = React;

const TOC = [
  { id: "s1",  num: "01", label: "Connection states" },
  { id: "s2",  num: "02", label: "Bed state variations" },
  { id: "s3",  num: "03", label: "Empty states" },
  { id: "s4",  num: "04", label: "Loading states" },
  { id: "s5",  num: "05", label: "Error states" },
  { id: "s6",  num: "06", label: "Critical alert handling" },
  { id: "s7",  num: "07", label: "Theme transitions" },
  { id: "s8",  num: "08", label: "Density variations" },
  { id: "s9",  num: "09", label: "Accessibility highlights" },
  { id: "s10", num: "10", label: "Tablet snapshot" },
];

function useTOCActive() {
  const [active, setActive] = useState("s1");
  useEffect(() => {
    const els = TOC.map((t) => document.getElementById(t.id)).filter(Boolean);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return active;
}

function RefTopbar({ theme, setTheme }) {
  return (
    <div className="ref-topbar">
      <span className="mark"><AidaMark size={22} /></span>
      <span className="crumbs">
        <span className="seg">Aida</span>
        <span className="slash">/</span>
        <span className="seg">Design</span>
        <span className="slash">/</span>
        <span className="seg current">State reference</span>
      </span>
      <div className="right">
        <span className="doc-pill">
          <Icon name="layers" size={11} strokeWidth={2} />
          Reference doc
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
      </div>
    </div>
  );
}

function TableOfContents() {
  const active = useTOCActive();
  return (
    <aside className="ref-toc" aria-label="Section navigation">
      <div className="toc-label">Sections · 10</div>
      <nav>
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={active === t.id ? "active" : ""}>
            <span className="num">{t.num}</span>
            <span className="lbl">{t.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Hero() {
  return (
    <header className="ref-hero">
      <div className="eyebrow">AIDA · POLISH PASS · V1</div>
      <h1>State reference</h1>
      <p>
        A single-page catalogue of the edge cases and state variations that
        don't appear in the three primary screens. Use these specimens as the
        visual source-of-truth when wiring production components — every empty,
        loading, error, and critical state has a designed answer here.
      </p>
      <div className="hero-meta">
        <span><strong>Target</strong> 1440px desktop</span>
        <span><strong>Themes</strong> light, dark</span>
        <span><strong>Sections</strong> 10</span>
        <span><strong>Variants</strong> 40+</span>
      </div>
    </header>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("aida-ref-theme") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("aida-ref-theme", theme); } catch {}
  }, [theme]);

  return (
    <React.Fragment>
      <RefTopbar theme={theme} setTheme={setTheme} />
      <div className="ref-page">
        <TableOfContents />
        <main id="main">
          <Hero />
          <ConnectionStates />
          <BedStates />
          <EmptyStates />
          <LoadingStates />
          <ErrorStates />
          <CriticalAlerts />
          <ThemeTransitions />
          <DensityVariations />
          <AccessibilityHighlights />
          <TabletSnapshot />

          <div className="ref-foot">
            <div className="left">
              <AidaMark size={14} />
              <span>aida · state reference</span>
            </div>
            <div>v1.0 · {new Date().getFullYear()}</div>
          </div>
        </main>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
