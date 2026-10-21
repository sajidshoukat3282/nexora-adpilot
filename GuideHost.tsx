import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentPath, useNavigate } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { getSetupStatus, type SetupStatus } from "@/lib/api/admin";
import { FDrawer, FIN, SectionTitle } from "../finance/financeUi";
import { GENERAL_TOPICS, PAGE_GUIDES, guideForPath, searchGuides, type GuideTopic, type PageGuide } from "./guideContent";
import { SetupChecklist } from "./SetupChecklist";
import { setupProgress } from "./setupSteps";

export const OPEN_GUIDE_EVENT = "adpilot:open-guide";

const SEEN_KEY = "adpilot.guide.seen";
const readSeen = (): boolean => {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};
const writeSeen = () => {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
};

const Topic: React.FC<{ topic: GuideTopic; defaultOpen?: boolean }> = ({ topic, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border border-[#22262d] bg-[#0f1216]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-[12px] font-semibold text-zinc-100">{topic.title}</span>
        <span className="text-[11px] text-[#e5c36a]">{open ? "\u{2212}" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[#22262d] px-3 py-2.5">
          <ol className="space-y-1.5">
            {topic.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-5 text-zinc-300">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c99b3b]/15 text-[9px] font-bold text-[#f1d68a]">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {topic.tip && (
            <p className="mt-2.5 rounded-md border border-[#c99b3b]/25 bg-[#c99b3b]/10 px-2.5 py-1.5 text-[11px] text-[#e5c36a]">
              Tip: {topic.tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const PageGuideView: React.FC<{ guide: PageGuide; onGo?: () => void }> = ({ guide, onGo }) => (
  <div>
    <p className="mb-3 text-[12px] leading-5 text-zinc-400">{guide.summary}</p>
    <div className="space-y-2">
      {guide.topics.map((t, i) => (
        <Topic key={t.title} topic={t} defaultOpen={i === 0} />
      ))}
    </div>
    {onGo && (
      <button type="button" className={`${FIN.btnGhost} mt-3`} onClick={onGo}>
        Go to {guide.title}
      </button>
    )}
  </div>
);

type Tab = "page" | "start" | "all";

export const GuideHost: React.FC = () => {
  const { session } = useSession();
  const path = useCurrentPath();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("page");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [seen, setSeen] = useState<boolean>(readSeen());
  const [dismissed, setDismissed] = useState(false);

  const isStaff = !!session && session.accountType !== "client";
  const guide = guideForPath(path);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await getSetupStatus());
    } catch {
      /* the guide still works without live progress */
    }
  }, []);

  useEffect(() => {
    if (isStaff) void loadStatus();
  }, [isStaff, loadStatus, path]);

  useEffect(() => {
    const onOpen = () => {
      setTab(guideForPath(window.location.hash.replace(/^#/, "").split("?")[0] || "/") ? "page" : "start");
      setOpen(true);
    };
    window.addEventListener(OPEN_GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) {
      if (!seen) {
        writeSeen();
        setSeen(true);
      }
      void loadStatus();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = setupProgress(status);
  const hits = useMemo(() => searchGuides(query), [query]);

  if (!isStaff) return null;

  const allDone = !!status && progress.pct === 100;
  const showLauncher = !(allDone && seen) && !dismissed;

  return (
    <>
      {showLauncher && !open && (
        <div data-no-print className="fixed bottom-4 right-4 z-30 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setTab(guide ? "page" : "start");
              setOpen(true);
            }}
            className={`flex items-center gap-2 rounded-full border border-[#f6e2a1]/40 bg-gradient-to-b from-[#1b1f26] to-[#0f1216] py-1.5 pl-1.5 pr-3.5 text-[11px] font-semibold text-[#f1d68a] shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition hover:border-[#f1d68a]/70 ${
              seen ? "" : "animate-pulse"
            }`}
            title="Open the guide"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f1d68a] to-[#a97b22] text-[12px] font-bold text-[#1a1204]">?</span>
            Getting Started{status ? ` \u{B7} ${progress.pct}%` : ""}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full px-1.5 text-[12px] text-zinc-500 hover:text-zinc-200"
            title="Hide until next visit"
            aria-label="Hide guide button"
          >
            {"\u{D7}"}
          </button>
        </div>
      )}

      <FDrawer open={open} onClose={() => setOpen(false)} title="Guide" subtitle="Learn how every part of AdPilot works" width="max-w-[520px]">
        <div className="space-y-3">
          <input
            className={FIN.input}
            placeholder='Search the guide, e.g. "invoice", "invite", "credit limit"'
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />

          {query.trim() ? (
            <div className="space-y-2">
              <SectionTitle>Results</SectionTitle>
              {hits.length === 0 && <p className="py-3 text-center text-[12px] text-zinc-500">Nothing found. Try another word.</p>}
              {hits.map((h) => (
                <div key={h.page.path + h.topic.title}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{h.page.title}</p>
                  <Topic topic={h.topic} defaultOpen />
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-semibold text-[#e5c36a] hover:text-[#f1d68a]"
                    onClick={() => {
                      navigate(h.page.path);
                      setOpen(false);
                    }}
                  >
                    Go to {h.page.title}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b border-[#2a2f37]">
                {([
                  ["page", "This page"],
                  ["start", "Getting started"],
                  ["all", "All modules"],
                ] as [Tab, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`-mb-px border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
                      tab === k ? "border-[#e5c36a] text-[#f1d68a]" : "border-transparent text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "page" &&
                (guide ? (
                  <PageGuideView guide={guide} />
                ) : (
                  <p className="py-4 text-center text-[12px] text-zinc-500">No guide for this page. Open the All modules tab.</p>
                ))}

              {tab === "start" && (
                <div className="space-y-4">
                  <SetupChecklist status={status} onNavigate={() => setOpen(false)} />
                  <div className="space-y-2">
                    <SectionTitle>Good to know</SectionTitle>
                    {GENERAL_TOPICS.map((t) => (
                      <Topic key={t.title} topic={t} />
                    ))}
                  </div>
                </div>
              )}

              {tab === "all" && (
                <div className="space-y-2">
                  {PAGE_GUIDES.map((g) => (
                    <details key={g.path} className="rounded-lg border border-[#22262d] bg-[#0f1216]">
                      <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-zinc-100">{g.title}</summary>
                      <div className="border-t border-[#22262d] p-3">
                        <PageGuideView
                          guide={g}
                          onGo={() => {
                            navigate(g.path);
                            setOpen(false);
                          }}
                        />
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </FDrawer>
    </>
  );
};
