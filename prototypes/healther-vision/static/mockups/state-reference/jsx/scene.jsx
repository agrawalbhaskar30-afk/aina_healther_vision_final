/* global React */
// ICU room scene (the background of the "live video") + overlays.
// Stylized SVG illustration of an ICU room: window with daylight, bed with
// patient under blanket, bedside monitor on the right wall.

function ICURoomScene({ variant = "bedside-1" }) {
  return (
    <svg
      className="scene"
      viewBox="0 0 1280 720"
      preserveAspectRatio="xMidYMid slice"
      aria-label="ICU room — Bedside Cam 1"
    >
      <defs>
        <linearGradient id="sc-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2530" />
          <stop offset="55%" stopColor="#141d26" />
          <stop offset="100%" stopColor="#0c141c" />
        </linearGradient>
        <linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a232c" />
          <stop offset="100%" stopColor="#0c1218" />
        </linearGradient>
        <linearGradient id="sc-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9bbedc" />
          <stop offset="55%" stopColor="#6b8eaf" />
          <stop offset="100%" stopColor="#4b6c8a" />
        </linearGradient>
        <linearGradient id="sc-blanket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5d6e7e" />
          <stop offset="100%" stopColor="#3a4651" />
        </linearGradient>
        <linearGradient id="sc-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#46545f" />
          <stop offset="100%" stopColor="#2c3640" />
        </linearGradient>
        <radialGradient id="sc-spot" cx="0.22" cy="0.28" r="0.45">
          <stop offset="0%" stopColor="#9bbedc" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#5b7fa1" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-vig" cx="0.5" cy="0.5" r="0.7">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>

        {/* Tiny noise pattern to make it feel like video */}
        <filter id="sc-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.04 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Back wall */}
      <rect width="1280" height="720" fill="url(#sc-wall)" />

      {/* Window light spill */}
      <rect width="1280" height="720" fill="url(#sc-spot)" />

      {/* Window */}
      <g>
        <rect x="90" y="70" width="310" height="260" rx="2" fill="url(#sc-window)" />
        {/* Frame */}
        <rect x="90" y="70" width="310" height="260" rx="2" fill="none" stroke="#2c3a48" strokeWidth="2.5" />
        {/* Mullions */}
        <line x1="245" y1="70" x2="245" y2="330" stroke="#2c3a48" strokeWidth="3" />
        <line x1="90" y1="200" x2="400" y2="200" stroke="#2c3a48" strokeWidth="3" />
        {/* Faint cloud shapes */}
        <ellipse cx="180" cy="160" rx="60" ry="14" fill="#c8d8e8" opacity="0.32" />
        <ellipse cx="320" cy="240" rx="48" ry="12" fill="#c8d8e8" opacity="0.22" />
        {/* Sill */}
        <rect x="80" y="328" width="330" height="6" rx="1" fill="#374554" />
      </g>

      {/* Curtain track (subtle) */}
      <rect x="60" y="60" width="380" height="3" fill="#26323e" />

      {/* Curtain — left edge */}
      <g opacity="0.85">
        <rect x="0" y="60" width="68" height="460" fill="#1a232c" />
        <line x1="20" y1="60" x2="20" y2="520" stroke="#101820" strokeWidth="1" />
        <line x1="40" y1="60" x2="40" y2="520" stroke="#101820" strokeWidth="1" />
        <line x1="58" y1="60" x2="58" y2="520" stroke="#101820" strokeWidth="1" />
      </g>

      {/* Floor band */}
      <rect x="0" y="520" width="1280" height="200" fill="url(#sc-floor)" />
      <line x1="0" y1="520" x2="1280" y2="520" stroke="#26323e" strokeWidth="1" />
      {/* Faint floor reflections */}
      <ellipse cx="640" cy="690" rx="600" ry="22" fill="#2a3540" opacity="0.35" />

      {/* IV pole behind bed */}
      <g>
        <rect x="1112" y="158" width="3" height="372" fill="#5a6b7a" />
        <line x1="1080" y1="160" x2="1144" y2="160" stroke="#5a6b7a" strokeWidth="3" />
        {/* IV bag */}
        <path d="M1098 175 L1130 175 L1126 232 Q1126 240 1118 240 L1110 240 Q1102 240 1102 232 Z"
              fill="#b8c9da" opacity="0.78" />
        {/* IV line */}
        <path d="M1114 240 Q1114 290 1040 320 Q970 348 920 410"
              fill="none" stroke="#9bb0c6" strokeWidth="1.1" opacity="0.55" />
        {/* Base */}
        <line x1="1080" y1="528" x2="1144" y2="528" stroke="#5a6b7a" strokeWidth="2.5" />
        <line x1="1085" y1="525" x2="1085" y2="535" stroke="#5a6b7a" strokeWidth="1.5" />
        <line x1="1140" y1="525" x2="1140" y2="535" stroke="#5a6b7a" strokeWidth="1.5" />
      </g>

      {/* Bed (parallelogram with subtle perspective) */}
      <g>
        {/* Shadow under bed */}
        <ellipse cx="630" cy="630" rx="380" ry="22" fill="#000" opacity="0.45" />

        {/* Bed frame base */}
        <path d="M 270 600 L 290 410 L 990 410 L 1010 600 Z" fill="#212a34" />

        {/* Mattress / sheets */}
        <path d="M 290 410 L 990 410 L 1006 590 L 274 590 Z" fill="url(#sc-sheet)" />

        {/* Side rail (foot end) */}
        <rect x="285" y="402" width="14" height="50" rx="2" fill="#3a4651" />
        <rect x="982" y="402" width="14" height="50" rx="2" fill="#3a4651" />
        <line x1="299" y1="412" x2="982" y2="412" stroke="#3a4651" strokeWidth="2" />

        {/* Blanket — foot half */}
        <path d="M 290 410 L 660 408 L 700 588 L 282 588 Z" fill="url(#sc-blanket)" />
        {/* Blanket fold line */}
        <path d="M 660 408 L 700 588" stroke="#2c3640" strokeWidth="1.5" opacity="0.6" />
        {/* Subtle blanket creases */}
        <path d="M 380 430 Q 420 510 460 580" stroke="#2c3640" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M 530 425 Q 560 500 590 580" stroke="#2c3640" strokeWidth="1" fill="none" opacity="0.4" />

        {/* Patient body shapes under blanket - feet bumps */}
        <ellipse cx="360" cy="495" rx="38" ry="14" fill="#4d5e6f" opacity="0.85" />
        <ellipse cx="430" cy="475" rx="32" ry="11" fill="#4d5e6f" opacity="0.7" />

        {/* Patient torso area (above blanket fold) */}
        <ellipse cx="780" cy="475" rx="105" ry="32" fill="#3a4651" opacity="0.8" />
        {/* Gown — slight green tint */}
        <path d="M 700 460 Q 700 490 730 500 L 850 502 Q 880 492 880 462 Q 880 445 855 440 L 720 440 Q 700 445 700 460 Z"
              fill="#4a5e6f" opacity="0.7" />

        {/* Pillow */}
        <ellipse cx="900" cy="450" rx="78" ry="22" fill="#d4dee8" opacity="0.88" />
        <ellipse cx="900" cy="446" rx="68" ry="14" fill="#e9eef3" opacity="0.6" />

        {/* Head */}
        <ellipse cx="900" cy="443" rx="28" ry="32" fill="#b8a48c" opacity="0.86" />
        {/* Hair */}
        <path d="M 874 432 Q 900 412 928 434 Q 928 425 916 418 Q 904 410 893 412 Q 879 416 874 432 Z"
              fill="#3b322a" opacity="0.9" />
        {/* Pillow shadow under head */}
        <ellipse cx="900" cy="470" rx="30" ry="6" fill="#000" opacity="0.18" />
        {/* Cannula hint */}
        <path d="M 905 458 L 915 470 M 895 458 L 885 470" stroke="#d4dee8" strokeWidth="1" opacity="0.55" />

        {/* Arm exposed above blanket */}
        <path d="M 720 482 Q 760 500 810 498" fill="none" stroke="#b8a48c" strokeWidth="14" strokeLinecap="round" opacity="0.55" />
        {/* Wristband */}
        <rect x="720" y="478" width="14" height="10" rx="2" fill="#0f766e" opacity="0.7" />
      </g>

      {/* Bedside monitor on right */}
      <g>
        {/* Mount arm */}
        <rect x="1156" y="280" width="60" height="6" rx="2" fill="#3a4651" />
        <rect x="1212" y="280" width="6" height="120" fill="#3a4651" />
        {/* Monitor body */}
        <rect x="1085" y="270" width="140" height="120" rx="5" fill="#16202a" stroke="#3a4651" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="1093" y="278" width="124" height="104" rx="2" fill="#06090d" />
        {/* HR waveform */}
        <polyline
          points="1095,310 1110,310 1115,304 1119,318 1124,294 1130,322 1135,310 1148,310 1158,310 1162,306 1167,316 1180,310 1198,310 1208,310 1216,310"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.3"
          opacity="0.95"
        />
        {/* HR number */}
        <text x="1099" y="345" fontFamily="JetBrains Mono, monospace" fontSize="20" fontWeight="600" fill="#22d3ee">72</text>
        <text x="1138" y="345" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#22d3ee" opacity="0.7">bpm</text>
        {/* SpO2 - slight color shift to amber for the dip */}
        <text x="1099" y="372" fontFamily="JetBrains Mono, monospace" fontSize="14" fontWeight="600" fill="#f59e0b">94</text>
        <text x="1128" y="372" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#f59e0b" opacity="0.7">%</text>
        {/* BP */}
        <text x="1170" y="345" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#a8e6cf">118/76</text>
        <text x="1170" y="372" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#a8e6cf">RR 18</text>
        {/* Status LED */}
        <circle cx="1219" cy="278" r="2" fill="#10b981" />
      </g>

      {/* Tray table - lower left foreground */}
      <g opacity="0.85">
        <rect x="120" y="600" width="170" height="6" rx="2" fill="#2c3640" />
        <line x1="135" y1="606" x2="135" y2="700" stroke="#2c3640" strokeWidth="2" />
        <line x1="275" y1="606" x2="275" y2="700" stroke="#2c3640" strokeWidth="2" />
        {/* Cup */}
        <ellipse cx="180" cy="603" rx="14" ry="3" fill="#3a4651" />
        <path d="M166 602 L170 612 L190 612 L194 602 Z" fill="#3a4651" />
      </g>

      {/* Door frame on far right (slightly visible) */}
      <line x1="1245" y1="80" x2="1245" y2="520" stroke="#26323e" strokeWidth="1.5" />

      {/* Soft vignette */}
      <rect width="1280" height="720" fill="url(#sc-vig)" />

      {/* Subtle film grain */}
      <rect width="1280" height="720" fill="#fff" opacity="0.025" filter="url(#sc-grain)" />
    </svg>
  );
}

