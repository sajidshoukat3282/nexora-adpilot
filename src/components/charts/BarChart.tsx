import React, { useState, useRef } from "react";
import { ChartTooltip } from "./ChartTooltip";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export const BarChart: React.FC<{
  data: BarDatum[];
  height?: number;
  defaultColor?: string;
  formatValue?: (n: number) => string;
  horizontal?: boolean;
}> = ({ data, height = 220, defaultColor = "#22d3ee", formatValue = (n) => n.toLocaleString(), horizontal = false }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 640;
  const padding = horizontal ? { top: 8, right: 40, bottom: 8, left: 110 } : { top: 16, right: 16, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(maxV / 5) * 5 || 5;
  const n = data.length;

  function showTooltip(i: number, e: React.MouseEvent) {
    setHoverIdx(i);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  if (horizontal) {
    const barH = Math.min(28, innerH / n - 10);
    const gap = innerH / n;
    return (
      <div ref={containerRef} className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ height }}>
          {data.map((d, i) => {
            const y = padding.top + i * gap + (gap - barH) / 2;
            const w = (d.value / niceMax) * innerW;
            return (
              <g key={d.label} onMouseMove={(e: React.MouseEvent) => showTooltip(i, e)} onMouseLeave={() => setHoverIdx(null)}>
                <text x={padding.left - 10} y={y + barH / 2 + 4} textAnchor="end" fontSize={11} fill="#8797ae">
                  {d.label}
                </text>
                <rect x={padding.left} y={y} width={innerW} height={barH} fill="#111826" rx={5} />
                <rect
                  x={padding.left}
                  y={y}
                  width={Math.max(2, w)}
                  height={barH}
                  fill={d.color ?? defaultColor}
                  opacity={hoverIdx === i ? 1 : 0.85}
                  rx={5}
                />
                <text x={padding.left + Math.max(2, w) + 8} y={y + barH / 2 + 4} fontSize={11} fill="#dde3ec" fontWeight={600}>
                  {formatValue(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
        <ChartTooltip x={mouse.x} y={mouse.y} visible={hoverIdx !== null}>
          {hoverIdx !== null && (
            <div>
              <div className="text-ink-300">{data[hoverIdx].label}</div>
              <div className="text-ink-50 font-semibold">{formatValue(data[hoverIdx].value)}</div>
            </div>
          )}
        </ChartTooltip>
      </div>
    );
  }

  const bandW = innerW / n;
  const barW = Math.min(46, bandW * 0.55);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ height }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const y = padding.top + (innerH / 4) * i;
          const val = Math.round(niceMax - (niceMax / 4) * i);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#182234" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#5c6b82">
                {val}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padding.left + i * bandW + (bandW - barW) / 2;
          const h = (d.value / niceMax) * innerH;
          const y = padding.top + innerH - h;
          return (
            <g key={d.label} onMouseMove={(e: React.MouseEvent) => showTooltip(i, e)} onMouseLeave={() => setHoverIdx(null)}>
              <rect x={x} y={padding.top} width={barW} height={innerH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                fill={d.color ?? defaultColor}
                opacity={hoverIdx === i ? 1 : 0.85}
                rx={4}
              />
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" fontSize={10} fill="#5c6b82">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip x={mouse.x} y={mouse.y} visible={hoverIdx !== null}>
        {hoverIdx !== null && (
          <div>
            <div className="text-ink-300">{data[hoverIdx].label}</div>
            <div className="text-ink-50 font-semibold">{formatValue(data[hoverIdx].value)}</div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
};
