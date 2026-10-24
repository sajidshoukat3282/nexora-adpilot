import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { FIN, GOLD_CARD, SILVER_CARD } from "@/features/finance/financeUi";
import { weatherApi, type CampaignWeather, type CompanyWeather, type WeatherView } from "@/lib/api/weather";

/** Small drawn weather symbols (no extra icon packages). */
export const WeatherGlyph: React.FC<{ condition: string; size?: number; color?: string }> = ({ condition, size = 28, color = "currentColor" }) => {
  const p = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const cloud = <path d="M9 22a5 5 0 0 1-.4-10A7 7 0 0 1 22 10.5 5.5 5.5 0 0 1 22.5 22z" />;
  if (condition === "clear") return (<svg {...p}><circle cx="16" cy="16" r="5" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (<line key={a} x1="16" y1="5" x2="16" y2="8" transform={`rotate(${a} 16 16)`} />))}</svg>);
  if (condition === "rain" || condition === "heavy_rain") return (<svg {...p}>{cloud}<line x1="11" y1="25" x2="10" y2="29" /><line x1="17" y1="25" x2="16" y2="29" />{condition === "heavy_rain" && <line x1="23" y1="25" x2="22" y2="29" />}</svg>);
  if (condition === "thunderstorm") return (<svg {...p}>{cloud}<polyline points="17,22 14,27 18,27 15,31" /></svg>);
  if (condition === "snow") return (<svg {...p}>{cloud}<line x1="11" y1="26" x2="11" y2="26.1" /><line x1="17" y1="28" x2="17" y2="28.1" /><line x1="23" y1="26" x2="23" y2="26.1" /></svg>);
  if (condition === "fog") return (<svg {...p}>{cloud}<line x1="8" y1="26" x2="24" y2="26" /><line x1="11" y1="29" x2="21" y2="29" /></svg>);
  if (condition === "partly_cloudy") return (<svg {...p}><circle cx="11" cy="10" r="3.5" /><line x1="11" y1="3" x2="11" y2="4.5" /><line x1="4" y1="10" x2="5.5" y2="10" /><path d="M11 25a4.5 4.5 0 0 1-.4-9A6.5 6.5 0 0 1 23 14.5 5 5 0 0 1 23.5 25z" /></svg>);
  return <svg {...p}>{cloud}</svg>;
};

