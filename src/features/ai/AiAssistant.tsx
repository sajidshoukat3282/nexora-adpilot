import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import './aiAssistant.css';

/**
 * Header button + billboard overlay for the AdPilot AI assistant.
 * Place <AiAssistant /> inside the signed-in header. It talks to /api/ai/usage and /api/ai/ask,
 * and every permission and plan decision is made by the Worker, not here.
 */

type Row = [string, string, string];

interface AiAction {
  id: string;
  label: string;
  requires: string;
  invoiceIds?: string[];
}

interface AiAnswer {
  ok: true;
  intent: string;
  headline: string;
  sub: string;
  rows: Row[];
  actions: AiAction[];
  summary: string | null;
  usage: { used: number; limit: number | null };
}

interface AiProblem {
  ok: false;
  error: string;
  message?: string;
}

interface UsageInfo {
  used: number;
  limit: number | null;
  locked: boolean;
  configured: boolean;
  intents: string[];
}

type Screen =
  | { phase: 'idle' }
  | { phase: 'loading'; question: string }
  | { phase: 'answer'; question: string; data: AiAnswer }
  | { phase: 'problem'; question: string; error: string; message: string };

const QUICK_LABELS: Record<string, string> = {
  overdue_invoices: 'Overdue invoices',
  finance_summary: 'Money position',
  credit_risk: 'Over credit limit',
  campaigns_status: 'Running campaigns',
  leads_summary: 'Lead pipeline',
};

const QUICK_QUESTIONS: Record<string, string> = {
  overdue_invoices: 'Which invoices are overdue?',
  finance_summary: 'How is our money position?',
  credit_risk: 'Which clients are over their credit limit?',
  campaigns_status: 'Which campaigns are running?',
  leads_summary: 'What is in our lead pipeline?',
};

/** Where the "Open ..." buttons go. Change these to match the app's real routes. */
const ACTION_ROUTES: Record<string, string> = {
  open_finance: '#/finance',
  open_crm: '#/crm',
  open_campaigns: '#/campaigns',
};

const BUILT_KEY = 'adpilot_ai_built';
const BUILD_MS = 3000;

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  );
}

