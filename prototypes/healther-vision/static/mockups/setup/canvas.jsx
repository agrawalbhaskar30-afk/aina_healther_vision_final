/* global React, ReactDOM */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ===================== ICONS (Lucide-style, 1.5px) ===================== */
const Icon = ({ d, size = 16, stroke = 1.5, fill = "none", children, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill={fill} stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round" {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);
const I = {
  ArrowLeft: (p) => <Icon {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Icon>,
  ChevronRight: (p) => <Icon {...p} d="m9 18 6-6-6-6"/>,
  ChevronDown:  (p) => <Icon {...p} d="m6 9 6 6 6-6"/>,
  Sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></Icon>,
  Moon: (p) => <Icon {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  Check: (p) => <Icon {...p} d="M20 6 9 17l-5-5"/>,
  CheckCircle: (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></Icon>,
  Plus: (p) => <Icon {...p}><path d="M12 5v14"/><path d="M5 12h14"/></Icon>,
  Minus: (p) => <Icon {...p} d="M5 12h14"/>,
  Trash: (p) => <Icon {...p}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></Icon>,
  Undo: (p) => <Icon {...p}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></Icon>,
  Redo: (p) => <Icon {...p}><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Icon>,
  Reset: (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></Icon>,
  Camera: (p) => <Icon {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></Icon>,
  Edit: (p) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></Icon>,
  Zap: (p) => <Icon {...p} d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>,
  Maximize: (p) => <Icon {...p}><path d="M3 9V3h6"/><path d="M21 9V3h-6"/><path d="M3 15v6h6"/><path d="M21 15v6h-6"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Help: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></Icon>,
  X: (p) => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>,
  Lock: (p) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
};

/* ===================== UTIL ===================== */
const SHAPE_META = {
  bed:     { label: "Bed zone",       stroke: "var(--bed-stroke)", fill: "var(--bed-fill)" },
  monitor: { label: "Monitor crop",   stroke: "var(--mon-stroke)", fill: "var(--mon-fill)" },
  iv:      { label: "IV/oxygen crop", stroke: "var(--iv-stroke)",  fill: "var(--iv-fill)" },
};

/* Coordinate system: SVG viewBox 1280 × 720, matching the picsum image */
const INITIAL_SHAPES = {
  bed: {
    type: "polygon",
    points: [
      [310, 410],
      [970, 410],
      [1095, 690],
      [190, 690],
    ],
  },
  monitor: {
    type: "rect",
    x: 870, y: 90, w: 310, h: 180,
  },
  iv: {
    type: "rect",
    x: 95, y: 80, w: 200, h: 290,
  },
};

const INITIAL_SECTIONS = {
  source:  { status: "complete",     open: false },
  bed:     { status: "in-progress",  open: true  },
  crops:   { status: "not-started",  open: false },
  test:    { status: "not-started",  open: false },
};

function BrandMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Aida">
      <path fill="currentColor" fillRule="evenodd" d="M14 0h36a14 14 0 0 1 14 14v36a14 14 0 0 1-14 14H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Zm-2 25a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h40a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H12Z"></path>
    </svg>
  );
}

/* ===================== TOP BAR ===================== */
function TopBar({ theme, onToggleTheme, onSave }) {
  return (
    <header className="topbar">
      <div className="left">
        <a href="#" className="brand-mark" aria-label="Aida home" style={{color:"var(--brand)", display:"inline-flex"}}>
          <BrandMark size={20}/>
        </a>
        <div className="crumbs">
          <a href="#" className="crumb-back">
            <I.ArrowLeft size={14}/> Back
          </a>
          <span className="sep">/</span>
          <span className="ctx">Ward 4 · ICU</span>
          <span className="sep">/</span>
          <span className="title">
            Setup <span className="ctx" style={{fontWeight:400}}>·</span>{" "}
            <span className="bed-id-mono">Bed&nbsp;ICU-2</span>
          </span>
        </div>
      </div>
      <div className="right">
        <span className="tag neutral mono" title="Draft auto-saves every 30s">
          <span className="dot gray"></span>Draft · saved 14:31
        </span>
        <div className="divider"></div>
        <button className="btn icon tertiary" title="Help">
          <I.Help size={15}/>
        </button>
        <button
          className="btn icon tertiary"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <I.Sun size={15}/> : <I.Moon size={15}/>}
        </button>
        <button className="btn secondary" onClick={onSave}>Save &amp; exit</button>
      </div>
    </header>
  );
}

/* ===================== DRAWING TOOLBAR ===================== */
function Toolbar({ tool, onTool, onUndo, onRedo, onReset, onClearShape }) {
  const ToolPill = ({ id, label }) => {
    const m = SHAPE_META[id];
    return (
      <button
        className={"tool-btn" + (tool === id ? " on" : "")}
        onClick={() => onTool(id)}
        style={{
          "--swatch-stroke": m.stroke,
          "--swatch-fill": m.fill,
        }}
      >
        <span className="swatch"></span>
        {label}
      </button>
    );
  };

  return (
    <div className="tool-bar" role="toolbar" aria-label="Drawing tools">
      <ToolPill id="bed"     label="Bed zone"/>
      <ToolPill id="monitor" label="Monitor crop"/>
      <ToolPill id="iv"      label="IV/oxygen crop"/>

      <div className="vsep"></div>

      <button className="tool-btn icon-only" title="Add point" disabled={tool !== "bed"}>
        <I.Plus size={15}/>
      </button>
      <button className="tool-btn icon-only" title="Remove point" disabled={tool !== "bed"}>
        <I.Minus size={15}/>
      </button>
      <button className="tool-btn icon-only" title="Clear shape" onClick={onClearShape}>
        <I.Trash size={14}/>
      </button>

      <div className="spacer"></div>

      <button className="tool-btn icon-only" title="Undo (⌘Z)" onClick={onUndo}>
        <I.Undo size={15}/>
      </button>
      <button className="tool-btn icon-only" title="Redo (⌘⇧Z)" onClick={onRedo}>
        <I.Redo size={15}/>
      </button>
      <div className="vsep"></div>
      <button className="tool-btn" onClick={onReset}>
        <I.Reset size={14}/> Reset all
      </button>
    </div>
  );
}

/* ===================== STAGE / CANVAS ===================== */
function Stage({ shapes, setShapes, tool, onTool, showFloor }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { shape, kind, index, startX, startY, origin }

  const VB_W = 1280, VB_H = 720;

  const toSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const sp = pt.matrixTransform(m.inverse());
    return [sp.x, sp.y];
  };

  const onPointerDown = (e, info) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = toSvgCoords(e);
    setDrag({ ...info, startX: x, startY: y, origin: JSON.parse(JSON.stringify(shapes[info.shape])) });
    onTool(info.shape);
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const [x, y] = toSvgCoords(e);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    setShapes(prev => {
      const next = { ...prev };
      const s = JSON.parse(JSON.stringify(drag.origin));
      if (drag.kind === "vertex") {
        // polygon vertex
        s.points[drag.index] = [
          clamp(drag.origin.points[drag.index][0] + dx, 0, VB_W),
          clamp(drag.origin.points[drag.index][1] + dy, 0, VB_H),
        ];
      } else if (drag.kind === "rect-corner") {
        // rect resize via corner: index 0..3 → tl,tr,br,bl
        const o = drag.origin;
        let { x: rx, y: ry, w, h } = o;
        let x2 = rx + w, y2 = ry + h;
        if (drag.index === 0) { rx = clamp(rx + dx, 0, x2 - 30); ry = clamp(ry + dy, 0, y2 - 30); }
        if (drag.index === 1) { x2 = clamp(x2 + dx, rx + 30, VB_W); ry = clamp(ry + dy, 0, y2 - 30); }
        if (drag.index === 2) { x2 = clamp(x2 + dx, rx + 30, VB_W); y2 = clamp(y2 + dy, ry + 30, VB_H); }
        if (drag.index === 3) { rx = clamp(rx + dx, 0, x2 - 30); y2 = clamp(y2 + dy, ry + 30, VB_H); }
        s.x = rx; s.y = ry; s.w = x2 - rx; s.h = y2 - ry;
      } else if (drag.kind === "body") {
        if (drag.origin.type === "polygon") {
          s.points = drag.origin.points.map(([px, py]) => [
            clamp(px + dx, 0, VB_W),
            clamp(py + dy, 0, VB_H),
          ]);
        } else {
          s.x = clamp(drag.origin.x + dx, 0, VB_W - drag.origin.w);
          s.y = clamp(drag.origin.y + dy, 0, VB_H - drag.origin.h);
        }
      }
      next[drag.shape] = s;
      return next;
    });
  };

  const onPointerUp = () => setDrag(null);

  // floor polygon = derived band below the bed polygon
  const floor = useMemo(() => {
    const bed = shapes.bed.points;
    if (!bed) return null;
    // bottom two vertices (highest y), shifted further down within frame
    const sorted = [...bed].sort((a,b) => b[1] - a[1]);
    const [b1, b2] = sorted.slice(0, 2).sort((a,b) => a[0] - b[0]);
    const padX = 60;
    return [
      [Math.max(0, b1[0] - padX), b1[1]],
      [Math.min(VB_W, b2[0] + padX), b2[1]],
      [VB_W, VB_H],
      [0, VB_H],
    ];
  }, [shapes.bed]);

  return (
    <div className="stage-wrap">
      <img
        src="https://picsum.photos/seed/icusetup3/1280/720"
        className="stage-image"
        alt="Camera still — ICU Bed 2"
        draggable="false"
      />
      <svg
        ref={svgRef}
        className="stage-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* dim outside selected shape, optional — skip for cleanliness */}

        {/* FLOOR (auto-derived) */}
        {showFloor && floor && (
          <g pointerEvents="none">
            <polygon
              points={floor.map(p => p.join(",")).join(" ")}
              fill="var(--floor-fill)"
              stroke="var(--floor-stroke)"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
            <ShapeLabel
              x={floor[0][0] + 8}
              y={floor[0][1] + 8}
              stroke="var(--floor-stroke)"
              text="Floor zone · auto"
              dashed
            />
          </g>
        )}

        {/* IV crop */}
        <Shape
          id="iv"
          data={shapes.iv}
          active={tool === "iv"}
          dim={tool !== "iv"}
          onBodyDown={(e) => onPointerDown(e, { shape: "iv", kind: "body" })}
          onCornerDown={(e, idx) => onPointerDown(e, { shape: "iv", kind: "rect-corner", index: idx })}
        />

        {/* Monitor crop */}
        <Shape
          id="monitor"
          data={shapes.monitor}
          active={tool === "monitor"}
          dim={tool !== "monitor"}
          onBodyDown={(e) => onPointerDown(e, { shape: "monitor", kind: "body" })}
          onCornerDown={(e, idx) => onPointerDown(e, { shape: "monitor", kind: "rect-corner", index: idx })}
        />

        {/* Bed zone (drawn last so it sits on top — it's the primary shape) */}
        <Shape
          id="bed"
          data={shapes.bed}
          active={tool === "bed"}
          dim={tool !== "bed"}
          onBodyDown={(e) => onPointerDown(e, { shape: "bed", kind: "body" })}
          onVertexDown={(e, idx) => onPointerDown(e, { shape: "bed", kind: "vertex", index: idx })}
        />
      </svg>

      {/* corner overlays */}
      <div className="stage-meta">
        <span className="chip live">LIVE STILL · 14:31:08</span>
        <span className="chip">1280×720 · 24fps</span>
        <span className="chip">ICU-2 · cam-04</span>
      </div>
      <div className="stage-corner-tr">
        <button className="icon-pill" title="Capture new still">
          <I.Camera size={13}/> New still
        </button>
        <button className="icon-pill" title="Fullscreen">
          <I.Maximize size={13}/>
        </button>
      </div>
    </div>
  );
}

/* A shape (polygon or rect) with body + handles */
function Shape({ id, data, active, dim, onBodyDown, onVertexDown, onCornerDown }) {
  const m = SHAPE_META[id];
  const stroke = m.stroke;
  const fill = m.fill;
  const opacity = dim ? 0.55 : 1;
  const dashArray = data.type === "rect" ? "8 6" : null;

  const pointsStr = data.type === "polygon"
    ? data.points.map(p => p.join(",")).join(" ")
    : null;

  // Label position — top-left of bounding box
  const bb = bbox(data);
  const labelW = (m.label.length * 6.4) + 16;

  return (
    <g className={"shape-group" + (active ? " active" : "")} opacity={opacity}>
      {/* fill / body */}
      {data.type === "polygon" ? (
        <polygon
          points={pointsStr}
          fill={fill}
          stroke={stroke}
          strokeWidth={active ? 2 : 1.5}
          onPointerDown={onBodyDown}
          style={{ cursor: "move" }}
        />
      ) : (
        <rect
          x={data.x} y={data.y} width={data.w} height={data.h}
          fill={fill}
          stroke={stroke}
          strokeWidth={active ? 2 : 1.5}
          strokeDasharray={dashArray}
          onPointerDown={onBodyDown}
          style={{ cursor: "move" }}
        />
      )}

      {/* label tag */}
      <g pointerEvents="none">
        <rect
          x={bb.x}
          y={bb.y - 20}
          width={labelW}
          height={18}
          rx={3}
          fill={stroke}
        />
        <text
          x={bb.x + 8}
          y={bb.y - 7}
          className="shape-label"
        >
          {m.label}
        </text>
      </g>

      {/* handles */}
      {active && data.type === "polygon" && data.points.map(([px, py], i) => (
        <Handle key={i} cx={px} cy={py} color={stroke} onPointerDown={(e) => onVertexDown(e, i)}/>
      ))}
      {active && data.type === "rect" && [
        [data.x, data.y],
        [data.x + data.w, data.y],
        [data.x + data.w, data.y + data.h],
        [data.x, data.y + data.h],
      ].map(([px, py], i) => (
        <Handle key={i} cx={px} cy={py} color={stroke} square onPointerDown={(e) => onCornerDown(e, i)}/>
      ))}

      {/* hairline midpoint markers (subtle, for polygon only) */}
      {active && data.type === "polygon" && data.points.map((p, i) => {
        const next = data.points[(i + 1) % data.points.length];
        const mx = (p[0] + next[0]) / 2;
        const my = (p[1] + next[1]) / 2;
        return (
          <circle key={`mid-${i}`} cx={mx} cy={my} r={3.5}
            fill="var(--surface)" stroke={stroke} strokeWidth="1.5"
            opacity="0.55" pointerEvents="none"/>
        );
      })}
    </g>
  );
}

function Handle({ cx, cy, color, square, onPointerDown }) {
  const size = 10;
  if (square) {
    return (
      <g className="handle" onPointerDown={onPointerDown}>
        <rect
          x={cx - size/2} y={cy - size/2}
          width={size} height={size}
          fill="#fff" stroke={color} strokeWidth="2"
          rx="1.5"
        />
      </g>
    );
  }
  return (
    <g className="handle" onPointerDown={onPointerDown}>
      <rect
        x={cx - size/2} y={cy - size/2}
        width={size} height={size}
        fill="#fff" stroke={color} strokeWidth="2"
        rx="2"
      />
    </g>
  );
}

function ShapeLabel({ x, y, stroke, text, dashed }) {
  const labelW = (text.length * 6.4) + 16;
  return (
    <g>
      <rect
        x={x} y={y}
        width={labelW} height={18}
        rx={3}
        fill={stroke}
        opacity={dashed ? 0.92 : 1}
      />
      <text
        x={x + 8} y={y + 13}
        className="shape-label"
      >
        {text}
      </text>
    </g>
  );
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function bbox(d) {
  if (d.type === "rect") return { x: d.x, y: d.y, w: d.w, h: d.h };
  let xs = d.points.map(p => p[0]);
  let ys = d.points.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

/* Make these available to other Babel scripts */
Object.assign(window, {
  I, SHAPE_META, INITIAL_SHAPES, INITIAL_SECTIONS,
  TopBar, Toolbar, Stage, clamp, bbox, polygonArea,
});
