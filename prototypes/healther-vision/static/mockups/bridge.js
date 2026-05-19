(function () {
  const api = window.AIDA_API_BASE || "";
  const page = window.AIDA_PAGE || "";

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

  function wireMonitor() {
    const stage = document.querySelector(".video-stage");
    if (stage && !document.getElementById("aida-live-stream")) {
      const img = document.createElement("img");
      img.id = "aida-live-stream";
      img.src = "/v0/monitor/stream.mjpg?source=synthetic&scenario=normal&fps=4";
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

    getJson("/v0/monitor/state").then((data) => {
      if (!data.ok) return;
      const live = document.querySelector(".live-badge");
      if (live && data.camera) live.lastChild.textContent = ` LIVE · ${data.camera.type} · ${data.camera.fps} fps`;
    }).catch(() => {});

    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.trim();
      if (text === "Open in review" || text === "Review") {
        event.preventDefault();
        window.location.href = "/review?event=evt-spo2-0714";
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
      const result = await postJson("/v0/assistant/chat", { message: q });
      addToast(result.answer || "Aida response received.");
    }, true);
  }

  function wireSetup() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.textContent.replace(/\s+/g, " ").trim();
      if (text.includes("Test connection") || text.includes("Testing")) {
        postJson("/v0/setup/test", { source_url: "synthetic" })
          .then((data) => addToast(`Camera ${data.status}: ${data.resolution} · ${data.fps}fps`))
          .catch(() => addToast("Camera test failed"));
      }
      if (text.includes("Save & go live")) {
        await postJson("/v0/setup/config", {
          source_type: "synthetic",
          source_url: "synthetic",
          camera_label: "Bedside Cam 1",
        });
        addToast("Configuration saved. Opening monitor...");
        setTimeout(() => { window.location.href = "/monitor"; }, 650);
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
    if (back) back.addEventListener("click", () => { window.location.href = "/monitor"; });
  }

  ready(() => {
    if (page === "monitor") wireMonitor();
    if (page === "setup") wireSetup();
    if (page === "review") wireReview();
  });
})();
