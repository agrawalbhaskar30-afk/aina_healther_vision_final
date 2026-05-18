from __future__ import annotations


def monitor_console_html() -> str:
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AINA One-Bed Remote Monitor</title>
  <style>
    :root {
      color-scheme: dark;
      --bg:#030712;
      --glass:rgba(18, 24, 36, 0.62);
      --glass-strong:rgba(17, 24, 39, 0.82);
      --line:rgba(255,255,255,0.18);
      --text:#f8fafc;
      --muted:#aab5c4;
      --blue:#4d86ff;
      --green:#45c26f;
      --amber:#f5c542;
      --red:#f04444;
      --cyan:#74e6ff;
    }

    * { box-sizing:border-box; }

    body {
      margin:0;
      min-height:100vh;
      background:var(--bg);
      color:var(--text);
      font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow:hidden;
    }

    .app {
      position:relative;
      width:100vw;
      height:100vh;
      background:#020617;
    }

    .feed {
      position:absolute;
      inset:0;
      display:grid;
      place-items:center;
      overflow:hidden;
      background:#020617;
    }

    .feed img {
      width:100%;
      height:100%;
      object-fit:cover;
      filter:saturate(0.92) contrast(1.04);
    }

    .scanlines {
      position:absolute;
      inset:0;
      pointer-events:none;
      background:repeating-linear-gradient(0deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 1px, transparent 1px, transparent 5px);
      mix-blend-mode:soft-light;
      opacity:.42;
    }

    .shade {
      position:absolute;
      inset:0;
      pointer-events:none;
      background:
        linear-gradient(90deg, rgba(2,6,23,.62), rgba(2,6,23,.05) 24%, rgba(2,6,23,.06) 68%, rgba(2,6,23,.66)),
        linear-gradient(0deg, rgba(2,6,23,.7), transparent 34%, rgba(2,6,23,.42));
    }

    .topbar {
      position:absolute;
      top:22px;
      left:32px;
      right:32px;
      display:flex;
      align-items:center;
      justify-content:center;
      pointer-events:none;
      z-index:5;
    }

    .patient-pill {
      display:flex;
      align-items:center;
      gap:12px;
      min-height:48px;
      padding:8px 16px 8px 10px;
      border:1px solid var(--line);
      border-radius:999px;
      background:var(--glass);
      backdrop-filter:blur(18px);
      box-shadow:0 16px 50px rgba(0,0,0,.25);
      pointer-events:auto;
    }

    .avatar {
      width:34px;
      height:34px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:rgba(255,255,255,.16);
      font-weight:800;
    }

    .patient-pill strong { font-size:17px; }
    .patient-pill span { color:var(--muted); font-weight:700; }

    .code {
      margin-left:6px;
      padding:8px 16px;
      border-radius:999px;
      background:var(--blue);
      color:white;
      font-weight:900;
    }

    .brand {
      position:absolute;
      top:30px;
      left:34px;
      z-index:6;
      display:flex;
      align-items:center;
      gap:11px;
      color:#e6edf8;
      font-weight:900;
      letter-spacing:.2px;
    }

    .mark {
      width:34px;
      height:34px;
      border:2px solid rgba(255,255,255,.8);
      border-radius:12px;
      transform:rotate(45deg);
    }

    .left-rail {
      position:absolute;
      top:128px;
      left:30px;
      width:142px;
      z-index:5;
      display:grid;
      gap:12px;
    }

    .call {
      width:58px;
      height:58px;
      display:grid;
      place-items:center;
      border:0;
      border-radius:50%;
      background:#5cc86f;
      color:white;
      font-size:28px;
      box-shadow:0 14px 34px rgba(29, 185, 84, .34);
    }

    .rail-icons {
      display:flex;
      gap:9px;
    }

    .icon-btn {
      width:42px;
      height:42px;
      display:grid;
      place-items:center;
      border:1px solid var(--line);
      border-radius:50%;
      background:rgba(17,24,39,.56);
      color:#e5e7eb;
      backdrop-filter:blur(12px);
    }

    .vitals {
      width:126px;
      padding:10px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--glass);
      backdrop-filter:blur(16px);
    }

    .vitals h2 {
      margin:0 0 8px;
      font-size:13px;
      color:#d6deea;
    }

    .vital {
      padding:9px;
      margin:7px 0;
      border-radius:7px;
      background:rgba(255,255,255,.16);
    }

    .vital label {
      display:block;
      color:#dbe3ee;
      font-size:12px;
      font-weight:800;
    }

    .vital strong {
      display:block;
      margin-top:2px;
      font-size:19px;
    }

    .vitals button {
      width:100%;
      padding:7px;
      border:0;
      border-radius:6px;
      background:rgba(255,255,255,.16);
      color:#e7edf6;
      font-weight:800;
    }

    .assistant {
      position:absolute;
      top:118px;
      right:30px;
      bottom:118px;
      width:min(430px, 32vw);
      min-width:350px;
      z-index:5;
      display:flex;
      flex-direction:column;
      border:1px solid var(--line);
      border-radius:10px;
      overflow:hidden;
      background:rgba(31, 41, 55, .58);
      backdrop-filter:blur(20px);
      box-shadow:0 18px 60px rgba(0,0,0,.34);
    }

    .assistant-head {
      min-height:54px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:0 18px;
      border-bottom:1px solid rgba(255,255,255,.12);
      font-weight:900;
    }

    .assistant-body {
      flex:1;
      padding:16px;
      overflow:auto;
    }

    .summary {
      color:#e8edf5;
      font-size:15px;
      font-style:italic;
    }

    .summary a { color:#8bb7ff; font-style:normal; font-weight:900; }

    .alert-card {
      margin-top:16px;
      padding:14px;
      border-radius:8px;
      background:var(--red);
      color:white;
      font-weight:900;
      box-shadow:0 10px 26px rgba(240,68,68,.24);
    }

    .alert-card button {
      float:right;
      margin-top:8px;
      border:0;
      border-radius:6px;
      padding:8px 11px;
      background:#ffd6d6;
      color:#9b1c1c;
      font-weight:900;
    }

    .assistant-log {
      margin-top:18px;
      display:grid;
      gap:10px;
    }

    .msg {
      padding:10px 12px;
      border:1px solid rgba(255,255,255,.13);
      border-radius:8px;
      background:rgba(15,23,42,.56);
      color:#dbe5f2;
      font-size:14px;
    }

    .assistant-input {
      display:flex;
      gap:10px;
      padding:14px;
      border-top:1px solid rgba(255,255,255,.12);
    }

    .assistant-input input {
      min-width:0;
      flex:1;
      border:0;
      border-radius:5px;
      padding:13px 14px;
      background:rgba(255,255,255,.82);
      color:#111827;
      font-size:15px;
    }

    .assistant-input button {
      width:50px;
      border:0;
      border-radius:5px;
      background:transparent;
      color:#c7d2fe;
      font-size:32px;
      font-weight:900;
    }

    .timeline-wrap {
      position:absolute;
      left:205px;
      right:500px;
      bottom:34px;
      height:132px;
      z-index:5;
      border:1px solid var(--line);
      border-radius:9px;
      background:rgba(15,23,42,.42);
      backdrop-filter:blur(16px);
      overflow:hidden;
    }

    .timeline-date {
      position:absolute;
      left:20px;
      bottom:48px;
      color:#d5dce7;
      font-weight:900;
    }

    .timeline-line {
      position:absolute;
      left:0;
      right:0;
      top:64px;
      height:2px;
      background:rgba(255,255,255,.55);
    }

    .tick {
      position:absolute;
      top:54px;
      width:20px;
      height:20px;
      border-radius:50%;
      background:rgba(15,23,42,.92);
      border:2px solid rgba(255,255,255,.6);
      transform:translateX(-10px);
    }

    .tick.warning { background:var(--amber); border-color:#fff5c4; }
    .tick.info { background:var(--blue); border-color:#dbeafe; }
    .tick.critical { background:var(--red); border-color:#fecaca; }

    .event-toast {
      position:absolute;
      left:170px;
      top:18px;
      min-width:380px;
      padding:14px 52px 14px 18px;
      border-radius:7px;
      background:var(--amber);
      color:#1f2937;
      font-size:23px;
      font-weight:900;
      box-shadow:0 16px 35px rgba(245,197,66,.28);
    }

    .event-toast .x {
      position:absolute;
      right:16px;
      top:15px;
      width:28px;
      height:28px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:rgba(255,255,255,.55);
      color:#4b5563;
    }

    .review {
      position:absolute;
      left:56%;
      top:38%;
      padding:14px 70px 14px 28px;
      border:0;
      border-radius:7px;
      background:var(--red);
      color:white;
      font-size:24px;
      font-weight:900;
      box-shadow:0 14px 34px rgba(240,68,68,.28);
    }

    .trend {
      position:absolute;
      left:250px;
      right:475px;
      top:37%;
      height:210px;
      border-radius:8px;
      background:rgba(15,23,42,.12);
      pointer-events:none;
      opacity:.88;
    }

    .trend svg {
      width:100%;
      height:100%;
      overflow:visible;
    }

    .trend text {
      fill:#f8fafc;
      font-size:13px;
      font-weight:800;
    }

    .agent-harness {
      position:absolute;
      right:30px;
      bottom:34px;
      width:min(430px,32vw);
      min-width:350px;
      display:grid;
      grid-template-columns:repeat(3, 1fr);
      gap:8px;
      z-index:6;
    }

    .agent {
      min-height:58px;
      padding:9px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--glass-strong);
      backdrop-filter:blur(12px);
    }

    .agent span {
      display:block;
      color:var(--muted);
      font-size:11px;
      font-weight:900;
      text-transform:uppercase;
    }

    .agent strong {
      display:block;
      margin-top:2px;
      font-size:14px;
    }

    .source-panel {
      position:absolute;
      left:205px;
      top:118px;
      width:320px;
      z-index:5;
      border:1px solid var(--line);
      border-radius:9px;
      background:rgba(17, 24, 39, .5);
      backdrop-filter:blur(18px);
      overflow:hidden;
      display:none;
    }

    .source-panel.open { display:block; }

    .source-panel h3 {
      margin:0;
      padding:14px;
      border-bottom:1px solid rgba(255,255,255,.12);
    }

    .source-panel .xray {
      margin:14px;
      aspect-ratio:4/5;
      border-radius:6px;
      background:radial-gradient(circle at 50% 34%, #d7f2ff, #6b91a5 34%, #152432 70%);
      opacity:.9;
    }

    .controls {
      position:absolute;
      left:50%;
      bottom:176px;
      z-index:8;
      display:flex;
      gap:8px;
      transform:translateX(-50%);
    }

    .controls button, .controls select, .controls input {
      border:1px solid var(--line);
      border-radius:7px;
      background:rgba(15,23,42,.82);
      color:#eef2ff;
      padding:9px 11px;
      font-weight:800;
    }

    @media (max-width:1100px) {
      body { overflow:auto; }
      .app { min-height:1180px; height:auto; }
      .assistant, .agent-harness, .timeline-wrap, .left-rail, .source-panel, .topbar, .brand, .controls {
        position:relative;
        inset:auto;
        left:auto;
        right:auto;
        bottom:auto;
        top:auto;
        width:calc(100% - 28px);
        min-width:0;
        margin:14px;
      }
      .feed { position:relative; height:54vh; min-height:360px; }
      .timeline-wrap { height:140px; }
      .shade, .scanlines { position:absolute; }
      .trend, .review { display:none; }
    }
  </style>
</head>
<body>
  <main class="app">
    <section class="feed" aria-label="Live patient room video feed">
      <img id="stream" src="/v0/monitor/stream.mjpg?source=synthetic&scenario=normal&fps=4" alt="Live one-bed patient room feed" />
      <div class="scanlines"></div>
      <div class="shade"></div>
    </section>

    <div class="brand"><div class="mark"></div><span>AINA Healther Vision</span></div>

    <div class="topbar">
      <div class="patient-pill">
        <div class="avatar">PV</div>
        <strong>Pamela Vincent</strong>
        <span>74, F</span>
        <span>⌄</span>
        <div class="code">Watch</div>
      </div>
    </div>

    <aside class="left-rail">
      <button class="call" title="Call bedside">☎</button>
      <div class="rail-icons">
        <button class="icon-btn" title="Vitals">♡</button>
        <button class="icon-btn" title="Targets">◎</button>
      </div>
      <section class="vitals">
        <h2>Vitals</h2>
        <div class="vital"><label>HR</label><strong id="hr">96 bpm</strong></div>
        <div class="vital"><label>BP</label><strong id="bp">124/80</strong></div>
        <div class="vital"><label>SpO2</label><strong id="spo2">94%</strong></div>
        <div class="vital"><label>RR</label><strong id="rr">22</strong></div>
        <button id="trend-toggle">View trends</button>
      </section>
      <button class="icon-btn" id="xray-toggle" title="Open imaging">▣</button>
    </aside>

    <section class="source-panel" id="xray-panel">
      <h3>‹ X-rays</h3>
      <div class="xray"></div>
    </section>

    <section class="assistant" aria-label="Ask AINA assistant">
      <div class="assistant-head"><span>Ask AINA</span><span>⌄</span></div>
      <div class="assistant-body">
        <p class="summary">A 74-year-old female is admitted for close observation after aspiration pneumonia and intermittent desaturation. <a>Show more</a></p>
        <div class="alert-card">
          Patient with possible breathing distress detected.
          <button>Review</button>
        </div>
        <div class="assistant-log" id="assistant-log">
          <div class="msg">The room feed is live. Camera, event timeline, vitals OCR, evidence, and agent memory are connected.</div>
          <div class="msg">Latest interpretation: patient in bed, no staff present, oxygen visible, IV running.</div>
        </div>
      </div>
      <div class="assistant-input">
        <input id="assistant-input" placeholder="Ask about the room, vitals, events, or evidence..." />
        <button id="assistant-send" title="Send">›</button>
      </div>
    </section>

    <section class="trend" id="trend">
      <svg viewBox="0 0 700 210" preserveAspectRatio="none">
        <path d="M20,138 C120,118 180,148 245,130 C310,110 340,70 415,92 C500,115 540,32 675,78" fill="none" stroke="#f59e0b" stroke-width="6" />
        <path d="M20,150 C125,120 190,146 250,122 C330,95 360,72 430,108 C515,152 560,112 675,118" fill="none" stroke="#e5e7eb" stroke-width="4" opacity=".86" />
        <path d="M20,156 C110,178 190,164 255,172 C335,182 412,84 482,102 C560,110 610,90 675,136" fill="none" stroke="#84cc16" stroke-width="5" />
        <text x="8" y="30">HR</text>
        <text x="16" y="186">07 Feb 2025</text>
        <text x="600" y="186">Now</text>
      </svg>
    </section>

    <button class="review" id="review-button">Review event</button>

    <section class="timeline-wrap" aria-label="Patient event timeline">
      <div class="timeline-line"></div>
      <div class="timeline-date">07 Feb 2025</div>
      <span class="tick info" style="left:16%"></span>
      <span class="tick warning" style="left:38%"></span>
      <span class="tick info" style="left:61%"></span>
      <span class="tick critical" style="left:83%"></span>
      <div class="event-toast" id="event-toast">No movement detected for the last 3 hours.<span class="x">×</span></div>
    </section>

    <section class="agent-harness" aria-label="Agent harness">
      <div class="agent"><span>Vision agent</span><strong id="vision-agent">live · 4 fps</strong></div>
      <div class="agent"><span>VLM agent</span><strong id="vlm-agent">gated</strong></div>
      <div class="agent"><span>Memory</span><strong id="memory-agent">8 events</strong></div>
      <div class="agent"><span>FHIR/Medplum</span><strong>planned</strong></div>
      <div class="agent"><span>Evidence</span><strong id="evidence-agent">clip buffer</strong></div>
      <div class="agent"><span>Review</span><strong id="review-agent">pending</strong></div>
    </section>

    <form class="controls" id="stream-controls">
      <select id="source">
        <option value="synthetic">Synthetic room feed</option>
        <option value="0">Local camera 0</option>
      </select>
      <select id="scenario">
        <option value="normal">Normal</option>
        <option value="out_of_bed">Out of bed</option>
        <option value="fall">Fall / floor</option>
        <option value="staff_visit">Staff visit</option>
        <option value="vitals_alert">Vitals alert</option>
        <option value="iv_near_empty">IV near empty</option>
      </select>
      <input id="custom-source" placeholder="RTSP / video file path" />
      <button type="submit">Switch feed</button>
    </form>
  </main>

  <script>
    const stream = document.getElementById('stream');
    const scenario = document.getElementById('scenario');
    const source = document.getElementById('source');
    const customSource = document.getElementById('custom-source');
    const log = document.getElementById('assistant-log');
    const toast = document.getElementById('event-toast');
    const review = document.getElementById('review-button');
    const trend = document.getElementById('trend');
    const xray = document.getElementById('xray-panel');

    function streamUrl() {
      const selectedSource = customSource.value.trim() || source.value;
      return `/v0/monitor/stream.mjpg?source=${encodeURIComponent(selectedSource)}&scenario=${encodeURIComponent(scenario.value)}&fps=4&t=${Date.now()}`;
    }

    document.getElementById('stream-controls').addEventListener('submit', (event) => {
      event.preventDefault();
      stream.src = streamUrl();
      addMessage(`Feed switched to ${customSource.value.trim() || source.value} (${scenario.value}).`);
    });

    document.getElementById('assistant-send').addEventListener('click', () => {
      const input = document.getElementById('assistant-input');
      const value = input.value.trim() || 'What is happening right now?';
      addMessage(`You asked: ${value}`);
      addMessage('AINA: Current state is grounded in live video, timeline events, vitals OCR, and evidence memory. Most recent event: possible distress requires review before clinical charting.');
      input.value = '';
    });

    document.getElementById('trend-toggle').addEventListener('click', () => {
      trend.style.opacity = trend.style.opacity === '0' ? '.88' : '0';
    });

    document.getElementById('xray-toggle').addEventListener('click', () => {
      xray.classList.toggle('open');
    });

    review.addEventListener('click', () => {
      toast.textContent = 'Change in patient position detected and evidence captured.';
      addMessage('Review opened: still frame, clip buffer, rule trace, VLM interpretation, and human sign-off are linked to this event.');
      document.getElementById('review-agent').textContent = 'in review';
    });

    async function refreshState() {
      try {
        const response = await fetch('/v0/monitor/state');
        const data = await response.json();
        if (!data.ok) return;
        document.getElementById('hr').textContent = `${data.vitals.hr} bpm`;
        document.getElementById('bp').textContent = data.vitals.bp;
        document.getElementById('spo2').textContent = `${data.vitals.spo2}%`;
        document.getElementById('rr').textContent = `${data.vitals.rr}`;
        document.getElementById('memory-agent').textContent = `${data.event_count} events`;
        document.getElementById('vision-agent').textContent = `${data.camera.status} · ${data.camera.fps} fps`;
        document.getElementById('vlm-agent').textContent = data.agents.vlm;
        document.getElementById('evidence-agent').textContent = data.evidence.status;
      } catch (_) {}
    }

    function addMessage(text) {
      const node = document.createElement('div');
      node.className = 'msg';
      node.textContent = text;
      log.appendChild(node);
      log.scrollTop = log.scrollHeight;
    }

    setInterval(refreshState, 2500);
    refreshState();
  </script>
</body>
</html>"""
