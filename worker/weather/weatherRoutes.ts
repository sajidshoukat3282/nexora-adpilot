import type { Env } from '../index';
import { resolveSession } from '../auth/session';
import { WeatherApiProvider } from './WeatherApiProvider';

/**
 * Weather for screens, always from the screen's own coordinates (not one weather for a whole city).
 * - GET /api/weather/campaign/:id : every screen of a campaign, each with its own weather and warnings.
 * - GET /api/weather/company      : dashboard widget (up to 3 areas of the company) and warnings for screens of campaigns running today.
 * Results are kept for 30 minutes per spot of about 1 km, so the weather service is called as little as possible.
 */

const TTL_MS = 30 * 60 * 1000;
const MAX_SPOTS = 20;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const r = await env.DB.prepare(sql).bind(...binds).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
}

let ready = false;
async function ensureCache(env: Env): Promise<void> {
  if (ready) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS weather_cache (spot TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL)').run();
  ready = true;
}

const LABELS: Record<string, string> = {
  clear: 'Clear', partly_cloudy: 'Partly cloudy', cloudy: 'Cloudy', rain: 'Rain', heavy_rain: 'Heavy rain',
  thunderstorm: 'Thunderstorm', snow: 'Snow', fog: 'Fog', unknown: 'Unknown',
};

export interface WarnItem { kind: 'storm' | 'rain' | 'heat' | 'wind' | 'fog' | 'snow'; level: 'warn' | 'bad'; text: string }

export interface WeatherView {
  temp: number; feels: number | null; condition: string; label: string; humidity: number | null; wind: number | null;
  rain_today: number | null;
  days: { date: string; min: number | null; max: number | null; rain: number | null; label: string }[];
  warnings: WarnItem[];
  fetched_at: string;
}

const round = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);

export function warningsFor(snap: any): WarnItem[] {
  const out: WarnItem[] = [];
  const cur = snap.current;
  const today = snap.forecast?.[0];
  const cond = cur.condition as string;
  const prob = today?.rainProbabilityPercent ?? 0;
  if (cond === 'thunderstorm') out.push({ kind: 'storm', level: 'bad', text: 'Thunderstorm at this screen' });
  else if (cond === 'heavy_rain') out.push({ kind: 'rain', level: 'bad', text: 'Heavy rain at this screen' });
  else if (cur.isRaining) out.push({ kind: 'rain', level: 'warn', text: 'Raining at this screen' });
  else if (prob >= 60) out.push({ kind: 'rain', level: 'warn', text: `Rain likely today (${Math.round(prob)}%)` });
  const hot = Math.max(cur.temperatureC ?? 0, today?.maxTemperatureC ?? 0);
  if (hot >= 45) out.push({ kind: 'heat', level: 'bad', text: `Extreme heat (${Math.round(hot)}\u00b0C)` });
  else if (hot >= 42) out.push({ kind: 'heat', level: 'warn', text: `Very hot (${Math.round(hot)}\u00b0C)` });
  if (typeof cur.windKph === 'number') {
    if (cur.windKph >= 50) out.push({ kind: 'wind', level: 'bad', text: `Strong wind (${Math.round(cur.windKph)} km/h)` });
    else if (cur.windKph >= 40) out.push({ kind: 'wind', level: 'warn', text: `Windy (${Math.round(cur.windKph)} km/h)` });
  }
  if (cond === 'fog') out.push({ kind: 'fog', level: 'warn', text: 'Fog reduces visibility' });
  if (cond === 'snow') out.push({ kind: 'snow', level: 'warn', text: 'Snow at this screen' });
  return out;
}

function toView(snap: any): WeatherView {
  return {
    temp: Math.round(snap.current.temperatureC),
    feels: round(snap.current.feelsLikeC),
    condition: snap.current.condition,
    label: LABELS[snap.current.condition] || 'Unknown',
    humidity: round(snap.current.humidityPercent),
    wind: round(snap.current.windKph),
    rain_today: round(snap.forecast?.[0]?.rainProbabilityPercent),
    days: (snap.forecast ?? []).map((d: any) => ({
      date: d.date, min: round(d.minTemperatureC), max: round(d.maxTemperatureC), rain: round(d.rainProbabilityPercent), label: LABELS[d.condition] || 'Unknown',
    })),
    warnings: warningsFor(snap),
    fetched_at: snap.fetchedAt,
  };
}