export const WarnPill: React.FC<{ level: "warn" | "bad"; text: string }> = ({ level, text }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${level === "bad" ? "border-rose-400/40 bg-rose-500/15 text-rose-200" : "border-amber-400/40 bg-amber-500/15 text-amber-200"}`}>{text}</span>
);

const dayName = (iso: string, i: number) => {
  if (i === 0) return "Today";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { weekday: "short" });
};
const deg = "\u00b0";

/** Weather tab of one campaign: every screen with its own weather. */
export const CampaignWeatherPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const [data, setData] = useState<CampaignWeather | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    setData(null); setErr("");
    weatherApi.campaign(campaignId).then((d) => { if (live) setData(d); }).catch((e: any) => { if (live) setErr(e?.message || "Weather could not be loaded."); });
    return () => { live = false; };
  }, [campaignId]);

  if (err) return <p className="py-10 text-center text-[12px] text-rose-300">{err}</p>;
  if (!data) return <p className="py-10 text-center text-[12px] text-zinc-500">Loading weather...</p>;
  if (!data.configured) return <p className="py-10 text-center text-[12px] text-zinc-500">The weather service is not connected yet.</p>;
  if (data.screens.length === 0) return <p className="py-10 text-center text-[12px] text-zinc-500">This campaign has no screens yet.</p>;
  const s = data.summary;
  const calm = s.affected === 0 && s.unavailable === 0 && s.missing === 0;
  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 text-[12px] ${s.affected > 0 ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>
        {s.affected > 0 ? `${s.affected} of ${s.total} screens have weather warnings.` : calm ? "Weather looks fine at all screens." : "No weather warnings at the screens we could check."}
        {s.missing > 0 && <span className="ml-2 opacity-80">{s.missing} screen(s) have no location. Add latitude and longitude in Inventory.</span>}
        {s.unavailable > 0 && <span className="ml-2 opacity-80">{s.unavailable} screen(s) could not be checked right now.</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.screens.map((sc) => (
          <div key={sc.id} className={`${FIN.panel} p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-zinc-100">{sc.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{[sc.location, sc.city].filter(Boolean).join(", ") || "No address"}</p>
              </div>
              {sc.weather && <span className="text-[#f1d68a]"><WeatherGlyph condition={sc.weather.condition} size={30} /></span>}
            </div>
            {!sc.has_location ? (
              <p className="mt-3 text-[11px] text-amber-300">Location missing. Add latitude and longitude for this screen.</p>
            ) : !sc.weather ? (
              <p className="mt-3 text-[11px] text-zinc-500">Weather not available right now.</p>
            ) : (
              <>
                <div className="mt-2 flex items-end gap-3">
                  <p className="text-[28px] font-semibold leading-none text-white">{sc.weather.temp}{deg}C</p>
                  <p className="pb-0.5 text-[11px] text-zinc-400">{sc.weather.label}{sc.weather.feels !== null ? `, feels ${sc.weather.feels}${deg}` : ""}</p>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {sc.weather.wind !== null ? `Wind ${sc.weather.wind} km/h` : ""}{sc.weather.humidity !== null ? `  |  Humidity ${sc.weather.humidity}%` : ""}{sc.weather.rain_today !== null ? `  |  Rain chance ${sc.weather.rain_today}%` : ""}
                </p>
                {sc.weather.warnings.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">{sc.weather.warnings.map((w) => <WarnPill key={w.text} level={w.level} text={w.text} />)}</div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[#2a2f37] pt-2">
                  {sc.weather.days.map((d, i) => (
                    <div key={d.date} className="text-center">
                      <p className="text-[10px] text-zinc-500">{dayName(d.date, i)}</p>
                      <p className="text-[11px] text-zinc-200">{d.max ?? "--"}{deg} / {d.min ?? "--"}{deg}</p>
                      <p className="text-[9px] text-zinc-500">{d.rain !== null ? `${d.rain}% rain` : d.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600">Forecast data for each screen's own position. Updated about every 30 minutes.</p>
    </div>
  );
};

/** Dashboard widget: gold card = now, silver card = next days, with area tabs and warnings of running campaigns. */
export const DashboardWeatherWidget: React.FC = () => {
  const [data, setData] = useState<CompanyWeather | null>(null);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    weatherApi.company().then((d) => { if (live) setData(d); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  if (failed) return null;
  const shell = "rounded-xl border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]";
  if (!data) return <div className={shell}><p className="text-[11px] text-zinc-500">Loading weather...</p></div>;
  if (!data.configured) return null;
  if (data.areas.length === 0) {
    return <div className={shell}><p className="text-[11px] text-zinc-400">Add a screen with its location (or your city in Company Profile) to see weather here.</p></div>;
  }
  const area = data.areas[Math.min(idx, data.areas.length - 1)];
  const w: WeatherView | null = area.weather;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div style={GOLD_CARD} className="rounded-xl border border-[#f6e2a1]/50 p-3 text-[#1a1204]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b4a0c]">Weather now</p>
            {data.areas.length > 1 && (
              <div className="flex flex-wrap justify-end gap-1">
                {data.areas.map((a, i) => (
                  <button key={a.name} type="button" onClick={() => setIdx(i)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i === idx ? "bg-[#1a1204] text-[#f1d68a]" : "bg-white/30 text-[#4a3408] hover:bg-white/50"}`}>{a.name}</button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 truncate text-[13px] font-semibold">{area.name}</p>
          {w ? (
            <div className="mt-1 flex items-center gap-3">
              <WeatherGlyph condition={w.condition} size={44} color="#1a1204" />
              <div>
                <p className="text-[32px] font-semibold leading-none">{w.temp}{deg}C</p>
                <p className="text-[11px] text-[#4a3408]">{w.label}{w.feels !== null ? `, feels ${w.feels}${deg}` : ""}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-[#4a3408]">Weather is not available right now.</p>
          )}
          {w && <p className="mt-1 text-[10px] text-[#4a3408]">{w.wind !== null ? `Wind ${w.wind} km/h` : ""}{w.humidity !== null ? `  |  Humidity ${w.humidity}%` : ""}</p>}
        </div>
        <div style={SILVER_CARD} className="rounded-xl border border-white/40 p-3 text-[#22262b]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3a3f46]">Next 3 days</p>
          {w ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {w.days.map((d, i) => (
                <div key={d.date} className="rounded-lg bg-white/35 p-2 text-center">
                  <p className="text-[10px] font-semibold text-[#3a3f46]">{dayName(d.date, i)}</p>
                  <div className="my-1 flex justify-center"><WeatherGlyph condition={condOf(d.label)} size={26} color="#22262b" /></div>
                  <p className="text-[12px] font-semibold">{d.max ?? "--"}{deg} / {d.min ?? "--"}{deg}</p>
                  <p className="text-[9px] text-[#3a3f46]">{d.rain !== null ? `${d.rain}% rain` : d.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-[#3a3f46]">No forecast available right now.</p>
          )}
        </div>
      </div>
      <WeatherAlertsList data={data} compact />
    </div>
  );
};

const condOf = (label: string): string => {
  const v = label.toLowerCase();
  if (v.includes("thunder")) return "thunderstorm";
  if (v.includes("heavy")) return "heavy_rain";
  if (v.includes("rain")) return "rain";
  if (v.includes("snow")) return "snow";
  if (v.includes("fog")) return "fog";
  if (v.includes("partly")) return "partly_cloudy";
  if (v.includes("cloud")) return "cloudy";
  if (v.includes("clear")) return "clear";
  return "cloudy";
};

/** Warnings for screens of campaigns running today. Shows nothing when all is calm (in compact mode). */
export const WeatherAlertsList: React.FC<{ data?: CompanyWeather | null; compact?: boolean }> = ({ data: given, compact }) => {
  const [own, setOwn] = useState<CompanyWeather | null>(null);
  useEffect(() => {
    if (given !== undefined) return;
    let live = true;
    weatherApi.company().then((d) => { if (live) setOwn(d); }).catch(() => undefined);
    return () => { live = false; };
  }, [given]);
  const data = given !== undefined ? given : own;
  if (!data || !data.configured) return null;
  if (data.alerts.length === 0) {
    return compact ? null : <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">Weather is fine at all screens of running campaigns.</p>;
  }
  const shown = data.alerts.slice(0, compact ? 3 : 30);
  return (
    <div className="space-y-1.5">
      {!compact && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Weather warnings</p>}
      {shown.map((a, i) => (
        <div key={`${a.campaign_id}-${a.screen}-${a.text}-${i}`} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[12px] ${a.level === "bad" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
          <span><b>{a.screen}</b>{a.city ? ` (${a.city})` : ""}: {a.text}</span>
          <Link to={`/campaigns/${a.campaign_id}?tab=weather`} className="text-[11px] underline opacity-90">{a.campaign}</Link>
        </div>
      ))}
      {compact && data.alerts.length > shown.length && <p className="text-[10px] text-zinc-500">+{data.alerts.length - shown.length} more warnings in Live Operations.</p>}
    </div>
  );
};
