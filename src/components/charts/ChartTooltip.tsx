import React from "react";

export const ChartTooltip: React.FC<{
  x: number;
  y: number;
  visible: boolean;
  children: React.ReactNode;
}> = ({ x, y, visible, children }) => {
  if (!visible) return null;
  return (
    <div
      className="absolute pointer-events-none z-10 bg-ink-850 border border-ink-600 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap"
      style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 10px))" }}
    >
      {children}
    </div>
  );
};
