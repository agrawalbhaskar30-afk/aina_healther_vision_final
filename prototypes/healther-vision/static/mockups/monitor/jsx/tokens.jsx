/* global React */
// Tokens, theme, brand mark, and a small icon set used across the page.

const { useState, useEffect, useMemo, useRef } = React;

// ----- Token data (rendered by the page) ---------------------------
const COLOR_GROUPS = [
  {
    title: "Surfaces",
    desc: "Backgrounds, cards, hairlines. Use position and contrast to define structure — not heavy strokes.",
    items: [
      { name: "bg",            light: "#FAFAF9", dark: "#0A0A09" },
      { name: "surface",       light: "#FFFFFF", dark: "#1C1C1B" },
      { name: "surface-2",     light: "#F5F5F4", dark: "#232220" },
      { name: "border",        light: "#E7E5E4", dark: "#292524" },
      { name: "border-strong", light: "#D6D3D1", dark: "#44403C" },
    ],
  },
  {
    title: "Text",
    desc: "Three-step text scale. Reach for fg-2 by default for supporting copy; fg-3 is for low-priority metadata only.",
    items: [
      { name: "fg-1", light: "#1C1917", dark: "#F5F5F4" },
      { name: "fg-2", light: "#57534E", dark: "#A8A29E" },
      { name: "fg-3", light: "#A8A29E", dark: "#57534E" },
    ],
  },
  {
    title: "Brand",
    desc: "A single muted teal. Use sparingly: active states, primary CTAs, the Aida accent.",
    items: [
      { name: "brand",        light: "#0F766E", dark: "#2DD4BF" },
      { name: "brand-hover",  light: "#115E59", dark: "#5EEAD4" },
      { name: "brand-subtle", light: "#F0FDFA", dark: "rgba(45,212,191,0.10)" },
    ],
  },
  {
    title: "Semantic",
    desc: "Desaturated by design — none of these should startle when used at small sizes. Red is reserved for genuinely critical states.",
    items: [
      { name: "critical", light: "#E11D48", dark: "#F43F5E" },
      { name: "warning",  light: "#D97706", dark: "#F59E0B" },
      { name: "success",  light: "#059669", dark: "#10B981" },
      { name: "info",     light: "#0284C7", dark: "#0EA5E9" },
    ],
  },
];

const TYPE_SCALE = [
  { name: "display", spec: "48 / 1.05 / 500 · mono · tabular-nums", className: "display", sample: "72" },
  { name: "h1",      spec: "24 / 1.25 / 600 · sans",                style: { fontSize: 24, fontWeight: 600, letterSpacing: "-0.011em" }, sample: "Patient overview" },
  { name: "h2",      spec: "18 / 1.35 / 600 · sans",                style: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.006em" }, sample: "Recent events" },
  { name: "body",    spec: "14 / 1.5 / 400 · sans",                 style: { fontSize: 14, fontWeight: 400 },                          sample: "Aida summarized the last shift handoff and flagged two events for review." },
  { name: "small",   spec: "12 / 1.4 / 500 · sans",                 style: { fontSize: 12, fontWeight: 500, color: "var(--fg-2)" },    sample: "Last updated 2 minutes ago" },
  { name: "tiny",    spec: "11 / 1.3 / 400 · mono",                 style: { fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }, sample: "MRN 4837210 · BED ICU-04" },
];

const SPACING = [
  { name: "space-1",  px: 4  },
  { name: "space-2",  px: 8  },
  { name: "space-3",  px: 12 },
  { name: "space-4",  px: 16 },
  { name: "space-6",  px: 24 },
  { name: "space-8",  px: 32 },
  { name: "space-12", px: 48 },
  { name: "space-16", px: 64 },
];

const RADII = [
  { name: "radius-sm", px: 4, use: "badges · chips" },
  { name: "radius-md", px: 6, use: "buttons · inputs · cards" },
  { name: "radius-lg", px: 8, use: "panels · modals" },
];

// ----- Brand mark --------------------------------------------------
function AidaMark({ size = 28, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      aria-label="Aida"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M14 0h36a14 14 0 0 1 14 14v36a14 14 0 0 1-14 14H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Zm-2 25a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h40a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H12Z"
      />
    </svg>
  );
}

// ----- Theme toggle ------------------------------------------------
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("aida-theme") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("aida-theme", theme); } catch {}
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="btn secondary md"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? <Icon name="moon" size={14} /> : <Icon name="sun" size={14} />}
      <span style={{ marginLeft: 4 }}>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}

