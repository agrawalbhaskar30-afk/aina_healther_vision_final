/* global React, Icon, AidaMark */
// Right column: Ask Aida assistant panel.

const { useState: useStateAida, useRef: useRefAida, useEffect: useEffectAida } = React;

// Pre-canned responses keyed by the suggested-question chip label or freeform.
const CANNED_REPLIES = {
  "What needs review?": {
    text: "Two items: (1) SpO₂ trended down from 99% to 94% between 06:42 and 07:14 — flagged as warning, no staff visit during the decline; (2) No staff visit logged in the last 2h 14m, exceeding the 2-hour soft threshold for ICU-2.",
    cites: [
      { icon: "📈", label: "SpO₂ trend 6:42–7:14" },
      { icon: "👤", label: "Staff log" },
    ],
  },
  "Show evidence for the SpO2 alert": {
    text: "SpO₂ reading from the bedside monitor (Philips IntelliVue, OCR confidence 0.96) declined steadily: 99% at 06:42, 98% at 06:54, 96% at 07:06, 94% at 07:14. Decline rate 0.16%/min — above the 0.10%/min alert threshold. RR remained 18; HR 70 → 72.",
    cites: [
      { icon: "📊", label: "Vitals OCR 6:42–7:14" },
      { icon: "⚠", label: "Alert 7:14 AM" },
      { icon: "📈", label: "Trend rule" },
    ],
  },
  "Was staff present?": {
    text: "No. Last staff visit ended at 05:12 AM (charge nurse, ~6 min duration). No subsequent door-zone entries detected by Bedside Cam 1. The 4-hour timeline shows no staff-present spans after 05:12.",
    cites: [
      { icon: "👤", label: "Last staff visit 5:12 AM" },
      { icon: "🎥", label: "Door-zone log" },
    ],
  },
};

// Initial chat history (3 example exchanges from the spec).
const INITIAL_HISTORY = [
  {
    role: "user",
    text: "What is happening in the room right now?",
  },
  {
    role: "aida",
    text: "The patient is in bed, resting. No staff has visited in the last 2 hours 14 minutes. Last vitals reading at 7:14 AM showed HR 72, BP 118/76, SpO₂ 94, RR 18. The SpO₂ dip from 99 to 94 was flagged as a warning at 7:14 AM and is being monitored.",
    cites: [
      { icon: "📊", label: "Vitals 7:14 AM" },
      { icon: "⚠", label: "Event 7:14 AM" },
      { icon: "👤", label: "Last staff visit 5:12 AM" },
    ],
  },
  {
    role: "user",
    text: "Did SpO₂ drop before the distress alert?",
  },
  {
    role: "aida",
    text: "Yes. SpO₂ trended down from 99% at 6:42 AM to 94% by 7:14 AM. The decline started 32 minutes before the alert fired. There was no recorded staff visit during this window.",
    cites: [
      { icon: "📈", label: "SpO₂ trend 6:42–7:14" },
      { icon: "⚠", label: "Alert 7:14 AM" },
    ],
  },
  {
    role: "user",
    text: "Summarize the last hour.",
  },
  {
    role: "aida",
    text: "Between 6:30 AM and 7:30 AM: SpO₂ declined from 99% to 94%, prompting an automated alert at 7:14 AM. No staff visited the room during this period. The patient remained in bed throughout. HR and BP remained stable. Position changed slightly at 7:26 AM, possibly indicating discomfort.",
    cites: [
      { icon: "📊", label: "Vitals" },
      { icon: "📍", label: "Position 7:26 AM" },
      { icon: "👤", label: "Staff log" },
    ],
  },
];

const SUGGESTED = [
  "What needs review?",
  "Show evidence for the SpO2 alert",
  "Was staff present?",
];

