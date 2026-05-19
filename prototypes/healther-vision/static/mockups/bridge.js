(function () {
  const api = window.AIDA_API_BASE || "";
  const page = window.AIDA_PAGE || "";
  const bedId = window.AIDA_BED_ID || "bed-01";
  const VITALS_PAGE_SIZE = 10;
  let activeVitals = null;
  let localCameraStream = null;

  const postJson = async (url, body) => {
    const res = await fetch(api + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  };

  const patchJson = async (url, body) => {
    const res = await fetch(api + url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  };

  const postForm = async (url, formData) => {
    const res = await fetch(api + url, {
      method: "POST",
      body: formData,
    });
    return res.json();
  };

  const getJson = async (url) => {
    const res = await fetch(api + url);
    return res.json();
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(fn, 250));
    } else {
      setTimeout(fn, 250);
    }
  }

  function addToast(message) {
    let toast = document.getElementById("aida-bridge-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "aida-bridge-toast";
      toast.style.cssText = [
        "position:fixed",
        "z-index:10000",
        "right:16px",
        "bottom:16px",
        "max-width:360px",
        "padding:10px 12px",
        "border-radius:8px",
        "background:#0f766e",
        "color:#fff",
        "font:13px Inter,system-ui,sans-serif",
        "box-shadow:0 12px 36px rgba(0,0,0,.24)",
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(addToast._t);
    addToast._t = setTimeout(() => toast.remove(), 2600);
  }

  function esc(text) {
    return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function addBridgeStyles() {
    if (document.getElementById("aida-bridge-styles")) return;
    const style = document.createElement("style");
    style.id = "aida-bridge-styles";
    style.textContent = `
      .aida-bridge-modal-scrim{position:fixed;inset:0;z-index:10000;background:rgba(4,8,14,.54);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px}
      .aida-bridge-modal{width:min(1040px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:min(820px,calc(100vh - 32px));overflow:hidden;border:1px solid var(--border,rgba(148,163,184,.25));border-radius:10px;background:var(--surface,#111827);color:var(--fg-1,#fff);box-shadow:0 24px 80px rgba(0,0,0,.38);font:13px Inter,system-ui,sans-serif}
      .aida-bridge-modal header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border,rgba(148,163,184,.2))}
      .aida-bridge-modal h2{font-size:15px;margin:0;font-weight:700}
      .aida-bridge-modal .close{margin-left:auto;border:1px solid var(--border,rgba(148,163,184,.25));background:transparent;color:inherit;border-radius:7px;padding:6px 9px;cursor:pointer}
      .aida-bridge-modal .body{display:block!important;padding:16px;max-height:calc(100vh - 110px);overflow-y:auto;overflow-x:hidden;min-width:0}
      .aida-bridge-table-wrap{max-width:100%;overflow:auto;border:1px solid var(--border,rgba(148,163,184,.16));border-radius:8px}
      .aida-bridge-table{width:100%;min-width:560px;border-collapse:collapse;font-family:var(--font-mono,monospace);font-size:12px}
      .aida-bridge-table th,.aida-bridge-table td{border-bottom:1px solid var(--border,rgba(148,163,184,.16));padding:8px;text-align:left}
      .aida-bridge-vitals-layout{display:grid;grid-template-columns:minmax(180px,240px) minmax(0,1fr);gap:16px;align-items:start;width:100%;max-width:100%;overflow:hidden}
      .aida-bridge-vitals-meta{color:var(--fg-2,#94a3b8);line-height:1.45}
      .aida-bridge-tabs{display:flex;gap:6px;margin:0 0 12px}
      .aida-bridge-tabs button{border:1px solid var(--border,rgba(148,163,184,.25));background:transparent;color:inherit;border-radius:7px;padding:6px 10px;cursor:pointer}
      .aida-bridge-tabs button.active{background:var(--brand-subtle,rgba(45,212,191,.12));border-color:var(--brand,rgba(45,212,191,.7));color:var(--brand,#2dd4bf)}
      .aida-bridge-panel[hidden]{display:none!important}
      .aida-bridge-graph{height:320px;width:100%;max-width:100%;min-width:0;overflow:hidden;border:1px solid var(--border,rgba(148,163,184,.16));border-radius:8px;background:linear-gradient(180deg,rgba(45,212,191,.08),rgba(2,6,23,.02));padding:10px;display:flex;flex-direction:column}
      .aida-bridge-graph svg{display:block;width:100%;min-height:0;flex:1;overflow:hidden}
      .aida-bridge-chart-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 0;color:var(--fg-2,#94a3b8)}
      .aida-bridge-chart-controls button{border:1px solid var(--border,rgba(148,163,184,.25));background:transparent;color:inherit;border-radius:7px;padding:5px 8px;cursor:pointer}
      .aida-bridge-chart-controls button:disabled{opacity:.35;cursor:not-allowed}
      .aida-bridge-help-list{display:grid;gap:10px}
      .aida-bridge-help-list dt{font-weight:700;color:var(--fg-1,#fff);margin:0 0 2px}
      .aida-bridge-help-list dd{margin:0;color:var(--fg-2,#94a3b8);line-height:1.45}
      .aida-bridge-menu{position:fixed;z-index:10000;min-width:190px;border:1px solid var(--border,rgba(148,163,184,.25));border-radius:8px;background:var(--surface,#111827);box-shadow:0 18px 60px rgba(0,0,0,.32);padding:6px}
      .aida-bridge-menu button,.aida-bridge-suggestions button{display:block;width:100%;border:0;background:transparent;color:var(--fg-1,#fff);text-align:left;padding:8px 10px;border-radius:6px;cursor:pointer;font:13px Inter,system-ui,sans-serif}
      .aida-bridge-menu button:hover,.aida-bridge-suggestions button:hover{background:var(--surface-2,rgba(148,163,184,.12))}
      .aida-bridge-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 8px}
      .aida-bridge-suggestions button{width:auto;border:1px solid var(--border,rgba(148,163,184,.18));font-size:12px}
      .aida-bridge-fullscreen{background:#020617!important}
      :root[data-density="compact"] .vital-mini{min-height:58px!important;padding:8px!important}
      :root[data-density="comfortable"] .vital-mini{min-height:92px!important;padding:14px!important}
      @media (max-width: 820px){.aida-bridge-modal{width:calc(100vw - 20px);max-width:calc(100vw - 20px)}.aida-bridge-vitals-layout{grid-template-columns:1fr}.aida-bridge-graph{height:260px}}
    `;
    document.head.appendChild(style);
  }

  function showModal(title, bodyHtml) {
    addBridgeStyles();
    document.getElementById("aida-bridge-modal")?.remove();
    const scrim = document.createElement("div");
    scrim.id = "aida-bridge-modal";
    scrim.className = "aida-bridge-modal-scrim";
    scrim.innerHTML = `
      <section class="aida-bridge-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header><h2>${esc(title)}</h2><button class="close" type="button">Close</button></header>
        <div class="body">${bodyHtml}</div>
      </section>
    `;
    scrim.addEventListener("click", (event) => {
      if (event.target === scrim || event.target.closest(".close")) scrim.remove();
    });
    document.body.appendChild(scrim);
  }

  function appendChat(role, text, cites) {
    const chat = document.querySelector(".aida-chat");
    if (!chat) return;
    const msg = document.createElement("div");
    msg.className = `msg ${role === "user" ? "user" : "aida"}`;
    if (role === "user") {
      msg.innerHTML = `<div class="bubble">${esc(text)}</div>`;
    } else {
      const citeHtml = (cites || []).map((c) => `<span class="aida-cite" title="Open evidence">${esc(c.label || c.event_id || c.route || "Evidence")}</span>`).join("");
      msg.innerHTML = `<span class="av">A</span><div class="bubble"><div class="who">Aida</div>${esc(text)}${citeHtml ? `<div class="cites">${citeHtml}</div>` : ""}</div>`;
    }
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
  }

  async function askAida(message) {
    appendChat("user", message);
    const result = await postJson("/v0/assistant/chat", { message, bed_id: bedId });
    appendChat("aida", result.answer || "Aida response received.", result.citations || []);
    refreshSuggestions();
    return result;
  }

  function vitalMetricFrom(card) {
    const label = card.querySelector(".v-lbl,.vitals-label")?.textContent?.trim().toLowerCase() || "";
    if (label.includes("spo")) return "spo2";
    if (label.includes("bp")) return "bp";
    if (label.includes("rr")) return "rr";
    if (label.includes("hr")) return "hr";
    return label || "spo2";
  }

  function vitalRowValue(row) {
    return row.kind === "bp" ? Number(row.systolic || row.value || 0) : Number(row.value || 0);
  }

  function vitalDisplayValue(row) {
    return row.kind === "bp" ? `${row.systolic}/${row.diastolic}` : row.value;
  }

  function graphSvg(rows, metric) {
    const values = rows.map(vitalRowValue).filter((value) => Number.isFinite(value));
    if (values.length < 2) {
      return `<div style="padding:24px;color:var(--fg-2,#94a3b8)">Not enough ${esc(metric.toUpperCase())} samples for a graph yet.</div>`;
    }
    const width = 760;
    const height = 280;
    const pad = 30;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const pointList = points.split(" ");
    const firstTime = rows[0]?.at ? new Date(rows[0].at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const lastTime = rows.at(-1)?.at ? new Date(rows.at(-1).at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(metric.toUpperCase())} trend graph">
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="rgba(148,163,184,.28)" />
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="rgba(148,163,184,.28)" />
        <line x1="${pad}" y1="${pad}" x2="${width - pad}" y2="${pad}" stroke="rgba(148,163,184,.12)" />
        <text x="4" y="${pad + 4}" fill="currentColor" opacity=".72" font-size="12">${esc(max)}</text>
        <text x="4" y="${height - pad + 4}" fill="currentColor" opacity=".72" font-size="12">${esc(min)}</text>
        <polyline points="${points}" fill="none" stroke="var(--brand,#2dd4bf)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        ${pointList.map((point, index) => `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="${index === pointList.length - 1 ? 5 : 3}" fill="var(--brand,#2dd4bf)" />`).join("")}
        <text x="${pad}" y="${height - 4}" fill="currentColor" opacity=".72" font-size="12">${esc(firstTime)}</text>
        <text x="${width - pad - 64}" y="${height - 4}" fill="currentColor" opacity=".72" font-size="12">${esc(lastTime)}</text>
      </svg>
    `;
  }

  function graphPageHtml(rows, metric, page) {
    const pageCount = Math.max(1, Math.ceil(rows.length / VITALS_PAGE_SIZE));
    const safePage = Math.max(0, Math.min(page, pageCount - 1));
    const pageRows = rows.slice(safePage * VITALS_PAGE_SIZE, (safePage + 1) * VITALS_PAGE_SIZE);
    return `
      ${graphSvg(pageRows, metric)}
      <div class="aida-bridge-chart-controls">
        <button type="button" data-vitals-page="${safePage - 1}" ${safePage <= 0 ? "disabled" : ""}>Previous</button>
        <span>Page ${safePage + 1} of ${pageCount}</span>
        <button type="button" data-vitals-page="${safePage + 1}" ${safePage >= pageCount - 1 ? "disabled" : ""}>Next</button>
      </div>
    `;
  }

  async function showVitals(metric) {
    const data = await getJson(`/v0/bed/${encodeURIComponent(bedId)}/vitals/history?metric=${encodeURIComponent(metric)}`);
    const rows = (data.rows || []).slice(-60);
    const initialPage = Math.max(0, Math.ceil(rows.length / VITALS_PAGE_SIZE) - 1);
    activeVitals = { rows, metric, page: initialPage };
    const tableRows = rows.slice(-18);
    const body = `
      <div class="aida-bridge-vitals-layout">
        <p class="aida-bridge-vitals-meta" style="margin:0">Previous ${esc(metric.toUpperCase())} history for ${esc(bedId)}<br>source: ${esc(data.source || "monitor_ocr")}<br>window ${esc(data.window || "")}<br>${metric === "bp" ? "Graph line uses systolic BP; table keeps systolic/diastolic." : "Graph and table use the same OCR history feed."}</p>
        <div>
          <div class="aida-bridge-tabs" role="tablist" aria-label="${esc(metric.toUpperCase())} history view">
            <button type="button" class="active" data-vitals-view="graph">Graph</button>
            <button type="button" data-vitals-view="table">Table</button>
          </div>
          <div class="aida-bridge-panel aida-bridge-graph" data-vitals-panel="graph">${graphPageHtml(rows, metric, initialPage)}</div>
          <div class="aida-bridge-panel" data-vitals-panel="table" hidden>
            <div class="aida-bridge-table-wrap">
              <table class="aida-bridge-table">
                <thead><tr><th>Time</th><th>Value</th><th>Unit</th><th>Confidence</th></tr></thead>
                <tbody>${tableRows.map((r) => {
                  const time = r.at ? new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
                  return `<tr><td>${esc(time)}</td><td>${esc(vitalDisplayValue(r))}</td><td>${esc(r.unit || "")}</td><td>${esc(Math.round((r.confidence || 0) * 100))}%</td></tr>`;
                }).join("")}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    showModal(`${metric.toUpperCase()} History`, body);
  }

  async function refreshSummary() {
    const data = await getJson(`/v0/bed/${encodeURIComponent(bedId)}/summary`);
    if (!data.ok) return;
    const body = document.querySelector(".sum-body");
    const preview = document.querySelector(".aida-summary .preview");
    if (body) body.textContent = data.summary;
    if (preview) preview.textContent = data.preview || "Current room summary";
  }

  async function refreshSuggestions() {
    const wrap = document.querySelector(".aida-input-wrap");
    if (!wrap) return;
    const data = await getJson(`/v0/bed/${encodeURIComponent(bedId)}/summary`).catch(() => null);
    const suggestions = data?.suggested_questions || [];
    if (!suggestions.length) return;
    let box = document.getElementById("aida-bridge-suggestions");
    if (!box) {
      box = document.createElement("div");
      box.id = "aida-bridge-suggestions";
      box.className = "aida-bridge-suggestions";
      wrap.insertBefore(box, wrap.querySelector("form.aida-input"));
    }
    box.innerHTML = suggestions.slice(0, 4).map((s) => `<button type="button" data-aida-suggest="${esc(s)}">↳ ${esc(s)}</button>`).join("");
  }

  function updateStream(streamUrl) {
    stopLocalCamera();
    const img = document.getElementById("aida-live-stream");
    if (!img || !streamUrl) return;
    img.style.display = "block";
    const separator = streamUrl.includes("?") ? "&" : "?";
    img.src = `${streamUrl}${separator}t=${Date.now()}`;
  }

  function ensureLocalCameraVideo() {
    const stage = document.querySelector(".video-stage");
    if (!stage) return null;
    let video = document.getElementById("aida-local-camera");
    if (video) return video;
    video = document.createElement("video");
    video.id = "aida-local-camera";
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("aria-label", "Tablet bedside camera");
    video.style.cssText = [
      "position:absolute",
      "inset:0",
      "width:100%",
      "height:100%",
      "object-fit:cover",
      "z-index:0",
      "display:none",
      "background:#020617",
    ].join(";");
    stage.prepend(video);
    return video;
  }

  function stopLocalCamera() {
    if (localCameraStream) {
      localCameraStream.getTracks().forEach((track) => track.stop());
      localCameraStream = null;
    }
    const video = document.getElementById("aida-local-camera");
    if (video) {
      video.pause();
      video.srcObject = null;
      video.style.display = "none";
    }
  }

  async function startTabletCamera({ save = true } = {}) {
    const video = ensureLocalCameraVideo();
    const img = document.getElementById("aida-live-stream");
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      addToast("Browser camera is unavailable; falling back to synthetic feed.");
      updateStream(`/v0/monitor/stream.mjpg?bed_id=${encodeURIComponent(bedId)}&source=synthetic&scenario=normal&fps=4`);
      return;
    }
    try {
      if (save) {
        await postJson(`/v0/bed/${encodeURIComponent(bedId)}/camera/select`, { camera_id: "bedside-1" });
      }
      stopLocalCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      localCameraStream = stream;
      video.srcObject = stream;
      video.style.display = "block";
      if (img) img.style.display = "none";
      await video.play().catch(() => {});
      document.querySelector(".cam-trigger span:last-child")?.replaceChildren(document.createTextNode("Bedside Cam 1"));
      addToast("Tablet camera is live for Bedside Cam 1.");
    } catch (err) {
      addToast("Camera permission denied or unavailable; using synthetic feed.");
      updateStream(`/v0/monitor/stream.mjpg?bed_id=${encodeURIComponent(bedId)}&source=synthetic&scenario=normal&fps=4`);
    }
  }

  function ensureTestFileInput() {
    let input = document.getElementById("aida-test-video-input");
    if (input) return input;
    input = document.createElement("input");
    input.id = "aida-test-video-input";
    input.type = "file";
    input.accept = "video/*";
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("video", file);
      form.append("bed_id", bedId);
      addToast(`Uploading ${file.name} as test feed...`);
      try {
        const data = await postForm("/v0/monitor/test-video", form);
        if (!data.ok) throw new Error("upload failed");
        updateStream(data.stream_url);
        document.querySelector(".cam-trigger span:last-child")?.replaceChildren(document.createTextNode(file.name));
        addToast("Test video feed is now active.");
      } catch (err) {
        addToast("Video upload failed.");
      } finally {
        input.value = "";
      }
    });
    document.body.appendChild(input);
    return input;
  }

  async function selectCameraSource(text) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    try {
      if (cleaned.includes("Bedside Cam 1")) {
        await startTabletCamera();
      } else if (cleaned.includes("Wall Cam")) {
        const data = await postJson(`/v0/bed/${encodeURIComponent(bedId)}/camera/select`, { camera_id: "wall-wide" });
        updateStream(data.stream_url);
        addToast("Wall Cam selected.");
      } else if (cleaned.includes("synthetic")) {
        const data = await postJson(`/v0/bed/${encodeURIComponent(bedId)}/camera/select`, {
          source_type: "synthetic",
          source_url: "synthetic",
          camera_label: "Synthetic ICU feed",
        });
        updateStream(data.stream_url);
        addToast("Synthetic feed selected.");
      } else if (cleaned.includes("RTSP")) {
        const url = window.prompt("Paste RTSP/HTTP camera URL");
        if (!url) return;
        const data = await postJson(`/v0/bed/${encodeURIComponent(bedId)}/camera/select`, {
          source_type: "rtsp",
          source_url: url,
          camera_label: "RTSP stream",
        });
        updateStream(data.stream_url);
        addToast("RTSP stream selected.");
      } else if (cleaned.includes("file")) {
        ensureTestFileInput().click();
      }
    } catch (err) {
      addToast("Could not switch video source.");
    }
  }

  async function showCameraHelp() {
    const data = await getJson(`/v0/bed/${encodeURIComponent(bedId)}/cameras`).catch(() => null);
    const cameras = data?.cameras || [];
    const sources = data?.source_options || [];
    const body = `
      <dl class="aida-bridge-help-list">
        ${cameras.map((item) => `<div><dt>${esc(item.label)}</dt><dd>${esc(item.description)}</dd></div>`).join("")}
        ${sources.map((item) => `<div><dt>${esc(item.label)}</dt><dd>${esc(item.description)}</dd></div>`).join("")}
      </dl>
    `;
    showModal("Camera Source Options", body);
  }

  async function setDensity(density) {
    const result = await patchJson("/v0/users/me/preferences", { density });
    if (!result.ok) throw new Error("density update failed");
    document.documentElement.dataset.density = result.preferences.density || density;
    addToast(`Density set to ${result.preferences.density}.`);
  }

  function showEscalationStatus() {
    getJson(`/v0/monitor/state?bed_id=${encodeURIComponent(bedId)}`).then((data) => {
      const escState = data.escalation || {};
      showModal("Escalation Status", `
        <dl class="aida-bridge-help-list">
          <div><dt>Critical alerts</dt><dd>${esc(data.critical_count || 0)} active critical alert(s) are pinned for review.</dd></div>
          <div><dt>Route</dt><dd>${esc(escState.route || "No open escalation")}</dd></div>
          <div><dt>Status</dt><dd>${esc(escState.status || "none")}</dd></div>
          <div><dt>Due</dt><dd>${esc(escState.due_at || "-")}</dd></div>
        </dl>
      `);
    }).catch(() => addToast("Could not load escalation status."));
  }

  function installThemePersistence() {
    const storageGet = (key) => {
      try { return window.localStorage?.getItem(key); } catch { return null; }
    };
    const storageSet = (key, value) => {
      try { window.localStorage?.setItem(key, value); } catch {}
    };
    const stored = storageGet("aida-theme") || storageGet("aida-ref-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
    let lastTheme = document.documentElement.getAttribute("data-theme") || stored || "light";
    storageSet("aida-theme", lastTheme);
    storageSet("aida-ref-theme", lastTheme);
    patchJson("/v0/users/me/preferences", { theme: lastTheme }).catch(() => {});
    const observer = new MutationObserver(() => {
      const next = document.documentElement.getAttribute("data-theme") || "light";
      if (next === lastTheme || !["light", "dark"].includes(next)) return;
      lastTheme = next;
      storageSet("aida-theme", next);
      storageSet("aida-ref-theme", next);
      patchJson("/v0/users/me/preferences", { theme: next }).catch(() => {});
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function clearAlertsUi() {
    document.querySelectorAll(".alert-row").forEach((row) => row.remove());
    document.querySelectorAll(".alerts-card .count").forEach((count) => { count.textContent = "(0)"; });
    document.querySelectorAll(".alerts-card .clear").forEach((button) => { button.style.display = "none"; });
    const list = document.querySelector(".alerts-card .list");
    if (list && !list.querySelector(".alerts-empty")) {
      const empty = document.createElement("div");
      empty.className = "alerts-empty";
      empty.textContent = "No active alerts.";
      list.appendChild(empty);
    }
    document.querySelectorAll(".alerts-empty").forEach((empty) => { empty.style.display = "block"; });
  }

  function showPatientActions(anchor) {
    addBridgeStyles();
    document.querySelector(".aida-bridge-menu")?.remove();
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "aida-bridge-menu";
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
    menu.style.top = `${rect.bottom + 8}px`;
    menu.innerHTML = `
      <button type="button" data-route="/bed/${esc(bedId)}/setup">Setup this bed</button>
      <button type="button" data-route="/bed/${esc(bedId)}/video-setup">Video setup</button>
      <button type="button" data-route="/bed/${esc(bedId)}/review">Review events</button>
      <button type="button" data-route="/state-reference">State references</button>
      <button type="button" data-action="camera-help">Camera/source options</button>
      <button type="button" data-action="upload-file">Use video file as test feed</button>
      <button type="button" data-action="density-compact">Density: compact</button>
      <button type="button" data-action="density-default">Density: default</button>
      <button type="button" data-action="density-comfortable">Density: comfortable</button>
      <button type="button" data-action="escalation-status">Escalation status</button>
    `;
    menu.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      const route = target?.dataset.route;
      if (route) window.location.href = route;
      const action = target?.dataset.action;
      if (action === "camera-help") showCameraHelp();
      if (action === "upload-file") ensureTestFileInput().click();
      if (action?.startsWith("density-")) setDensity(action.replace("density-", "")).catch(() => addToast("Density update failed."));
      if (action === "escalation-status") showEscalationStatus();
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
  }

  function wireMonitor() {
    addBridgeStyles();
    ensureTestFileInput();
    getJson("/v0/users/me/preferences")
      .then((data) => {
        if (data?.preferences?.density) document.documentElement.dataset.density = data.preferences.density;
      })
      .catch(() => {});
    const stage = document.querySelector(".video-stage");
    if (stage && !document.getElementById("aida-live-stream")) {
      const img = document.createElement("img");
      img.id = "aida-live-stream";
      img.src = `/v0/monitor/stream.mjpg?bed_id=${encodeURIComponent(bedId)}&source=active&scenario=normal&fps=4`;
      img.alt = "Live patient room stream";
      img.style.cssText = [
        "position:absolute",
        "inset:0",
        "width:100%",
        "height:100%",
        "object-fit:cover",
        "z-index:0",
      ].join(";");
      stage.prepend(img);
      const scene = stage.querySelector(".scene");
      if (scene) scene.style.opacity = "0";
      const detections = stage.querySelector(".detections");
      if (detections) detections.style.zIndex = "2";
    }

    getJson(`/v0/monitor/state?bed_id=${encodeURIComponent(bedId)}`).then((data) => {
      if (!data.ok) return;
      const live = document.querySelector(".live-badge");
      if (live && data.camera) live.lastChild.textContent = ` LIVE · ${data.camera.type} · ${data.camera.fps} fps`;
      if (data.camera?.source_type === "tablet_camera") {
        startTabletCamera({ save: false });
      }
    }).catch(() => {});

    document.querySelectorAll(".vital-mini,.vital-card").forEach((card) => {
      if (card.dataset.aidaBridgeVital) return;
      card.dataset.aidaBridgeVital = "1";
      card.tabIndex = 0;
      card.style.cursor = "pointer";
      const open = () => showVitals(vitalMetricFrom(card));
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });

    refreshSummary().catch(() => {});
    refreshSuggestions().catch(() => {});

    document.addEventListener("click", (event) => {
      if (event.target.closest(".aida-cite")) {
        event.preventDefault();
        window.location.href = `/bed/${encodeURIComponent(bedId)}/review?event=evt-spo2-0714`;
        return;
      }
      const viewButton = event.target.closest("[data-vitals-view]");
      if (viewButton) {
        event.preventDefault();
        const modal = viewButton.closest(".aida-bridge-modal");
        const view = viewButton.dataset.vitalsView;
        modal?.querySelectorAll("[data-vitals-view]").forEach((btn) => btn.classList.toggle("active", btn === viewButton));
        modal?.querySelectorAll("[data-vitals-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.vitalsPanel !== view;
        });
        return;
      }
      const pageButton = event.target.closest("[data-vitals-page]");
      if (pageButton && activeVitals) {
        event.preventDefault();
        const nextPage = Number(pageButton.dataset.vitalsPage);
        if (!Number.isFinite(nextPage)) return;
        activeVitals.page = Math.max(0, Math.min(nextPage, Math.ceil(activeVitals.rows.length / VITALS_PAGE_SIZE) - 1));
        const panel = pageButton.closest("[data-vitals-panel='graph']");
        if (panel) panel.innerHTML = graphPageHtml(activeVitals.rows, activeVitals.metric, activeVitals.page);
        return;
      }
      const cameraItem = event.target.closest(".cam-menu .item");
      if (cameraItem) {
        const text = cameraItem.textContent;
        if (text.includes("file")) {
          event.preventDefault();
          ensureTestFileInput().click();
          return;
        }
        if (text.includes("RTSP")) {
          event.preventDefault();
          selectCameraSource(text);
          return;
        }
        setTimeout(() => selectCameraSource(text), 0);
      }
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.trim();
      if (button.getAttribute("aria-label") === "Clear all alerts" || text === "Clear all") {
        event.preventDefault();
        event.stopPropagation();
        postJson(`/v0/bed/${encodeURIComponent(bedId)}/alerts/clear`, {})
          .then((data) => {
            clearAlertsUi();
            addToast(`${data.cleared_count || 0} active alert(s) cleared.`);
          })
          .catch(() => addToast("Could not clear active alerts."));
        return;
      }
      if (button.getAttribute("aria-label") === "Fullscreen") {
        event.preventDefault();
        const target = document.querySelector(".video-stage") || document.documentElement;
        target.classList.add("aida-bridge-fullscreen");
        if (document.fullscreenElement) document.exitFullscreen();
        else target.requestFullscreen?.();
      }
      if (button.getAttribute("aria-label") === "Audio") {
        event.preventDefault();
        startAudioCapture();
      }
      if (button.getAttribute("aria-label") === "More patient actions" || button.getAttribute("aria-label") === "Shortcuts") {
        event.preventDefault();
        showPatientActions(button);
      }
      if (button.classList.contains("sum-head") || button.closest(".sum-head")) {
        refreshSummary().catch(() => addToast("Summary refresh failed"));
      }
      const suggestion = button.dataset.aidaSuggest || (button.classList.contains("suggested-chip") ? text.replace(/^↳\s*/, "") : "");
      if (suggestion) {
        event.preventDefault();
        event.stopPropagation();
        askAida(suggestion).catch(() => addToast("Ask Aida failed"));
      }
      if (text === "Open in review" || text.includes("Review")) {
        event.preventDefault();
        window.location.href = `/bed/${encodeURIComponent(bedId)}/review?event=evt-spo2-0714`;
      }
    }, true);

    document.addEventListener("submit", async (event) => {
      const form = event.target.closest("form");
      if (!form || !form.closest(".aida-panel")) return;
      event.preventDefault();
      event.stopPropagation();
      const input = form.querySelector("input");
      const q = input?.value?.trim();
      if (!q) return;
      input.value = "";
      await askAida(q);
    }, true);
  }

  async function startAudioCapture() {
    try {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onerror = () => addToast("Speech recognition stopped. Trying audio clip capture instead.");
        recognition.onresult = async (event) => {
          const text = event.results?.[0]?.[0]?.transcript || "";
          if (!text) return;
          await postJson("/v0/transcripts", { bed_id: bedId, text, speaker: "room_mic" });
          appendChat("user", text);
          const answer = await postJson("/v0/assistant/chat", { bed_id: bedId, message: text });
          appendChat("aida", answer.answer, answer.citations || []);
        };
        recognition.start();
        addToast("Listening for room audio...");
        return;
      }
      await recordAudioClip();
    } catch (err) {
      addToast("Mic access unavailable or denied.");
    }
  }

  async function recordAudioClip() {
    const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
    if (!stream) throw new Error("microphone unavailable");
    if (!window.MediaRecorder) {
      stream.getTracks().forEach((track) => track.stop());
      await postJson("/v0/transcripts", {
        bed_id: bedId,
        text: "Microphone permission granted. Audio capture is available, but this browser cannot record clips for transcription.",
        speaker: "room_mic",
      });
      addToast("Mic permission granted.");
      return;
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const form = new FormData();
      form.append("bed_id", bedId);
      form.append("speaker", "room_mic");
      form.append("audio", blob, "room-audio.webm");
      const data = await postForm("/v0/audio/transcribe", form);
      appendChat("user", data.transcript?.text || "Audio clip captured.");
      refreshSummary().catch(() => {});
      addToast(data.transcribed ? "Mic audio transcribed." : "Mic audio captured.");
    };
    recorder.start();
    addToast("Recording a 5 second room audio clip...");
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 5000);
  }

  function wireSetup() {
    ensureTestFileInput();
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.replace(/\s+/g, " ").trim();
      if (text.includes("Video file")) {
        ensureTestFileInput().click();
      }
      if (text === "RTSP") {
        const url = window.prompt("Paste RTSP/HTTP camera URL");
        if (url) {
          await postJson(`/v0/bed/${encodeURIComponent(bedId)}/camera/select`, {
            source_type: "rtsp",
            source_url: url,
            camera_label: "RTSP stream",
          });
          addToast("RTSP source saved for this bed.");
        }
      }
      if (text.includes("Test connection") || text.includes("Testing")) {
        postJson("/v0/setup/test", { bed_id: bedId, source_url: "synthetic" })
          .then((data) => addToast(`Camera ${data.status}: ${data.resolution} · ${data.fps}fps`))
          .catch(() => addToast("Camera test failed"));
      }
      if (text.includes("Save & go live")) {
        await postJson(`/v0/bed/${encodeURIComponent(bedId)}/setup/config`, {
          source_type: "tablet_camera",
          source_url: "browser:local-camera",
          camera_label: "Bedside Cam 1",
        });
        addToast("Configuration saved. Opening monitor...");
        setTimeout(() => { window.location.href = `/bed/${encodeURIComponent(bedId)}/monitor`; }, 650);
      }
      if (text.includes("Back to monitor") || text.includes("Save & exit")) {
        event.preventDefault();
        window.location.href = `/bed/${encodeURIComponent(bedId)}/monitor`;
      }
    }, true);
  }

  function wireReview() {
    const eventId = new URLSearchParams(window.location.search).get("event") || "evt-spo2-0714";
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.replace(/\s+/g, " ").trim();
      const map = {
        "Acknowledge": "acknowledged",
        "True positive": "true_positive",
        "False positive": "false_positive",
        "Unclear": "unclear",
        "Escalate": "escalated",
        "Create note draft": "note_drafted",
      };
      const key = Object.keys(map).find((label) => text.includes(label));
      if (!key) return;
      const request = key === "Escalate"
        ? postJson(`/v0/events/${encodeURIComponent(eventId)}/escalate`, {
            route: "bedside_nurse",
            priority: "urgent",
            reason: "Critical alert escalated from event review.",
            due_minutes: 5,
          })
        : postJson(`/v0/events/${encodeURIComponent(eventId)}/review`, { action: map[key] });
      request
        .then(() => addToast(`${key} logged to backend audit trail.`))
        .catch(() => addToast("Review action failed"));
    }, true);

    const back = [...document.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Back to monitor"));
    if (back) back.addEventListener("click", () => { window.location.href = `/bed/${encodeURIComponent(bedId)}/monitor`; });
  }

  ready(() => {
    installThemePersistence();
    if (page === "monitor") wireMonitor();
    if (page === "setup") wireSetup();
    if (page === "review") wireReview();
  });
})();
