from __future__ import annotations

import json
from pathlib import Path


def list_runs(generated_dir: Path) -> list[dict]:
    if not generated_dir.exists():
        return []
    runs = []
    for folder in sorted([p for p in generated_dir.iterdir() if p.is_dir()], key=lambda p: p.name, reverse=True):
        manifest_path = folder / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        report = None
        report_path = folder / "replay_report.json"
        if report_path.exists():
            try:
                report = json.loads(report_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                report = None
        frames = manifest.get("frames", [])
        thumb_frames = frames[:6]
        runs.append(
            {
                "name": folder.name,
                "path": str(folder),
                "scenario": manifest.get("scenario"),
                "camera_role": manifest.get("camera_role"),
                "frame_count": len(frames),
                "frames": [
                    {
                        "index": frame.get("index"),
                        "filename": frame.get("filename"),
                        "url": f"/generated/{folder.name}/{frame.get('filename')}",
                        "captured_at": frame.get("captured_at"),
                        "analysis": frame.get("analysis", {}),
                    }
                    for frame in thumb_frames
                ],
                "metrics": (report or {}).get("metrics"),
                "events": (report or {}).get("events", []),
                "state": (report or {}).get("state"),
                "has_report": report is not None,
            }
        )
    return runs


def list_vlm_reports(generated_dir: Path) -> list[dict]:
    if not generated_dir.exists():
        return []
    reports = []
    for path in sorted(generated_dir.glob("vlm_image_benchmark_*.json"), reverse=True):
        try:
            report = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        metrics = report.get("metrics", {})
        reports.append(
            {
                "name": path.name,
                "path": str(path),
                "generated_at": report.get("generated_at"),
                "provider": report.get("provider"),
                "model": report.get("model"),
                "image_count": report.get("image_count"),
                "overall_accuracy": metrics.get("overall_accuracy"),
                "error_rate": metrics.get("error_rate"),
                "field_accuracy": metrics.get("field_accuracy", {}),
                "latency_seconds": metrics.get("latency_seconds", {}),
                "mismatch_count": metrics.get("mismatch_count", 0),
                "mismatches": metrics.get("mismatches", [])[:50],
                "confusion_matrices": metrics.get("confusion_matrices", {}),
                "results": report.get("results", []),
            }
        )
    return reports


def dashboard_html() -> str:
    return """<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Healther Vision Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#12161b; --panel:#1d2329; --line:#303943; --text:#edf2f7; --muted:#9aa7b5; --good:#60d394; --warn:#f5b84b; --bad:#ff6b6b; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    header { padding:24px 28px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:20px; align-items:center; }
    h1 { margin:0; font-size:24px; }
    .muted { color:var(--muted); }
    main { padding:24px 28px; display:grid; gap:18px; }
    button, select, input { background:#26313a; border:1px solid var(--line); color:var(--text); border-radius:6px; padding:10px 12px; }
    button { cursor:pointer; }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .run { background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    .run-head { padding:16px; display:flex; justify-content:space-between; gap:16px; border-bottom:1px solid var(--line); }
    .cards { display:grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap:10px; }
    .metric { background:#141a20; border:1px solid var(--line); border-radius:6px; padding:12px; }
    .metric strong { display:block; font-size:20px; margin-top:4px; }
    .body { padding:16px; display:grid; gap:16px; }
    .frames { display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:12px; }
    figure { margin:0; background:#101418; border:1px solid var(--line); border-radius:7px; overflow:hidden; }
    img { width:100%; display:block; aspect-ratio:16/9; object-fit:cover; }
    figcaption { padding:10px; color:var(--muted); font-size:12px; display:grid; gap:4px; }
    .events { display:flex; flex-wrap:wrap; gap:8px; }
    .chip { border:1px solid var(--line); border-radius:999px; padding:6px 9px; color:var(--muted); font-size:12px; background:#13191f; }
    .critical { color:var(--bad); border-color:#7f3030; }
    .warning { color:var(--warn); border-color:#72551f; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { padding:8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { color:var(--muted); font-weight:600; }
    .ok { color:var(--good); }
    .bad { color:var(--bad); }
    pre { margin:0; padding:12px; background:#101418; border:1px solid var(--line); border-radius:7px; overflow:auto; max-height:260px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Healther Vision Dashboard</h1>
      <div class="muted">Synthetic CCTV/tablet frames, replay events, and error metrics.</div>
    </div>
    <div class="toolbar">
      <select id="scenario">
        <option value="fall">fall</option>
        <option value="normal">normal</option>
        <option value="out_of_bed">out_of_bed</option>
        <option value="staff_visit">staff_visit</option>
        <option value="vitals_alert">vitals_alert</option>
        <option value="iv_near_empty">iv_near_empty</option>
        <option value="tablet_round">tablet_round</option>
      </select>
      <select id="camera">
        <option value="cctv">cctv</option>
        <option value="tablet">tablet</option>
      </select>
      <input id="frames" type="number" value="12" min="1" max="240" />
      <button onclick="replay()">Generate + replay</button>
      <button onclick="loadRuns()">Refresh</button>
    </div>
  </header>
  <main>
    <section id="vlm"></section>
    <section id="runs"></section>
  </main>
  <script>
    async function replay() {
      const body = {
        scenario: document.getElementById('scenario').value,
        camera_role: document.getElementById('camera').value,
        frames: Number(document.getElementById('frames').value || 12),
        bed_id: 'B4',
        patient_id: 'pat-demo',
      };
      await fetch('/v0/synthetic/replay', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      await loadRuns();
    }
    async function loadRuns() {
      const [runsRes, reportsRes] = await Promise.all([fetch('/v0/runs'), fetch('/v0/vlm/reports')]);
      const data = await runsRes.json();
      const reports = await reportsRes.json();
      document.getElementById('vlm').innerHTML = renderVlmReports(reports.reports || []);
      const root = document.getElementById('runs');
      if (!data.runs.length) {
        root.innerHTML = '<p class="muted">No generated runs yet. Click Generate + replay.</p>';
        return;
      }
      root.innerHTML = data.runs.map(renderRun).join('');
    }
    function renderVlmReports(reports) {
      if (!reports.length) {
        return `<section class="run"><div class="run-head"><div><strong>VLM Image Benchmark</strong><div class="muted">No benchmark report yet. Run: python -m healther_vision.cli benchmark-imagegen</div></div></div></section>`;
      }
      const report = reports[0];
      const l = report.latency_seconds || {};
      return `<section class="run">
        <div class="run-head">
          <div><strong>Latest VLM Image Benchmark</strong><div class="muted">${report.name} · ${report.provider || 'provider'} · ${report.image_count || 0} images</div></div>
          <div class="cards">
            ${metric('Accuracy', pct(report.overall_accuracy))}
            ${metric('Error rate', pct(report.error_rate))}
            ${metric('Mismatch', report.mismatch_count ?? 0)}
            ${metric('Median time', l.median == null ? 'n/a' : `${l.median}s`)}
          </div>
        </div>
        <div class="body">
          <table>
            <thead><tr><th>Image</th><th>Latency</th><th>Bed</th><th>Staff</th><th>IV</th><th>Fall</th><th>Mismatch</th></tr></thead>
            <tbody>${(report.results || []).map(renderVlmRow).join('')}</tbody>
          </table>
          <details><summary class="muted">Field Accuracy</summary><pre>${escapeHtml(JSON.stringify(report.field_accuracy, null, 2))}</pre></details>
          <details><summary class="muted">Confusion Matrices</summary><pre>${escapeHtml(JSON.stringify(report.confusion_matrices, null, 2))}</pre></details>
        </div>
      </section>`;
    }
    function renderVlmRow(row) {
      const a = row.analysis || {};
      const expected = row.expected || {};
      const mismatchFields = mismatchList(expected, a);
      return `<tr>
        <td>${row.filename || ''}</td>
        <td>${row.latency_seconds == null ? 'n/a' : `${row.latency_seconds}s`}</td>
        <td>${expected.bed_state || '?'} → ${a.bed_state || '?'}</td>
        <td>${boolText(expected.staff_present)} → ${boolText(a.staff_present)}</td>
        <td>${(expected.iv || {}).state || '?'} → ${(a.iv || {}).state || '?'}</td>
        <td>${boolText((expected.fall || {}).confirmed)} → ${boolText((a.fall || {}).confirmed)}</td>
        <td class="${mismatchFields.length ? 'bad' : 'ok'}">${mismatchFields.length ? mismatchFields.join(', ') : 'match'}</td>
      </tr>`;
    }
    function mismatchList(expected, actual) {
      const fields = [];
      if ((expected.bed_state || null) !== (actual.bed_state || null)) fields.push('bed');
      if ((expected.staff_present || false) !== (actual.staff_present || false)) fields.push('staff');
      if (((expected.iv || {}).state || null) !== ((actual.iv || {}).state || null)) fields.push('iv');
      if (((expected.fall || {}).confirmed || false) !== ((actual.fall || {}).confirmed || false)) fields.push('fall');
      return fields;
    }
    function renderRun(run) {
      const m = run.metrics || {};
      const events = (run.events || []).slice(0, 20);
      return `<section class="run">
        <div class="run-head">
          <div><strong>${run.name}</strong><div class="muted">${run.scenario} · ${run.camera_role} · ${run.frame_count} frames · ${run.path}</div></div>
          <div class="cards">
            ${metric('Precision', pct(m.precision))}
            ${metric('Recall', pct(m.recall))}
            ${metric('F1', pct(m.f1))}
            ${metric('Errors', `${m.false_positive ?? 0} FP / ${m.false_negative ?? 0} FN`)}
          </div>
        </div>
        <div class="body">
          <div class="frames">${run.frames.map(renderFrame).join('')}</div>
          <div>
            <div class="muted">Events</div>
            <div class="events">${events.map(e => `<span class="chip ${e.severity || ''}">${e.event_type} · ${e.severity}</span>`).join('') || '<span class="muted">No replay report yet.</span>'}</div>
          </div>
          <details><summary class="muted">Metrics JSON</summary><pre>${escapeHtml(JSON.stringify(m, null, 2))}</pre></details>
        </div>
      </section>`;
    }
    function renderFrame(frame) {
      const a = frame.analysis || {};
      const iv = a.iv || {};
      return `<figure>
        <img src="${frame.url}" loading="lazy" />
        <figcaption>
          <span>#${frame.index} · ${a.bed_state || 'unknown'} · staff ${a.staff_present ? 'yes' : 'no'}</span>
          <span>IV ${iv.state || 'unknown'} ${iv.bag_fill_percent != null ? `· ${iv.bag_fill_percent}%` : ''}</span>
        </figcaption>
      </figure>`;
    }
    function metric(label, value) { return `<div class="metric"><span class="muted">${label}</span><strong>${value}</strong></div>`; }
    function pct(v) { return v == null ? 'n/a' : `${Math.round(v * 100)}%`; }
    function boolText(v) { return v ? 'yes' : 'no'; }
    function escapeHtml(s) { return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
    loadRuns();
  </script>
</body>
</html>"""