const validCoord = (lat: any, lng: any) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** Why the weather service could not be reached last time (shown to the team to find setup problems). Never holds the key. */
let lastError = '';

const spotKey = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

/** Weather for one spot (about 1 km). Uses the 30 minute copy, or the old copy if the service is down. */
async function weatherAt(env: Env, lat: number, lng: number): Promise<WeatherView | null> {
  if (!env.WEATHER_API_KEY || !validCoord(lat, lng)) return null;
  const spot = spotKey(lat, lng);
  let old: { payload: string; fetched_at: number } | null = null;
  try {
    old = await env.DB.prepare('SELECT payload, fetched_at FROM weather_cache WHERE spot = ?').bind(spot).first<any>() ?? null;
    if (old && Date.now() - old.fetched_at < TTL_MS) return JSON.parse(old.payload) as WeatherView;
  } catch { /* no cache */ }
  try {
    const provider = new WeatherApiProvider({ apiKey: env.WEATHER_API_KEY });
    const snap = await provider.getWeather({ geographyId: spot, label: spot, coordinates: { lat: Number(spot.split(',')[0]), lng: Number(spot.split(',')[1]) } }, 3);
    const view = toView(snap);
    try { await env.DB.prepare('INSERT OR REPLACE INTO weather_cache (spot, payload, fetched_at) VALUES (?,?,?)').bind(spot, JSON.stringify(view), Date.now()).run(); } catch { /* ignore */ }
    return view;
  } catch (e: any) {
    lastError = String(e?.message || 'Unknown error').slice(0, 120);
    if (old) { try { return JSON.parse(old.payload) as WeatherView; } catch { /* fall through */ } }
    return null;
  }
}

/** Looks up several spots at once; each distinct spot is requested only once. */
async function weatherFor(env: Env, points: { lat: number; lng: number }[]): Promise<Map<string, WeatherView | null>> {
  const uniq = new Map<string, { lat: number; lng: number }>();
  for (const p of points) if (validCoord(p.lat, p.lng) && !uniq.has(spotKey(p.lat, p.lng))) uniq.set(spotKey(p.lat, p.lng), p);
  const list = [...uniq.entries()].slice(0, MAX_SPOTS);
  const res = await Promise.all(list.map(async ([k, p]) => [k, await weatherAt(env, p.lat, p.lng)] as const));
  return new Map(res);
}

const num = (v: any): number | null => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n; };

