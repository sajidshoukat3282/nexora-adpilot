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

/** Live Operations: one chip per area where campaigns run today, or a clear reason when weather cannot be shown. */
export const WeatherStrip: React.FC = () => {
  const [data, setData] = useState<CompanyWeather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    weatherApi.company().then((d) => { if (live) setData(d); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  const note = (text: string) => <p className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">{text}</p>;
  if (failed) return note("Weather could not be loaded right now.");
  if (!data) return null;
  if (!data.configured) return note("Weather is not set up yet. The weather key is missing or not accepted.");
  const withWeather = data.areas.filter((a) => a.weather);
  if (withWeather.length === 0) {
    if (data.weather_error) return note(`Weather is not available right now: ${data.weather_error}`);
    return note(data.live_screens === 0
      ? "No campaign is running on a screen today, so there is no weather to show."
      : "Weather needs a city or map location on the screens. Add it in Inventory.");
  }
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {withWeather.map((a) => {
        const w = a.weather as WeatherView;
        const bad = w.warnings.some((x) => x.level === "bad");
        return (
          <div key={a.name} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${bad ? "border-rose-400/40 bg-rose-500/10" : w.warnings.length ? "border-amber-400/40 bg-amber-500/10" : "border-[#2a2f37] bg-[#0f1216]"}`}>
            <span className="text-[#f1d68a]"><WeatherGlyph condition={w.condition} size={26} /></span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-zinc-100">{a.name} <span className="font-normal text-zinc-500">{"\u00b7"} {a.screens} screen{a.screens === 1 ? "" : "s"}</span></p>
              <p className="text-[11px] text-zinc-400">{Math.round(w.temp)}{deg}C, {w.label}{w.warnings.length ? `, ${w.warnings.length} warning${w.warnings.length === 1 ? "" : "s"}` : ""}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
              <p className="mt-3 text-[11px] text-zinc-500">Weather not available right now.{data.weather_error ? ` (${data.weather_error})` : ""}</p>
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

/** Round weather dial for the dashboard header: silver rim, gold face, the hand shows the temperature (0 to 60 C round the face like a clock). */
export const DashboardWeatherDial: React.FC = () => {
  const [data, setData] = useState<CompanyWeather | null>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    let live = true;
    weatherApi.company().then((d) => { if (live) setData(d); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (!data || !data.configured) return null;
  const many = data.areas.length > 1;
  const area = data.areas.length ? data.areas[Math.min(idx, data.areas.length - 1)] : null;
  const w: WeatherView | null = area ? area.weather : null;
  const angle = w ? (Math.max(0, Math.min(59.9, w.temp)) / 60) * 360 : 0;
  const alerts = data.alerts.length;
  const worst = data.alerts.some((x) => x.level === "bad") ? "bad" : "warn";
  const next = () => { if (many) setIdx((i) => (i + 1) % data.areas.length); };
  const tip = w ? `${area?.name}: ${w.temp}${deg}C, ${w.label}${many ? ". Click to change area." : ""}` : "Weather is not available right now";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        {!area ? (
          <p className="max-w-[170px] text-[11px] leading-snug text-zinc-400">Add a screen with its location (or your city in Company Profile) to see weather here.</p>
        ) : w ? (
          <>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{area.name}</p>
            <p className="text-[24px] font-semibold leading-tight text-[#f1d68a]">{w.temp}{deg}C</p>
            <p className="text-[11px] text-zinc-300">{w.label}{w.feels !== null ? `, feels ${w.feels}${deg}` : ""}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {w.days.slice(0, 3).map((d, i) => `${dayName(d.date, i)} ${d.max ?? "--"}/${d.min ?? "--"}`).join("  \u00b7  ")}
            </p>
          </>
        ) : (
          <p className="max-w-[170px] text-[11px] leading-snug text-zinc-400">Weather is not available right now.{data.weather_error ? ` (${data.weather_error})` : ""}</p>
        )}
      </div>
      <button type="button" onClick={next} title={tip} aria-label={tip} className={`relative shrink-0 rounded-full ${many ? "cursor-pointer" : "cursor-default"}`}>
        <svg width="112" height="112" viewBox="0 0 120 120" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="wd-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f1d68a" /><stop offset="0.3" stopColor="#c99b3b" /><stop offset="0.55" stopColor="#ecd07c" /><stop offset="0.8" stopColor="#a97b22" /><stop offset="1" stopColor="#d8b257" />
            </linearGradient>
            <linearGradient id="wd-silver" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eceff2" /><stop offset="0.4" stopColor="#a8aeb6" /><stop offset="0.6" stopColor="#d9dde2" /><stop offset="1" stopColor="#8b929b" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="58" fill="url(#wd-silver)" />
          <circle cx="60" cy="60" r="52" fill="#1a1204" opacity="0.35" />
          <circle cx="60" cy="60" r="50" fill="url(#wd-gold)" />
          {Array.from({ length: 60 }, (_, i) => (
            <line key={i} x1="60" y1="13" x2="60" y2={i % 5 === 0 ? 20 : 16} stroke="#3a2a07" strokeWidth={i % 5 === 0 ? 2 : 1} strokeLinecap="round" opacity={i % 5 === 0 ? 1 : 0.6} transform={`rotate(${i * 6} 60 60)`} />
          ))}
          <g fontSize="9" fontWeight="700" fill="#3a2a07" textAnchor="middle" fontFamily="system-ui, sans-serif">
            <text x="60" y="32">0</text>
            <text x="91" y="63">15</text>
            <text x="60" y="94">30</text>
            <text x="29" y="63">45</text>
          </g>
          {w && <g transform="translate(49 36)"><WeatherGlyph condition={w.condition} size={22} color="#1a1204" /></g>}
          {w && (
            <g transform={`rotate(${angle} 60 60)`}>
              <line x1="60" y1="68" x2="60" y2="24" stroke="#1a1204" strokeWidth="3" strokeLinecap="round" />
              <polygon points="60,18 56,28 64,28" fill="#1a1204" />
            </g>
          )}
          <circle cx="60" cy="60" r="6" fill="url(#wd-silver)" stroke="#1a1204" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="1.8" fill="#1a1204" />
        </svg>
        {alerts > 0 && (
          <span className={`absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${worst === "bad" ? "bg-rose-600" : "bg-amber-600"}`} title={`${alerts} weather warning${alerts === 1 ? "" : "s"} for running campaigns`}>{alerts}</span>
        )}
      </button>
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
  if (!data) return null;
  if (!data.configured) return compact ? null : <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">Weather is not set up yet, so warnings cannot be shown.</p>;
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