function Rig() {
  return (
    <svg viewBox="0 0 800 560" role="img" aria-label="A billboard structure assembling itself">
      <defs>
        <radialGradient id="abb-glow">
          <stop offset="0" stopColor="#f1c76b" stopOpacity=".55" />
          <stop offset="1" stopColor="#f1c76b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line className="abb-ground" pathLength={1} x1="0" y1="520" x2="800" y2="520" />
      <g className="abb-post"><rect x="196" y="430" width="22" height="90" /><rect x="186" y="514" width="42" height="6" /></g>
      <g className="abb-post"><rect x="582" y="430" width="22" height="90" /><rect x="572" y="514" width="42" height="6" /></g>
      <line className="abb-catwalk" pathLength={1} x1="40" y1="430" x2="760" y2="430" />
      <line className="abb-hanger" pathLength={1} x1="100" y1="404" x2="100" y2="430" />
      <line className="abb-hanger" pathLength={1} x1="300" y1="404" x2="300" y2="430" />
      <line className="abb-hanger" pathLength={1} x1="500" y1="404" x2="500" y2="430" />
      <line className="abb-hanger" pathLength={1} x1="700" y1="404" x2="700" y2="430" />
      <rect className="abb-frame-o" pathLength={1} x="40" y="34" width="720" height="370" rx="3" />
      <rect className="abb-frame-i" pathLength={1} x="52" y="46" width="696" height="346" />
      <circle className="abb-bolt" cx="46" cy="40" r="3" />
      <circle className="abb-bolt" cx="754" cy="40" r="3" />
      <circle className="abb-bolt" cx="46" cy="398" r="3" />
      <circle className="abb-bolt" cx="754" cy="398" r="3" />
      {[160, 400, 640].map((x) => (
        <g className="abb-lamp" key={x}>
          <circle cx={x} cy="24" r="22" fill="url(#abb-glow)" />
          <path className="abb-lamp-head" d={`M${x - 14} 12 h28 l-6 9 h-16 z`} />
          <line x1={x} y1="21" x2={x} y2="34" />
        </g>
      ))}
    </svg>
  );
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [build, setBuild] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [screen, setScreen] = useState<Screen>({ phase: 'idle' });
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    let seen = false;
    try { seen = sessionStorage.getItem(BUILT_KEY) === '1'; } catch { /* storage unavailable */ }
    setBuild(!seen);
    setScreenOn(false);
    setScreen({ phase: 'idle' });
    setConfirming(false);
    setNote('');
    const timer = window.setTimeout(() => {
      setScreenOn(true);
      try { sessionStorage.setItem(BUILT_KEY, '1'); } catch { /* ignore */ }
    }, seen ? 80 : BUILD_MS);

    let cancelled = false;
    fetch('/api/ai/usage', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data: ({ ok: true } & UsageInfo) | AiProblem) => {
        if (!cancelled && data.ok) setUsage(data);
      })
      .catch(() => { /* the screen still opens, questions will show the error */ });

    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  const ask = useCallback(async (intent: string | null, typed: string) => {
    const question = typed.trim() || (intent ? QUICK_QUESTIONS[intent] : '');
    if (!question) return;
    setScreen({ phase: 'loading', question });
    setConfirming(false);
    setNote('');
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: intent ?? undefined, question }),
      });
      const data = (await res.json()) as AiAnswer | AiProblem;
      if (data.ok) {
        setScreen({ phase: 'answer', question, data });
        setUsage((current) => (current ? { ...current, used: data.usage.used } : current));
      } else {
        setScreen({ phase: 'problem', question, error: data.error, message: data.message ?? 'Something went wrong.' });
      }
    } catch {
      setScreen({ phase: 'problem', question, error: 'NETWORK', message: 'Could not reach AdPilot. Check your connection.' });
    }
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    void ask(null, text);
    setText('');
  };

  const onAction = async (action: AiAction) => {
    if (action.id === 'send_reminders') {
      const ids = action.invoiceIds ?? [];
      if (!confirming) { setConfirming(true); return; }
      setConfirming(false);
      setNote('Sendingâ€¦');
      let sent = 0;
      for (const id of ids) {
        try {
          const res = await fetch(`/api/invoices/${encodeURIComponent(id)}/remind`, { method: 'POST', credentials: 'same-origin' });
          if (res.ok) sent += 1;
        } catch { /* counted as not sent */ }
      }
      setNote(`Sent ${sent} of ${ids.length} reminders.`);
      return;
    }
    const target = ACTION_ROUTES[action.id];
    if (target) {
      window.location.hash = target;
      setOpen(false);
    }
  };

  const left = usage && usage.limit !== null ? Math.max(usage.limit - usage.used, 0) : null;
  const busy = screen.phase === 'loading';

  return (
    <>
      <button type="button" className="abb-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SparkIcon /> AI
      </button>

      {open && (
        <div className="abb-overlay" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="abb-modal" role="dialog" aria-modal="true" aria-label="AdPilot AI assistant">
            <div className="abb-top">
              <div>
                <p className="abb-title">AdPilot AI</p>
                <p className="abb-left">
                  {usage === null ? '' : usage.limit === null ? 'No daily limit' : `${left} of ${usage.limit} questions left today`}
                </p>
              </div>
              <button type="button" className="abb-close" onClick={close} ref={closeRef}>Close</button>
            </div>

            <div className={`abb-rig ${build ? 'abb-run' : ''}`}>
              <Rig />
              <div className="abb-screen">
                <div className={`abb-screen-inner ${screenOn ? 'abb-on' : ''}`}>
                  <div className="abb-bar">
                    <span className="abb-live">AdPilot AI</span>
                    <span className="abb-tag">Your company data only</span>
                  </div>
                  <ScreenBody screen={screen} usage={usage} confirming={confirming} note={note} onAction={onAction} />
                </div>
              </div>
            </div>

            <div className="abb-chips" role="group" aria-label="Quick questions">
              {(usage?.intents ?? []).map((intent) => (
                <button key={intent} type="button" className="abb-chip" disabled={busy} onClick={() => void ask(intent, '')}>
                  {QUICK_LABELS[intent] ?? intent}
                </button>
              ))}
            </div>

            <form className="abb-form" onSubmit={onSubmit}>
              <input
                id="abb-question"
                className="abb-input"
                type="text"
                value={text}
                maxLength={300}
                placeholder="Which invoices are overdue?"
                aria-label="Ask the assistant"
                onChange={(event) => setText(event.target.value)}
              />
              <button type="submit" className="abb-send" disabled={busy || !text.trim()}>Ask</button>
            </form>
            {usage?.locked && <p className="abb-hint">The assistant is not included in your plan.</p>}
          </div>
        </div>
      )}
    </>
  );
}