// ----- Small inline icon set (Lucide-style, 1.5px stroke) ---------
const ICONS = {
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM21 21l-4.3-4.3",
  chevronDown: "m6 9 6 6 6-6",
  check: "M5 12.5 9.5 17 19 7",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  arrowUp:    "M12 19V5M5 12l7-7 7 7",
  arrowDown:  "M12 5v14M5 12l7 7 7-7",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  arrowFlat:  "M5 12h14",
  alert:      "M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  info:       "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 8h.01M11 12h1v4h1",
  shieldAlert:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01",
  sun:        "M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z",
  moon:       "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  more:       "M5 12h.01M12 12h.01M19 12h.01",
  stethoscope:"M6 3v6a4 4 0 0 0 8 0V3M9 21a3 3 0 0 1-3-3v-3M9 21a3 3 0 0 0 3-3v-3M18 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  activity:   "M22 12h-4l-3 9L9 3l-3 9H2",
  bed:        "M3 18V8h11a5 5 0 0 1 5 5v5M3 14h18M3 21v-3M21 21v-3M7 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  pill:       "M10.5 20.5a7 7 0 0 1-10-10l10-10a7 7 0 1 1 10 10l-10 10zM8.5 8.5l7 7",
  bell:       "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0",
  command:    "M18 6a3 3 0 1 1 0 6h-3V6h3zM18 18a3 3 0 1 0 0-6h-3v6h3zM6 6a3 3 0 1 0 0 6h3V6H6zM6 18a3 3 0 1 1 0-6h3v6H6z",
  video:      "M23 7l-7 5 7 5V7zM1 5h15v14H1z",
  camera:     "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11zM12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  send:       "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  chevronRight: "m9 18 6-6-6-6",
  chevronLeft:  "m15 18-6-6 6-6",
  chevronUp:    "m18 15-6-6-6 6",
  user:       "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  userCheck:  "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM17 11l2 2 4-4",
  userX:      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM18 8l5 5M23 8l-5 5",
  clock:      "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2",
  expand:     "M4 14v6h6M20 10V4h-6M14 10l7-7M3 21l7-7",
  circle:     "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  bedExit:    "M3 18V8h11a5 5 0 0 1 5 5v5M3 14h12M3 21v-3M21 21v-3M16 4l5 5M21 4l-5 5",
  footprints: "M4 16a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2H4v-2zM13 6a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v2h-6V6z",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  refresh:    "M21 12a9 9 0 0 1-15.5 6.3L1 14M3 12a9 9 0 0 1 15.5-6.3L23 10M1 4v6h6M23 20v-6h-6",
  mic:        "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  trendingDown:"M22 17l-9.5-9.5-5 5L1 6M16 17h6v-6",
  trendingFlat:"M5 12h14",
  chart:      "M3 3v18h18M7 14l4-4 3 3 5-6",
  pin:        "M12 17v5M5 8a7 7 0 0 1 14 0c0 3-2 6-7 9-5-3-7-6-7-9z",
  filter:     "M3 4h18l-7 9v7l-4-2v-5L3 4z",
  layers:     "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  zap:        "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
  panelRightClose: "M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zM15 3v18M10 15l-3-3 3-3",
  panelRightOpen:  "M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zM15 3v18M8 9l3 3-3 3",
};

function Icon({ name, size = 16, strokeWidth = 1.5, className = "", style = {} }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}

Object.assign(window, {
  COLOR_GROUPS, TYPE_SCALE, SPACING, RADII,
  AidaMark, ThemeToggle, useTheme, Icon,
});
