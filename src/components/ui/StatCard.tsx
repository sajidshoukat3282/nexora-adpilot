import React, { useEffect, useRef, useState } from "react";

function useAnimatedNumber(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = 0;
    startRef.current = null;
    let raf: number;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export const StatCard: React.FC<{
  label: string;
  value: number;
  format?: (n: number) => string;
  trend?: { direction: "up" | "down"; label: string };
  icon?: React.ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "default";
  demo?: boolean;
}> = ({ label, value, format, trend, icon, tone = "default", demo }) => {
  const animated = useAnimatedNumber(value);
  const display = format ? format(animated) : animated.toLocaleString();

  const toneClass = {
    cyan: "text-signal-cyan",
    green: "text-signal-green",
    amber: "text-signal-amber",
    red: "text-signal-red",
    default: "text-ink-50",
  }[tone];

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
        {icon && <span className="text-ink-500">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold tabular-nums ${toneClass}`}>{display}</div>
      <div className="flex items-center justify-between min-h-[18px]">
        {trend && (
          <span className={`text-xs font-medium ${trend.direction === "up" ? "text-signal-green" : "text-signal-red"}`}>
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </span>
        )}
        {demo && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-signal-amber/80">Demo</span>
        )}
      </div>
    </div>
  );
};