async function geocodeCity(env: Env, text: string): Promise<{ lat: number; lng: number } | null> {
  if (!env.GEOAPIFY_API_KEY || !text.trim()) return null;
  try {
    const r = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&limit=1&apiKey=${env.GEOAPIFY_API_KEY}`);
    const d: any = await r.json();
    const f = d?.features?.[0];
    const lat = num(f?.properties?.lat ?? f?.geometry?.coordinates?.[1]);
    const lng = num(f?.properties?.lon ?? f?.geometry?.coordinates?.[0]);
    return lat !== null && lng !== null && validCoord(lat, lng) ? { lat, lng } : null;
  } catch { return null; }
}

export async function handleWeatherRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/weather/')) return null;
  if (request.method !== 'GET') return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    if (s.accountType === 'client') return fail(403, 'Weather is available to the company team only.', 'FORBIDDEN');
    const configured = Boolean(env.WEATHER_API_KEY);
    await ensureCache(env);

    const cm = path.match(/^\/api\/weather\/campaign\/([0-9a-zA-Z_-]{1,64})$/);
    if (cm) {
      const c = await env.DB.prepare('SELECT id FROM campaigns WHERE id = ? AND company_id = ?').bind(cm[1], s.companyId).first();
      if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
      const screens = await rows(env, `SELECT i.id, i.name, i.city, i.location, i.latitude, i.longitude
        FROM campaign_screens cs JOIN inventory i ON i.id = cs.inventory_id WHERE cs.campaign_id = ? AND i.company_id = ? ORDER BY i.city, i.name`, cm[1], s.companyId);
      const pts = screens.map((r: any) => ({ lat: num(r.latitude) as number, lng: num(r.longitude) as number }));
      const map = configured ? await weatherFor(env, pts) : new Map();
      let affected = 0, unavailable = 0, missing = 0;
      const out = screens.map((r: any) => {
        const lat = num(r.latitude), lng = num(r.longitude);
        const hasLoc = lat !== null && lng !== null && validCoord(lat, lng);
        const w = hasLoc ? map.get(spotKey(lat as number, lng as number)) ?? null : null;
        if (!hasLoc) missing++; else if (!w) unavailable++; else if (w.warnings.length) affected++;
        return { id: r.id, name: r.name, city: r.city || '', location: r.location || '', has_location: hasLoc, weather: w };
      });
      return json({ ok: true, configured, weather_error: unavailable > 0 ? lastError : '', summary: { total: out.length, affected, unavailable, missing }, screens: out });
    }

    if (path === '/api/weather/company') {
      const today = new Date().toISOString().slice(0, 10);
      // Areas: the cities where the company has the most screens (average position of that city's screens).
      const inv = await rows(env, `SELECT city, latitude, longitude FROM inventory WHERE company_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL`, s.companyId);
      const byCity = new Map<string, { n: number; lat: number; lng: number }>();
      for (const r of inv) {
        const lat = num(r.latitude), lng = num(r.longitude);
        if (lat === null || lng === null || !validCoord(lat, lng)) continue;
        const name = String(r.city || '').trim() || 'Screens';
        const e = byCity.get(name) ?? { n: 0, lat: 0, lng: 0 };
        e.n++; e.lat += lat; e.lng += lng; byCity.set(name, e);
      }
      let areas = [...byCity.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3).map(([name, e]) => ({ name, screens: e.n, lat: e.lat / e.n, lng: e.lng / e.n }));
      let source = 'screens';
      if (areas.length === 0) {
        const p = await env.DB.prepare('SELECT city, country FROM company_profiles WHERE company_id = ? LIMIT 1').bind(s.companyId).first<any>().catch(() => null);
        const city = String(p?.city || '').trim();
        if (city) {
          const g = await geocodeCity(env, [city, String(p?.country || '').trim()].filter(Boolean).join(', '));
          if (g) { areas = [{ name: city, screens: 0, lat: g.lat, lng: g.lng }]; source = 'profile'; }
        }
      }
      // Warnings for screens of campaigns that are running today.
      const live = await rows(env, `SELECT c.id AS campaign_id, c.name AS campaign, i.id AS screen_id, i.name AS screen, i.city, i.latitude, i.longitude
        FROM campaigns c JOIN campaign_screens cs ON cs.campaign_id = c.id JOIN inventory i ON i.id = cs.inventory_id
        WHERE c.company_id = ? AND i.company_id = ? AND c.status IN ('booked','live') AND c.start_date <= ? AND c.end_date >= ?`, s.companyId, s.companyId, today, today);
      const areaPts = areas.map((a) => ({ lat: a.lat, lng: a.lng }));
      const livePts = live.map((r: any) => ({ lat: num(r.latitude) as number, lng: num(r.longitude) as number }));
      const map = configured ? await weatherFor(env, [...areaPts, ...livePts]) : new Map();
      const outAreas = areas.map((a) => ({ name: a.name, screens: a.screens, weather: map.get(spotKey(a.lat, a.lng)) ?? null }));
      const alerts: any[] = [];
      for (const r of live as any[]) {
        const lat = num(r.latitude), lng = num(r.longitude);
        if (lat === null || lng === null) continue;
        const w = map.get(spotKey(lat, lng));
        if (!w) continue;
        for (const x of w.warnings) alerts.push({ campaign_id: r.campaign_id, campaign: r.campaign, screen: r.screen, city: r.city || '', kind: x.kind, level: x.level, text: x.text });
      }
      alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
      return json({ ok: true, configured, weather_error: outAreas.some((a) => !a.weather) ? lastError : '', source, areas: outAreas, alerts: alerts.slice(0, 30), live_screens: live.length });
    }
    return fail(404, 'Not found.', 'NOT_FOUND');
  } catch {
    return fail(500, 'Unable to load weather. Please try again.', 'WEATHER_FAILED');
  }
}