// Detection overlays drawn on top of the scene SVG. Coordinates match the
// 1280×720 viewBox of the scene.
function DetectionOverlay({ showPersonBox = true, showBedZone = true, showMonitorCrop = true }) {
  return (
    <svg
      className="detections"
      viewBox="0 0 1280 720"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="bz-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#0f766e" strokeWidth="0.8" opacity="0.35" />
        </pattern>
      </defs>

      {/* Bed-zone polygon — outlines the bed area in perspective */}
      {showBedZone && (
        <g>
          <polygon
            points="282,400 998,400 1018,600 262,600"
            fill="rgba(45, 212, 191, 0.10)"
            stroke="rgba(45, 212, 191, 0.85)"
            strokeWidth="1.5"
            strokeDasharray="0"
          />
          {/* Corner pips */}
          {[[282,400],[998,400],[1018,600],[262,600]].map(([x,y], i) => (
            <g key={i}>
              <line x1={x-6} y1={y} x2={x+6} y2={y} stroke="#2dd4bf" strokeWidth="1.5" />
              <line x1={x} y1={y-6} x2={x} y2={y+6} stroke="#2dd4bf" strokeWidth="1.5" />
            </g>
          ))}
          {/* Label */}
          <g transform="translate(282, 380)">
            <rect x="0" y="-14" width="78" height="18" rx="3" className="ov-label-bg" />
            <text x="6" y="-1" className="ov-label">bed_zone</text>
          </g>
        </g>
      )}

      {/* Person detection box */}
      {showPersonBox && (
        <g>
          <rect
            x="700" y="408" width="248" height="100"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.8"
          />
          {/* Corner brackets accent */}
          {[[700,408],[948,408],[948,508],[700,508]].map(([x,y], i) => {
            const dx = i === 1 || i === 2 ? -12 : 12;
            const dy = i >= 2 ? -12 : 12;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x+dx} y2={y} stroke="#2dd4bf" strokeWidth="2.5" />
                <line x1={x} y1={y} x2={x} y2={y+dy} stroke="#2dd4bf" strokeWidth="2.5" />
              </g>
            );
          })}
          {/* Label */}
          <g transform="translate(700, 388)">
            <rect x="0" y="-14" width="108" height="18" rx="3" className="ov-label-bg" />
            <text x="6" y="-1" className="ov-label">patient · 0.94</text>
          </g>
        </g>
      )}

      {/* Monitor crop indicator — dashed teal box around the monitor */}
      {showMonitorCrop && (
        <g>
          <rect
            x="1080" y="265" width="148" height="130"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.4"
            strokeDasharray="6 4"
            opacity="0.85"
          />
          {/* Label */}
          <g transform="translate(1080, 245)">
            <rect x="0" y="-14" width="128" height="18" rx="3" className="ov-label-bg" />
            <text x="6" y="-1" className="ov-label">monitor · OCR active</text>
          </g>
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { ICURoomScene, DetectionOverlay });
