import React, { useState } from "react";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  data: DonutDatum[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}> = ({ data, size = 180, centerLabel, centerValue }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const stroke = size * 0.16;
  const radius = r - stroke / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const len = frac * circumference;
    const seg = { ...d, offset, len, i };
    offset += len;
    return seg;
  });

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <g transform={`rotate(-90 ${r} ${r})`}>
            <circle cx={r} cy={r} r={radius} fill="none" stroke="#111826" strokeWidth={stroke} />
            {segments.map((s) => (
              <circle
                key={s.label}
                cx={r}
                cy={r}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${s.len} ${circumference - s.len}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                opacity={hoverIdx === null || hoverIdx === s.i ? 1 : 0.35}
                onMouseEnter={() => setHoverIdx(s.i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ transition: "opacity 150ms ease", cursor: "pointer" }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-ink-50 tabular-nums">
            {hoverIdx !== null ? `${Math.round((data[hoverIdx].value / total) * 100)}%` : centerValue}
          </span>
          <span className="text-[11px] text-ink-400 text-center px-2">
            {hoverIdx !== null ? data[hoverIdx].label : centerLabel}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex items-center gap-2 text-sm cursor-pointer"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.5 }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-ink-300">{d.label}</span>
            <span className="text-ink-500 tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number }> = ({
  values,
  color = "#22d3ee",
  width = 100,
  height = 32,
}) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
