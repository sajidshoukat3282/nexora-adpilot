import React, { useState, useRef } from "react";
import { ChartTooltip } from "./ChartTooltip";

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export const LineChart: React.FC<{
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (n: number) => string;
}> = ({ labels, series, height = 220, formatValue = (n) => n.toLocaleString() }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 640;
  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxV = Math.max(1, ...allValues);
  const niceMax = Math.ceil(maxV / 5) * 5 || 5;

  const n = labels.length;
  const xFor = (i: number) => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yFor = (v: number) => padding.top + innerH - (v / niceMax) * innerH;

  function pathFor(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");
  }

  function areaFor(values: number[]): string {
    const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");
    return `${line} L ${xFor(values.length - 1)} ${padding.top + innerH} L ${xFor(0)} ${padding.top + innerH} Z`;
  }

  const gridLines = 4;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round(((relX - padding.left) / innerW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHoverIdx(idx);
    if (containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      setMouse({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ height }}>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padding.top + (innerH / gridLines) * i;
          const val = Math.round(niceMax - (niceMax / gridLines) * i);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#182234" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#5c6b82">
                {val}
              </text>
            </g>
          );
        })}

        {series.map((s) => (
          <path key={`area-${s.name}`} d={areaFor(s.values)} fill={s.color} opacity={0.08} />
        ))}
        {series.map((s) => (
          <path key={`line-${s.name}`} d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {labels.map((label, i) => {
          if (n > 10 && i % Math.ceil(n / 8) !== 0) return null;
          return (
            <text key={i} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#5c6b82">
              {label}
            </text>
          );
        })}

        {hoverIdx !== null && (
          <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={padding.top} y2={padding.top + innerH} stroke="#374357" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {hoverIdx !== null &&
          series.map((s) => (
            <circle key={`dot-${s.name}`} cx={xFor(hoverIdx)} cy={yFor(s.values[hoverIdx])} r={3.5} fill={s.color} stroke="#0a0e16" strokeWidth={1.5} />
          ))}

        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>

      <ChartTooltip x={mouse.x} y={mouse.y} visible={hoverIdx !== null}>
        {hoverIdx !== null && (
          <div className="space-y-1">
            <div className="text-ink-300 font-semibold">{labels[hoverIdx]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-ink-400">{s.name}:</span>
                <span className="text-ink-50 font-semibold">{formatValue(s.values[hoverIdx])}</span>
              </div>
            ))}
          </div>
        )}
      </ChartTooltip>

      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-ink-400">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
};
