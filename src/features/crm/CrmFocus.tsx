import React, { useState } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { normalizePhone, whatsappUrl } from "../finance/financeTools";  
import { buildTemplate, type FocusItem, type FocusKind } from "./crmTools";

const KIND_STYLE: Record<FocusKind, { icon: string; label: string; cls: string }> = {
  followup: { icon: "📌", label: "Follow-up", cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" },
  hot_stale: { icon: "🔥", label: "Reconnect", cls: "border-rose-400/40 bg-rose-500/10 text-rose-300" },
  payment: { icon: "💰", label: "Payment", cls: "border-rose-400/40 bg-rose-500/10 text-rose-300" },
  credit: { icon: "⚠️", label: "Credit", cls: "border-orange-400/40 bg-orange-500/10 text-orange-300" },
  renewal: { icon: "🔁", label: "Renewal", cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
};

export const CrmFocus: React.FC<{
  items: FocusItem[];
  loading?: boolean;
  onOpen: (target: FocusItem["target"]) => void;
}> = ({ items, loading, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 5);

  return (
    <div className={`${FIN.panel} no-print mb-4 p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Today&apos;s Focus</SectionTitle>
        <span className="rounded-full border border-[#c99b3b]/30 bg-[#c99b3b]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f1d68a]">
          {items.length} {items.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-3 text-center text-[12px] text-zinc-500">
          {loading ? "Checking your pipeline..." : "All clear. No follow-ups, overdue payments or renewals need attention today."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
          {shown.map((item) => {
            const k = KIND_STYLE[item.kind];
            return (
              <li key={item.key} className="flex items-center gap-2.5 rounded-lg border border-[#22262d] bg-[#0f1216] p-2">
                <span className="text-[16px]">{k.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12px] font-medium text-zinc-100">{item.title}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${k.cls}`}>{k.label}</span>
                  </div>
                  <p className="truncate text-[11px] text-zinc-500">{item.detail}</p>
                </div>
                {item.template && (
                  <button
                    type="button"
                    title="Send WhatsApp message"
                    onClick={() =>
                      window.open(
                        whatsappUrl(normalizePhone(item.phone), buildTemplate(item.template!, item.templateVars ?? {})),
                        "_blank",
                        "noopener",
                      )
                    }
                    className="shrink-0 rounded-md border border-[#2b3038] px-1.5 py-1 text-[12px] hover:border-[#c99b3b]/50"
                  >
                    💬
                  </button>
                )}
                <button type="button" onClick={() => onOpen(item.target)} className={`${FIN.btnGhost} shrink-0 !px-2.5 !py-1`}>
                  Open
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full text-center text-[11px] font-medium text-[#e5c36a] hover:text-[#f1d68a]"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
};
