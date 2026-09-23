import React from "react";

export interface TabDef {
  key: string;
  label: string;
  badge?: number;
}

export const Tabs: React.FC<{
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex items-center gap-1 border-b border-ink-700/60 overflow-x-auto no-scrollbar">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
          active === tab.key ? "text-signal-cyan" : "text-ink-400 hover:text-ink-100"
        }`}
      >
        {tab.label}
        {typeof tab.badge === "number" && tab.badge > 0 && (
          <span className="ml-2 inline-flex items-center justify-center text-[10px] font-bold bg-ink-700 text-ink-100 rounded-full w-4 h-4">
            {tab.badge}
          </span>
        )}
        {active === tab.key && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-signal-cyan rounded-full" />}
      </button>
    ))}
  </div>
);