// ----- A single chat message ---------------------------------
function ChatMessage({ msg, flashCiteIdx }) {
  if (msg.role === "user") {
    return (
      <div className="msg user">
        <span className="av" title="You">You</span>
        <div className="bubble">{msg.text}</div>
      </div>
    );
  }
  if (msg.role === "thinking") {
    return (
      <div className="msg aida thinking">
        <span className="av"><AidaMark size={14} /></span>
        <div className="bubble">
          <span className="dot-pulse" />
          <span className="dot-pulse" />
          <span className="dot-pulse" />
          <span style={{ marginLeft: 4 }}>Aida is checking the timeline…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="msg aida">
      <span className="av"><AidaMark size={14} /></span>
      <div className="bubble">
        <div className="who">Aida</div>
        <div>{msg.text}</div>
        {msg.cites && msg.cites.length > 0 && (
          <div className="aida-cites">
            {msg.cites.map((c, i) => (
              <button
                key={i}
                type="button"
                className={"aida-cite" + (flashCiteIdx === i ? " flash" : "")}
                title="Open evidence"
              >
                <span aria-hidden="true">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Summary card (collapsible — collapsed by default) -----
function SummaryCard() {
  const [open, setOpen] = useStateAida(false);
  return (
    <div className={"aida-summary" + (open ? " open" : "")}>
      <button
        type="button"
        className="sum-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="aida-summary-body"
      >
        <span className="lbl">Summary</span>
        <span className="preview">
          {open ? "Patient context" : "58 M · Day 4 post-op · Stable, recent SpO₂ dip 7:14"}
        </span>
        <span className="caret"><Icon name="chevronDown" size={14} /></span>
      </button>
      <div id="aida-summary-body" className="sum-body">
        A 58-year-old male, Day 4 post-cholecystectomy. Currently in ICU-2 with stable vitals trending toward discharge readiness. Recent SpO₂ dip noted at 7:14 AM, currently being monitored. No falls or critical events in the last 24 hours.{" "}
        Admitted 14 May after elective laparoscopic cholecystectomy; uncomplicated intra-op course. Transient fever (38.2 °C) on Day 1, resolved with acetaminophen. Ambulating with assistance since Day 2. NKDA. Anticoagulation per protocol.
      </div>
    </div>
  );
}

// ----- Right column composition ------------------------------
function RightColumn({ open = true, onToggle }) {
  const [history, setHistory] = useStateAida(INITIAL_HISTORY);
  const [input, setInput] = useStateAida("");
  const [usedSuggested, setUsedSuggested] = useStateAida(new Set());
  const [thinking, setThinking] = useStateAida(false);
  const chatRef = useRefAida(null);

  // Scroll chat to bottom on history change.
  useEffectAida(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, thinking, open]);

  function pushUser(text) {
    setHistory((h) => [...h, { role: "user", text }]);
  }
  function pushAida(reply) {
    setHistory((h) => [...h, { role: "aida", text: reply.text, cites: reply.cites }]);
  }

  function askSuggested(label) {
    if (usedSuggested.has(label) || thinking) return;
    pushUser(label);
    setUsedSuggested((s) => new Set([...s, label]));
    setThinking(true);
    setTimeout(() => {
      const reply = CANNED_REPLIES[label] || {
        text: "I'd need more time on this dataset to answer confidently. Surface the question to the charge nurse?",
        cites: [],
      };
      pushAida(reply);
      setThinking(false);
    }, 750);
  }

  function submitFreeform(e) {
    e && e.preventDefault();
    const q = input.trim();
    if (!q || thinking) return;
    pushUser(q);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      let reply = null;
      const lower = q.toLowerCase();
      if (lower.includes("spo") || lower.includes("oxygen")) reply = CANNED_REPLIES["Show evidence for the SpO2 alert"];
      else if (lower.includes("staff") || lower.includes("nurse") || lower.includes("visit")) reply = CANNED_REPLIES["Was staff present?"];
      else if (lower.includes("review") || lower.includes("flag")) reply = CANNED_REPLIES["What needs review?"];
      else reply = {
        text: `I checked the last 4 hours of data for "${q}". Vitals are within expected ranges except SpO₂ (94%, warning). The patient has been in bed throughout. Would you like me to expand the window to the full shift?`,
        cites: [
          { icon: "📊", label: "Vitals last 4h" },
          { icon: "🛏", label: "Bed state" },
        ],
      };
      pushAida(reply);
      setThinking(false);
    }, 850);
  }

  const allUsed = SUGGESTED.every((s) => usedSuggested.has(s));

  if (!open) {
    return (
      <div className="col right">
        <div className="aida-rail">
          <span className="mk"><AidaMark size={22} /></span>
          <button
            type="button"
            className="reopen"
            aria-label="Open Ask Aida panel"
            title="Open panel"
            onClick={onToggle}
          >
            <Icon name="panelRightOpen" size={15} />
          </button>
          <span className="vlabel">Ask Aida</span>
        </div>
      </div>
    );
  }

  return (
    <div className="col right">
      <div className="aida-panel">
        <div className="aida-head">
          <span className="mk"><AidaMark size={18} /></span>
          <span className="ttl">Ask Aida</span>
          <span className="sub">grounded · this room</span>
          <button
            type="button"
            className="collapse-btn"
            aria-label="Collapse Ask Aida panel"
            title="Collapse panel"
            onClick={onToggle}
          >
            <Icon name="panelRightClose" size={15} />
          </button>
        </div>

        <SummaryCard />

        <div className="aida-chat" ref={chatRef}>
          {history.map((m, i) => (
            <ChatMessage key={i} msg={m} />
          ))}
          {thinking && <ChatMessage msg={{ role: "thinking" }} />}
        </div>

        <div className="aida-input-wrap">
          {!allUsed && (
            <div className="aida-suggested">
              {SUGGESTED.filter((s) => !usedSuggested.has(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="suggested-chip"
                  onClick={() => askSuggested(s)}
                  disabled={thinking}
                >
                  <span className="pl">↳</span>{s}
                </button>
              ))}
            </div>
          )}
          <form className="aida-input" onSubmit={submitFreeform}>
            <input
              type="text"
              placeholder="Ask about this patient…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={thinking}
              aria-label="Ask Aida"
            />
            <button
              type="submit"
              className="send"
              aria-label="Send"
              disabled={!input.trim() || thinking}
            >
              <Icon name="send" size={14} />
            </button>
          </form>
          <div className="aida-foot">
            Answers grounded in this room's data. <span className="kbd">⌘</span><span className="kbd">K</span> for shortcuts.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RightColumn });
