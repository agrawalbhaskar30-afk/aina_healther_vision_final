(function () {
  const api = window.AIDA_API_BASE || "";
  const page = window.AIDA_PAGE || "";
  const bedId = window.AIDA_BED_ID || "bed-01";

  const postJson = async (url, body) => {
    const res = await fetch(api + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
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
      .aida-bridge-modal-scrim{position:fixed;inset:0;z-index:10000;background:rgba(4,8,14,.54);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px}
      .aida-bridge-modal{width:min(720px,calc(100vw - 32px));max-height:min(720px,calc(100vh - 32px));overflow:auto;border:1px solid var(--border,rgba(148,163,184,.25));border-radius:10px;background:var(--surface,#111827);color:var(--fg-1,#fff);box-shadow:0 24px 80px rgba(0,0,0,.38);font:13px Inter,system-ui,sans-serif}
      .aida-bridge-modal header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border,rgba(148,163,184,.2))}
      .aida-bridge-modal h2{font-size:15px;margin:0;font-weight:700}
      .aida-bridge-modal .close{margin-left:auto;border:1px solid var(--border,rgba(148,163,184,.25));background:transparent;color:inherit;border-radius:7px;padding:6px 9px;cursor:pointer}
      .aida-bridge-modal .body{padding:16px}
      .aida-bridge-table{width:100%;border-collapse:collapse;font-family:var(--font-mono,monospace);font-size:12px}
      .aida-bridge-table th,.aida-bridge-table td{border-bottom:1px solid var(--border,rgba(148,163,184,.16));padding:8px;text-align:left}
      .aida-bridge-menu{position:fixed;z-index:10000;min-width:190px;border:1px solid var(--border,rgba(148,163,184,.25));border-radius:8px;background:var(--surface,#111827);box-shadow:0 18px 60px rgba(0,0,0,.32);padding:6px}
      .aida-bridge-menu button,.aida-bridge-suggestions button{display:block;width:100%;border:0;background:transparent;color:var(--fg-1,#fff);text-align:left;padding:8px 10px;border-radius:6px;cursor:pointer;font:13px Inter,system-ui,sans-serif}
      .aida-bridge-menu button:hover,.aida-bridge-suggestions button:hover{background:var(--surface-2,rgba(148,163,184,.12))}
      .aida-bridge-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 8px}
      .aida-bridge-suggestions button{width:auto;border:1px solid var(--border,rgba(148,163,184,.18));font-size:12px}
      .aida-bridge-fullscreen{background:#020617!important}
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

  async function showVitals(metric) {
    const data = await getJson(`/v0/bed/${encodeURIComponent(bedId)}/vitals/history?metric=${encodeURIComponent(metric)}`);
    const rows = (data.rows || []).slice(-18);
    const body = `
      <p style="margin:0 0 12px;color:var(--fg-2,#94a3b8)">Previous ${esc(metric.toUpperCase())} history for ${esc(bedId)} · source: ${esc(data.source || "monitor_ocr")} · window ${esc(data.window || "")}</p>
      <table class="aida-bridge-table">
        <thead><tr><th>Time</th><th>Value</th><th>Unit</th><th>Confidence</th></tr></thead>
        <tbody>${rows.map((r) => {
          const value = r.kind === "bp" ? `${r.systolic}/${r.diastolic}` : r.value;
          const time = r.at ? new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
          return `<tr><td>${esc(time)}</td><td>${esc(value)}</td><td>${esc(r.unit || "")}</td><td>${esc(Math.round((r.confidence || 0) * 100))}%</td></tr>`;
        }).join("")}</tbody>
      </table>
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
    `;
    menu.addEventListener("click", (event) => {
      const route = event.target.closest("button")?.dataset.route;
      if (route) window.location.href = route;
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
  }

  function wireMonitor() {
    addBridgeStyles();
    const stage = document.querySelector(".video-stage");
    if (stage && !document.getElementById("aida-live-stream")) {
      const img = document.createElement("img");
      img.id = "aida-live-stream";
      img.src = `/v0/monitor/stream.mjpg?source=synthetic&scenario=normal&fps=4`;
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
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.trim();
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
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      stream?.getTracks?.().forEach((track) => track.stop());
      await postJson("/v0/transcripts", {
        bed_id: bedId,
        text: "Microphone permission granted. Browser speech recognition is unavailable, so audio capture is ready but not transcribed in this browser.",
        speaker: "room_mic",
      });
      addToast("Mic permission granted. Transcript endpoint is ready.");
    } catch (err) {
      addToast("Mic access unavailable or denied.");
    }
  }

  function wireSetup() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.replace(/\s+/g, " ").trim();
      if (text.includes("Test connection") || text.includes("Testing")) {
        postJson("/v0/setup/test", { bed_id: bedId, source_url: "synthetic" })
          .then((data) => addToast(`Camera ${data.status}: ${data.resolution} · ${data.fps}fps`))
          .catch(() => addToast("Camera test failed"));
      }
      if (text.includes("Save & go live")) {
        await postJson(`/v0/bed/${encodeURIComponent(bedId)}/setup/config`, {
          source_type: "synthetic",
          source_url: "synthetic",
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
      postJson("/v0/events/evt-spo2-0714/review", { action: map[key] })
        .then(() => addToast(`${key} logged to backend audit trail.`))
        .catch(() => addToast("Review action failed"));
    }, true);

    const back = [...document.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Back to monitor"));
    if (back) back.addEventListener("click", () => { window.location.href = `/bed/${encodeURIComponent(bedId)}/monitor`; });
  }

  ready(() => {
    if (page === "monitor") wireMonitor();
    if (page === "setup") wireSetup();
    if (page === "review") wireReview();
  });
})();