function ScreenBody(props: {
  screen: Screen;
  usage: UsageInfo | null;
  confirming: boolean;
  note: string;
  onAction: (action: AiAction) => void;
}) {
  const { screen, usage, confirming, note, onAction } = props;

  if (screen.phase === 'idle') {
    return (
      <div className="abb-ans">
        <div className="abb-h abb-led"><span>{usage?.locked ? 'Not in your plan' : 'Ask about your business'}</span></div>
        <p className="abb-msg abb-led" style={{ animationDelay: '.3s' }}>
          {usage?.locked
            ? 'Ask your account owner about upgrading to use the assistant.'
            : 'Pick a quick question or type your own.'}
        </p>
      </div>
    );
  }

  if (screen.phase === 'loading') {
    return (
      <>
        <div className="abb-q">{screen.question}</div>
        <div className="abb-ans"><p className="abb-wait">Working on itâ€¦</p></div>
      </>
    );
  }

  if (screen.phase === 'problem') {
    const title =
      screen.error === 'FORBIDDEN' ? 'No access'
      : screen.error === 'PLAN_LOCKED' ? 'Not in your plan'
      : screen.error === 'DAILY_LIMIT' ? 'Daily limit reached'
      : 'Could not answer';
    return (
      <>
        <div className="abb-q">{screen.question}</div>
        <div className="abb-ans" key={screen.question + screen.error}>
          <div className="abb-h abb-led"><span>{title}</span></div>
          <p className="abb-msg abb-led" style={{ animationDelay: '.3s' }}>{screen.message}</p>
        </div>
      </>
    );
  }

  const { data } = screen;
  return (
    <>
      <div className="abb-q">{screen.question}</div>
      <div className="abb-ans" key={screen.question + data.headline}>
        <div className="abb-h abb-led">
          <span>{data.headline}</span>
          {data.sub && <span className="abb-sub">{data.sub}</span>}
        </div>
        {data.rows.map((row, index) => (
          <div className="abb-row abb-led" key={`${row[0]}-${index}`} style={{ animationDelay: `${0.3 + index * 0.28}s` }}>
            <span>{row[0]}</span>
            <span>{row[1]}</span>
            <span className="abb-v">{row[2]}</span>
          </div>
        ))}
        {data.summary && (
          <p className="abb-sum abb-led" style={{ animationDelay: `${0.4 + data.rows.length * 0.28}s` }}>{data.summary}</p>
        )}
        <div className="abb-acts abb-led" style={{ animationDelay: `${0.5 + data.rows.length * 0.28}s` }}>
          {data.actions.map((action) => {
            const confirmingThis = action.id === 'send_reminders' && confirming;
            const label = confirmingThis ? `Confirm: email ${action.invoiceIds?.length ?? 0} clients` : action.label;
            return (
              <button key={action.id} type="button" className="abb-act" data-confirm={confirmingThis} onClick={() => onAction(action)}>
                {label}
              </button>
            );
          })}
          {note && <span className="abb-note">{note}</span>}
        </div>
      </div>
    </>
  );
}
