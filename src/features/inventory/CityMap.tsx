import React, { useMemo, useState } from "react";
import type { MediaAsset } from "@/domain";
import { assetOperationalTone } from "@/components/ui/StatusBadge";

const TONE_HEX: Record<string, string> = {
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  violet: "#8b5cf6",
  slate: "#5c6b82",
  cyan: "#22d3ee",
  blue: "#3b82f6",
  rose: "#fb7185",
};

/**
 * Self-contained SVG map — no Leaflet/Mapbox available in this environment
 * (see Phase 0 architecture review). Real asset lat/lng is normalized into
 * a per-city viewBox so relative positioning is still meaningful, on a
 * stylised city-block background rather than real map tiles.
 */
export const CityMap: React.FC<{
  assets: MediaAsset[];
  city: string;
  selectedId: string | null;
  onSelect: (asset: MediaAsset) => void;
}> = ({ assets, city, selectedId, onSelect }) => {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const cityAssets = assets.filter((a) => a.location.city === city);

  const width = 700;
  const height = 420;
  const pad = 50;

  const bounds = useMemo(() => {
    if (cityAssets.length === 0) return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    const lats = cityAssets.map((a) => a.location.geo.lat);
    const lngs = cityAssets.map((a) => a.location.geo.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    // Guard against a zero-size span (single asset) so division stays sane.
    const latSpan = maxLat - minLat || 0.01;
    const lngSpan = maxLng - minLng || 0.01;
    return { minLat: minLat - latSpan * 0.15, maxLat: maxLat + latSpan * 0.15, minLng: minLng - lngSpan * 0.15, maxLng: maxLng + lngSpan * 0.15 };
  }, [cityAssets]);

  function project(lat: number, lng: number) {
    const x = pad + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - pad * 2);
    // Latitude increases northward; SVG y increases downward, so invert.
    const y = pad + (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (height - pad * 2);
    return { x, y };
  }

  // Simple stylised "block grid" background to suggest a city layout without
  // claiming to be a real map.
  const blockLines = [];
  for (let i = 1; i < 8; i++) blockLines.push(pad + ((width - pad * 2) / 8) * i);
  const blockLinesH = [];
  for (let i = 1; i < 5; i++) blockLinesH.push(pad + ((height - pad * 2) / 5) * i);

  return (
    <div className="relative panel p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ height: 420 }}>
        <rect x={0} y={0} width={width} height={height} fill="#0d121c" rx={12} />
        {blockLines.map((x) => (
          <line key={`v-${x}`} x1={x} y1={pad - 10} x2={x} y2={height - pad + 10} stroke="#182234" strokeWidth={1} />
        ))}
        {blockLinesH.map((y) => (
          <line key={`h-${y}`} x1={pad - 10} y1={y} x2={width - pad + 10} y2={y} stroke="#182234" strokeWidth={1} />
        ))}
        <text x={width / 2} y={24} textAnchor="middle" fontSize={12} fill="#5c6b82" fontWeight={600} letterSpacing={1}>
          {city.toUpperCase()} — ILLUSTRATIVE LAYOUT, NOT TO SCALE
        </text>

        {cityAssets.map((asset) => {
          const { x, y } = project(asset.location.geo.lat, asset.location.geo.lng);
          const tone = assetOperationalTone(asset.operationalStatus);
          const color = TONE_HEX[tone];
          const isSelected = asset.id === selectedId;
          const isHover = asset.id === hoverId;
          return (
            <g
              key={asset.id}
              transform={`translate(${x} ${y})`}
              className="cursor-pointer"
              onClick={() => onSelect(asset)}
              onMouseEnter={() => setHoverId(asset.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {(isSelected || isHover) && <circle r={16} fill={color} opacity={0.18} />}
              <circle r={7} fill={color} stroke="#0a0e16" strokeWidth={2} />
              {(isSelected || isHover) && (
                <g transform="translate(0 -14)">
                  <rect x={-70} y={-22} width={140} height={20} rx={5} fill="#151519" stroke="#2b2c31" />
                  <text x={0} y={-8} textAnchor="middle" fontSize={10} fill="#dde3ec" fontWeight={600}>
                    {asset.name.length > 24 ? asset.name.slice(0, 22) + "…" : asset.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-ink-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-signal-green" /> Online</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-signal-violet" /> Maintenance</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-signal-red" /> Offline</span>
      </div>
    </div>
  );
};
