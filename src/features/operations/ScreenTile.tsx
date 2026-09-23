import React from "react";
import { StatusBadge, screenStatusTone } from "@/components/ui/StatusBadge";
import type { LiveScreen } from "@/domain";

export const ScreenTile: React.FC<{
  screen: LiveScreen;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}> = ({ screen, selected, checked, onSelect, onToggleCheck }) => (
  <div
    className={`panel p-4 cursor-pointer transition-colors ${selected ? "border-signal-cyan/50" : ""}`}
    onClick={onSelect}
  >
    <div className="flex items-start justify-between mb-2">
      <label className="flex items-center gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onToggleCheck} className="accent-signal-cyan" />
      </label>
      <StatusBadge label={screen.liveStatus} tone={screenStatusTone(screen.liveStatus)} />
    </div>
    <div className="text-sm font-semibold text-ink-100 truncate">{screen.name}</div>
    <div className="text-xs text-ink-500 mb-3">{screen.city}</div>
    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
      <div className="bg-ink-800 rounded-md p-1.5 text-center">
        <div className="text-ink-500">Network</div>
        <div className={screen.network === "good" ? "text-signal-green" : screen.network === "degraded" ? "text-signal-amber" : "text-signal-red"}>
          {screen.network}
        </div>
      </div>
      <div className="bg-ink-800 rounded-md p-1.5 text-center">
        <div className="text-ink-500">Storage</div>
        <div className="text-ink-200">{screen.storagePct}%</div>
      </div>
      <div className="bg-ink-800 rounded-md p-1.5 text-center">
        <div className="text-ink-500">Temp</div>
        <div className="text-ink-200">{screen.temperatureC}°C</div>
      </div>
    </div>
  </div>
);
