import type { Env } from '../index';
import { logAudit } from '../admin/adminRoutes';
import { notify } from '../notifications/notificationRoutes';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Live Operations (real data).
 * - Today board: which campaign runs on which screen today, from real bookings.
 * - Screen status: manual (online / maintenance / offline) or automatic through an optional player heartbeat link.
 * - Incidents, maintenance schedule, derived alerts, upcoming starts and ends.
 * - Proof of Play reuses the existing `campaign_proofs` table (added from the Proof tab or the campaign page).
 * Every staff query is scoped by `session.companyId`. The player heartbeat is the only public route and works with a secret key.
 */

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const dayNum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const uuid = () => crypto.randomUUID();
const HEARTBEAT_MINUTES = 10;

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS screen_ops (
    inventory_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, ops_status TEXT, reason TEXT, status_since TEXT,
    updated_by TEXT, updated_at TEXT, player_key TEXT, last_heartbeat TEXT, player_info TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ops_incidents (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, inventory_id TEXT, campaign_id TEXT, title TEXT NOT NULL, detail TEXT,
    severity TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', owner TEXT, resolution TEXT,
    created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_at TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ops_maintenance (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, inventory_id TEXT NOT NULL, planned_date TEXT NOT NULL, title TEXT NOT NULL,
    notes TEXT, done INTEGER NOT NULL DEFAULT 0, done_at TEXT, created_by TEXT, created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_proofs (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT NOT NULL, inventory_id TEXT,
    proof_date TEXT NOT NULL, photo_url TEXT, notes TEXT, actor_email TEXT, created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS field_assignments (
    company_id TEXT NOT NULL, account_id TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (company_id, account_id, kind, value))`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS field_settings (company_id TEXT PRIMARY KEY, remind_hour INTEGER)`).run();
  for (const col of ['lat REAL', 'lng REAL', 'accuracy REAL', 'taken_at TEXT', 'geo_ok INTEGER', 'distance_m INTEGER']) {
    try { await db.prepare(`ALTER TABLE campaign_proofs ADD COLUMN ${col}`).run(); } catch { /* already there */ }
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_creatives (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT NOT NULL,
    name TEXT NOT NULL, url TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  ready = true;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const r = await env.DB.prepare(sql).bind(...binds).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
}
async function one<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T | null> {
  try { return (await env.DB.prepare(sql).bind(...binds).first<T>()) ?? null; } catch { return null; }
}

async function guard(request: Request, env: Env, write: boolean, field = false): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client') return fail(403, 'Live Operations is for staff only.', 'FORBIDDEN');
  const has = (...p: string[]) => p.some((x) => s.permissions.includes(x));
  if (field) {
    if (!has('proof.submit', 'campaigns.manage', 'operations.manage')) return fail(403, 'You do not have permission to send proof.', 'FORBIDDEN');
    return s;
  }
  if (write && !has('campaigns.manage', 'inventory.manage', 'operations.manage')) {
    return fail(403, 'You do not have permission to change operations.', 'FORBIDDEN');
  }
  return s;
}
const emailOf = async (env: Env, accountId: string): Promise<string | null> =>
  (await one<{ email: string }>(env, 'SELECT email FROM accounts WHERE id = ? LIMIT 1', accountId))?.email ?? null;
const text = (v: unknown, max: number): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t.slice(0, max) : null;
};
const isoDate = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/* ---------------- overview ---------------- */

type Eff = 'online' | 'maintenance' | 'offline';

async function overview(env: Env, companyId: string): Promise<Response> {
  const today = todayIso();
  const tNum = dayNum(today);
  const screens = await rows(env, `SELECT id, name, city, location, screen_type, status FROM inventory WHERE company_id = ? ORDER BY name`, companyId);
  const ops = await rows(env, `SELECT inventory_id, ops_status, reason, status_since, player_key, last_heartbeat FROM screen_ops WHERE company_id = ?`, companyId);
  const opsBy = new Map(ops.map((o: any) => [o.inventory_id, o]));
  const assign = await rows(env,
    `SELECT cs.inventory_id, COALESCE(cs.slots,1) AS slots, c.id AS campaign_id, c.name AS campaign_name, c.status AS campaign_status, c.start_date, c.end_date, cl.name AS client_name
       FROM campaign_screens cs JOIN campaigns c ON c.id = cs.campaign_id LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.company_id = ? AND c.status IN ('booked','live') AND c.start_date <= ? AND c.end_date >= ?`, companyId, today, today);
  const incidents = await rows(env, `SELECT id, inventory_id, campaign_id, severity FROM ops_incidents WHERE company_id = ? AND status != 'resolved'`, companyId);
  const approved = await rows(env, `SELECT campaign_id, COUNT(*) AS n FROM campaign_creatives WHERE company_id = ? AND status = 'approved' GROUP BY campaign_id`, companyId);
  const approvedSet = new Set(approved.filter((a: any) => Number(a.n) > 0).map((a: any) => a.campaign_id));
  const lastProof = await rows(env, `SELECT campaign_id, MAX(proof_date) AS d FROM campaign_proofs WHERE company_id = ? GROUP BY campaign_id`, companyId);
  const proofBy = new Map(lastProof.map((p: any) => [p.campaign_id, p.d]));

  const assignBy = new Map<string, any[]>();
  for (const a of assign) { const l = assignBy.get(a.inventory_id) ?? []; l.push(a); assignBy.set(a.inventory_id, l); }
  const incBy = new Map<string, number>();
  for (const i of incidents) if (i.inventory_id) incBy.set(i.inventory_id, (incBy.get(i.inventory_id) ?? 0) + 1);

  const nowMs = Date.now();
  const out = screens.map((s: any) => {
    const o: any = opsBy.get(s.id);
    let status: Eff = (['online', 'maintenance', 'offline'].includes(o?.ops_status) ? o.ops_status : ['online', 'maintenance', 'offline'].includes(s.status) ? s.status : 'online') as Eff;
    let source: 'manual' | 'player' = 'manual';
    if (o?.player_key && status !== 'maintenance') {
      source = 'player';
      const hb = o.last_heartbeat ? new Date(o.last_heartbeat).getTime() : 0;
      status = hb && nowMs - hb <= HEARTBEAT_MINUTES * 60000 ? 'online' : 'offline';
    }
    const list = assignBy.get(s.id) ?? [];
    return {
      id: s.id, name: s.name, city: s.city, location: s.location, screen_type: s.screen_type,
      status, source, reason: o?.reason ?? null, since: o?.status_since ?? null,
      has_player: !!o?.player_key, last_heartbeat: o?.last_heartbeat ?? null,
      running: list.map((a) => ({ campaign_id: a.campaign_id, campaign_name: a.campaign_name, client_name: a.client_name, status: a.campaign_status, end_date: a.end_date, slots: a.slots })),
      open_incidents: incBy.get(s.id) ?? 0,
    };
  });

  const alerts: any[] = [];
  for (const s of out as any[]) {
    if (s.running.length && s.status === 'offline') alerts.push({ key: `off-${s.id}`, severity: 'critical', title: `${s.name} is offline`, detail: `${s.running.map((r: any) => r.campaign_name).join(', ')} should be running today.`, screen_id: s.id });
    else if (s.running.length && s.status === 'maintenance') alerts.push({ key: `mnt-${s.id}`, severity: 'warning', title: `${s.name} is under maintenance`, detail: `${s.running.map((r: any) => r.campaign_name).join(', ')} is booked on this screen today.`, screen_id: s.id });
  }
  const seenCamp = new Set<string>();
  for (const a of assign) {
    if (seenCamp.has(a.campaign_id)) continue;
    seenCamp.add(a.campaign_id);
    if (!approvedSet.has(a.campaign_id)) alerts.push({ key: `cr-${a.campaign_id}`, severity: 'warning', title: `${a.campaign_name}: no approved creative`, detail: 'The campaign is running today without an approved creative.', campaign_id: a.campaign_id });
    const left = a.end_date ? dayNum(a.end_date) - tNum : 99;
    if (left >= 0 && left <= 3) alerts.push({ key: `end-${a.campaign_id}`, severity: 'info', title: `${a.campaign_name} ends in ${left} day${left === 1 ? '' : 's'}`, detail: 'Plan the renewal or the next booking for these screens.', campaign_id: a.campaign_id });
    if (a.campaign_status === 'live') {
      const d = proofBy.get(a.campaign_id) as string | undefined;
      const age = d ? tNum - dayNum(d) : 999;
      if (age > 7) alerts.push({ key: `pf-${a.campaign_id}`, severity: 'info', title: `${a.campaign_name}: no recent proof`, detail: d ? `Last proof was ${age} days ago.` : 'No proof of play has been added yet.', campaign_id: a.campaign_id });
    }
  }
  for (const i of incidents) if (i.severity === 'high') alerts.push({ key: `inc-${i.id}`, severity: 'critical', title: 'High priority incident is open', detail: 'Open the Incidents tab to follow it up.', incident_id: i.id });

  const upcoming = await rows(env,
    `SELECT c.id, c.name, c.status, c.start_date, c.end_date, cl.name AS client_name,
            (SELECT COUNT(*) FROM campaign_screens x WHERE x.campaign_id = c.id) AS screens
       FROM campaigns c LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.company_id = ? AND c.status IN ('booked','live')
        AND ((c.start_date > ? AND c.start_date <= date(?, '+7 day')) OR (c.end_date >= ? AND c.end_date <= date(?, '+7 day')))
      ORDER BY c.start_date`, companyId, today, today, today, today);
  const upcomingOut = upcoming.map((u: any) => ({
    id: u.id, name: u.name, client_name: u.client_name, status: u.status, screens: u.screens,
    kind: u.start_date > today ? 'starts' : 'ends', date: u.start_date > today ? u.start_date : u.end_date,
    creative_ready: approvedSet.has(u.id),
  }));

  const counts = { total: out.length, online: 0, maintenance: 0, offline: 0 };
  for (const s of out as any[]) counts[s.status as Eff]++;
  const runningCampaigns = new Set(assign.map((a: any) => a.campaign_id)).size;
  const playing = (out as any[]).filter((s) => s.running.length && s.status === 'online').length;

  await maybeRemind(env, companyId);
  return json({
    ok: true, today, heartbeat_minutes: HEARTBEAT_MINUTES, counts,
    kpis: { running_campaigns: runningCampaigns, playing_screens: playing, open_incidents: incidents.length, alerts: alerts.length },
    screens: out, alerts, upcoming: upcomingOut,
  });
}

/* ---------------- screen status & player ---------------- */

async function setStatus(request: Request, env: Env, s: SessionContext, invId: string): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const status = String(b.status ?? '');
  if (!['online', 'maintenance', 'offline'].includes(status)) return fail(400, 'Choose Online, Maintenance or Offline.');
  const inv = await one<{ name: string }>(env, 'SELECT name FROM inventory WHERE id = ? AND company_id = ?', invId, s.companyId);
  if (!inv) return fail(404, 'Screen not found.', 'NOT_FOUND');
  const reason = text(b.reason, 200);
  if (status !== 'online' && !reason) return fail(400, 'Please add a reason for Maintenance or Offline.');
  const by = await emailOf(env, s.accountId);
  await env.DB.prepare(`INSERT INTO screen_ops (inventory_id, company_id, ops_status, reason, status_since, updated_by, updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(inventory_id) DO UPDATE SET ops_status = excluded.ops_status, reason = excluded.reason,
    status_since = excluded.status_since, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(invId, s.companyId, status, status === 'online' ? null : reason, nowIso(), by, nowIso()).run();
  await logAudit(env, s.companyId, s.accountId, 'Screen status changed', `${inv.name}: ${status}${reason ? ` (${reason})` : ''}`);
  return json({ ok: true, message: 'Screen status updated.' });
}

async function playerKey(request: Request, env: Env, s: SessionContext, invId: string): Promise<Response> {
  const inv = await one<{ name: string }>(env, 'SELECT name FROM inventory WHERE id = ? AND company_id = ?', invId, s.companyId);
  if (!inv) return fail(404, 'Screen not found.', 'NOT_FOUND');
  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE screen_ops SET player_key = NULL, last_heartbeat = NULL WHERE inventory_id = ? AND company_id = ?').bind(invId, s.companyId).run();
    await logAudit(env, s.companyId, s.accountId, 'Player link removed', inv.name);
    return json({ ok: true, message: 'Player link removed. Status is manual again.' });
  }
  const key = (uuid() + uuid()).replace(/-/g, '');
  await env.DB.prepare(`INSERT INTO screen_ops (inventory_id, company_id, player_key) VALUES (?,?,?)
    ON CONFLICT(inventory_id) DO UPDATE SET player_key = excluded.player_key, last_heartbeat = NULL`).bind(invId, s.companyId, key).run();
  await logAudit(env, s.companyId, s.accountId, 'Player link created', inv.name);
  const origin = new URL(request.url).origin;
  return json({ ok: true, key, url: `${origin}/api/player/ping?key=${key}`, player_url: `${origin}/#/player?key=${key}` });
}

async function ping(request: Request, env: Env, url: URL): Promise<Response> {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET' && request.method !== 'POST') return json({ ok: false }, 405, cors);
  await ensure(env.DB);
  const key = (url.searchParams.get('key') || '').trim();
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ ok: false, error: 'INVALID_KEY' }, 401, cors);
  const o = await one<{ inventory_id: string; company_id: string }>(env, 'SELECT inventory_id, company_id FROM screen_ops WHERE player_key = ? LIMIT 1', key);
  if (!o) return json({ ok: false, error: 'INVALID_KEY' }, 401, cors);
  let info: string | null = null;
  if (request.method === 'POST') {
    const b: any = await request.json().catch(() => ({}));
    info = JSON.stringify({ version: text(b.version, 40), storage: Number.isFinite(Number(b.storage)) ? Number(b.storage) : null, temperature: Number.isFinite(Number(b.temperature)) ? Number(b.temperature) : null }).slice(0, 400);
  }
  await env.DB.prepare('UPDATE screen_ops SET last_heartbeat = ?, player_info = COALESCE(?, player_info) WHERE inventory_id = ?').bind(nowIso(), info, o.inventory_id).run();
  return json({ ok: true, time: nowIso() }, 200, cors);
}

/* ---------------- screen detail ---------------- */

async function screenDetail(env: Env, s: SessionContext, invId: string): Promise<Response> {
  const inv = await one<any>(env, 'SELECT id, name, city, location, screen_type, status FROM inventory WHERE id = ? AND company_id = ?', invId, s.companyId);
  if (!inv) return fail(404, 'Screen not found.', 'NOT_FOUND');
  const o = await one<any>(env, 'SELECT ops_status, reason, status_since, updated_by, player_key, last_heartbeat, player_info FROM screen_ops WHERE inventory_id = ?', invId);
  const camps = await rows(env,
    `SELECT c.id, c.name, c.status, c.start_date, c.end_date, cl.name AS client_name FROM campaign_screens cs JOIN campaigns c ON c.id = cs.campaign_id
       LEFT JOIN clients cl ON cl.id = c.client_id WHERE cs.inventory_id = ? AND c.company_id = ? AND c.status IN ('booked','live') AND c.end_date >= ? ORDER BY c.start_date`, invId, s.companyId, todayIso());
  const incidents = await rows(env, 'SELECT * FROM ops_incidents WHERE company_id = ? AND inventory_id = ? ORDER BY created_at DESC LIMIT 20', s.companyId, invId);
  const maint = await rows(env, 'SELECT * FROM ops_maintenance WHERE company_id = ? AND inventory_id = ? ORDER BY planned_date DESC LIMIT 20', s.companyId, invId);
  const proofs = await rows(env, `SELECT p.id, p.proof_date, p.photo_url, p.notes, c.name AS campaign_name FROM campaign_proofs p LEFT JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.company_id = ? AND p.inventory_id = ? ORDER BY p.proof_date DESC LIMIT 12`, s.companyId, invId);
  let info: any = null;
  try { info = o?.player_info ? JSON.parse(o.player_info) : null; } catch { info = null; }
  return json({
    ok: true, screen: inv,
    ops: o ? { ops_status: o.ops_status, reason: o.reason, status_since: o.status_since, updated_by: o.updated_by, has_player: !!o.player_key, last_heartbeat: o.last_heartbeat, info } : null,
    campaigns: camps, incidents, maintenance: maint, proofs,
  });
}

/* ---------------- incidents ---------------- */

async function listIncidents(env: Env, s: SessionContext, url: URL): Promise<Response> {
  const st = url.searchParams.get('status') || '';
  const where = st && ['open', 'in_progress', 'resolved'].includes(st) ? ' AND i.status = ?' : '';
  const binds: unknown[] = [s.companyId]; if (where) binds.push(st);
  const list = await rows(env,
    `SELECT i.*, v.name AS screen_name, c.name AS campaign_name FROM ops_incidents i LEFT JOIN inventory v ON v.id = i.inventory_id LEFT JOIN campaigns c ON c.id = i.campaign_id
      WHERE i.company_id = ?${where} ORDER BY CASE i.status WHEN 'resolved' THEN 1 ELSE 0 END, CASE i.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, i.created_at DESC LIMIT 300`, ...binds);
  return json({ ok: true, incidents: list });
}

async function createIncident(request: Request, env: Env, s: SessionContext): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const title = text(b.title, 140);
  if (!title) return fail(400, 'Please enter a short title.');
  const severity = ['low', 'medium', 'high'].includes(b.severity) ? b.severity : 'medium';
  let inv: string | null = null, camp: string | null = null;
  if (b.inventory_id) { const r = await one(env, 'SELECT id FROM inventory WHERE id = ? AND company_id = ?', String(b.inventory_id), s.companyId); if (!r) return fail(404, 'Screen not found.', 'NOT_FOUND'); inv = String(b.inventory_id); }
  if (b.campaign_id) { const r = await one(env, 'SELECT id FROM campaigns WHERE id = ? AND company_id = ?', String(b.campaign_id), s.companyId); if (!r) return fail(404, 'Campaign not found.', 'NOT_FOUND'); camp = String(b.campaign_id); }
  const id = uuid(); const by = await emailOf(env, s.accountId);
  await env.DB.prepare(`INSERT INTO ops_incidents (id, company_id, inventory_id, campaign_id, title, detail, severity, status, owner, created_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,'open',?,?,?,?)`).bind(id, s.companyId, inv, camp, title, text(b.detail, 600), severity, text(b.owner, 80), by, nowIso(), nowIso()).run();
  await logAudit(env, s.companyId, s.accountId, 'Incident reported', title);
  if (severity === 'high') await notify(env, s.companyId, { key: `ops-inc-${id}`, severity: 'critical', category: 'system', title: 'High priority incident', detail: title, link: '/operations?tab=incidents' });
  return json({ ok: true, id, message: 'Incident reported.' });
}

async function updateIncident(request: Request, env: Env, s: SessionContext, id: string): Promise<Response> {
  const cur = await one<any>(env, 'SELECT * FROM ops_incidents WHERE id = ? AND company_id = ?', id, s.companyId);
  if (!cur) return fail(404, 'Incident not found.', 'NOT_FOUND');
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM ops_incidents WHERE id = ? AND company_id = ?').bind(id, s.companyId).run();
    return json({ ok: true, message: 'Incident deleted.' });
  }
  const b: any = await request.json().catch(() => ({}));
  const status = ['open', 'in_progress', 'resolved'].includes(b.status) ? b.status : cur.status;
  const resolution = b.resolution !== undefined ? text(b.resolution, 600) : cur.resolution;
  if (status === 'resolved' && !resolution) return fail(400, 'Please write how it was resolved.');
  const owner = b.owner !== undefined ? text(b.owner, 80) : cur.owner;
  const sev = ['low', 'medium', 'high'].includes(b.severity) ? b.severity : cur.severity;
  await env.DB.prepare('UPDATE ops_incidents SET status=?, resolution=?, owner=?, severity=?, updated_at=?, resolved_at=? WHERE id=? AND company_id=?')
    .bind(status, resolution, owner, sev, nowIso(), status === 'resolved' ? nowIso() : null, id, s.companyId).run();
  if (status !== cur.status) await logAudit(env, s.companyId, s.accountId, 'Incident updated', `${cur.title}: ${status}`);
  return json({ ok: true, message: 'Incident updated.' });
}

/* ---------------- maintenance ---------------- */

async function listMaintenance(env: Env, s: SessionContext): Promise<Response> {
  const list = await rows(env,
    `SELECT m.*, v.name AS screen_name, v.city FROM ops_maintenance m LEFT JOIN inventory v ON v.id = m.inventory_id WHERE m.company_id = ?
      ORDER BY m.done, m.planned_date LIMIT 300`, s.companyId);
  return json({ ok: true, items: list, today: todayIso() });
}
async function createMaintenance(request: Request, env: Env, s: SessionContext): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const title = text(b.title, 140); const date = isoDate(b.planned_date);
  if (!title || !date) return fail(400, 'Please enter a title and a date.');
  const inv = await one(env, 'SELECT id FROM inventory WHERE id = ? AND company_id = ?', String(b.inventory_id ?? ''), s.companyId);
  if (!inv) return fail(404, 'Choose a screen.', 'NOT_FOUND');
  await env.DB.prepare('INSERT INTO ops_maintenance (id, company_id, inventory_id, planned_date, title, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(uuid(), s.companyId, String(b.inventory_id), date, title, text(b.notes, 400), await emailOf(env, s.accountId), nowIso()).run();
  return json({ ok: true, message: 'Maintenance scheduled.' });
}
async function maintenanceItem(request: Request, env: Env, s: SessionContext, id: string): Promise<Response> {
  const cur = await one(env, 'SELECT id FROM ops_maintenance WHERE id = ? AND company_id = ?', id, s.companyId);
  if (!cur) return fail(404, 'Not found.', 'NOT_FOUND');
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM ops_maintenance WHERE id = ? AND company_id = ?').bind(id, s.companyId).run(); return json({ ok: true, message: 'Removed.' }); }
  const b: any = await request.json().catch(() => ({}));
  const done = b.done ? 1 : 0;
  await env.DB.prepare('UPDATE ops_maintenance SET done = ?, done_at = ? WHERE id = ? AND company_id = ?').bind(done, done ? nowIso() : null, id, s.companyId).run();
  return json({ ok: true, message: done ? 'Marked as done.' : 'Marked as pending.' });
}

/* ---------------- proofs (all campaigns) ---------------- */

async function listProofs(env: Env, s: SessionContext, url: URL): Promise<Response> {
  const camp = url.searchParams.get('campaign') || '';
  const where = camp ? ' AND p.campaign_id = ?' : '';
  const binds: unknown[] = [s.companyId]; if (camp) binds.push(camp);
  const list = await rows(env,
    `SELECT p.id, p.campaign_id, p.inventory_id, p.proof_date, p.photo_url, p.notes, p.actor_email, p.geo_ok, p.distance_m, p.taken_at, c.name AS campaign_name, v.name AS screen_name, v.city
       FROM campaign_proofs p LEFT JOIN campaigns c ON c.id = p.campaign_id LEFT JOIN inventory v ON v.id = p.inventory_id
      WHERE p.company_id = ?${where} ORDER BY p.proof_date DESC, p.created_at DESC LIMIT 200`, ...binds);
  const campaigns = await rows(env, `SELECT id, name, status FROM campaigns WHERE company_id = ? AND status IN ('booked','live') ORDER BY name`, s.companyId);
  return json({ ok: true, proofs: list, campaigns });
}

/* ---------------- field proof (phone page) ---------------- */

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const GEO_RADIUS_M = 500;

const PKT_OFFSET_HOURS = 5;
const REMIND_DEFAULT = 17;

async function fieldItems(env: Env, companyId: string): Promise<any[]> {
  const today = todayIso();
  return rows(env,
    `SELECT c.id AS campaign_id, c.name AS campaign_name, c.client_id, cl.name AS client_name, i.id AS screen_id, i.name AS screen_name, i.city, i.location,
            (SELECT COUNT(*) FROM campaign_proofs p WHERE p.campaign_id = c.id AND p.inventory_id = i.id AND p.proof_date = ?) AS proofs_today
       FROM campaigns c JOIN campaign_screens cs ON cs.campaign_id = c.id JOIN inventory i ON i.id = cs.inventory_id LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.company_id = ? AND i.company_id = ? AND c.status IN ('booked','live') AND c.start_date <= ? AND c.end_date >= ?
      ORDER BY i.city, i.name, c.name`, today, companyId, companyId, today, today);
}

/** Reminder once per day: shows up when someone opens Live Operations or the Field page after the reminder hour. */
async function maybeRemind(env: Env, companyId: string, items?: any[]): Promise<void> {
  try {
    const st = await one<{ remind_hour: number | null }>(env, 'SELECT remind_hour FROM field_settings WHERE company_id = ?', companyId);
    const hour = st ? st.remind_hour : REMIND_DEFAULT;
    if (hour === null || hour === undefined) return;
    const local = (new Date().getUTCHours() + PKT_OFFSET_HOURS) % 24;
    if (local < hour) return;
    const list = items ?? (await fieldItems(env, companyId));
    const pending = list.filter((x) => Number(x.proofs_today) === 0);
    if (pending.length === 0) return;
    const screens = new Set(pending.map((x) => x.screen_id)).size;
    await notify(env, companyId, { key: `field-pending-${todayIso()}`, severity: 'warning', category: 'campaign', title: `${screens} screen${screens === 1 ? '' : 's'} still have no proof today`, detail: 'Field staff have not sent proof of play for these screens yet.', link: '/operations?tab=field' });
  } catch { /* reminders are best effort */ }
}

async function assignmentsOf(env: Env, companyId: string, accountId: string): Promise<{ cities: string[]; screens: string[] }> {
  const a = await rows(env, 'SELECT kind, value FROM field_assignments WHERE company_id = ? AND account_id = ?', companyId, accountId);
  return { cities: a.filter((x: any) => x.kind === 'city').map((x: any) => x.value), screens: a.filter((x: any) => x.kind === 'screen').map((x: any) => x.value) };
}
const covers = (a: { cities: string[]; screens: string[] }, it: any): boolean => a.screens.includes(it.screen_id) || (!!it.city && a.cities.includes(it.city));

async function fieldToday(env: Env, s: SessionContext): Promise<Response> {
  const all = await fieldItems(env, s.companyId);
  const mine = await assignmentsOf(env, s.companyId, s.accountId);
  const assigned = mine.cities.length + mine.screens.length > 0;
  const items = assigned ? all.filter((it) => covers(mine, it)) : all;
  const co = await one<{ name: string }>(env, 'SELECT name FROM companies WHERE id = ? LIMIT 1', s.companyId);
  await maybeRemind(env, s.companyId, all);
  return json({ ok: true, today: todayIso(), company: co?.name ?? '', assigned, items });
}

async function fieldTeam(env: Env, s: SessionContext): Promise<Response> {
  const now = nowIso();
  const ops = await rows(env,
    `SELECT DISTINCT cm.account_id, a.email FROM company_memberships cm JOIN accounts a ON a.id = cm.account_id
       JOIN company_membership_permissions p ON p.membership_id = cm.id AND p.permission = 'proof.submit' AND p.revoked_at IS NULL AND (p.expires_at IS NULL OR p.expires_at > ?)
      WHERE cm.company_id = ? AND cm.status = 'active' AND cm.account_type != 'client' ORDER BY a.email`, now, s.companyId);
  const asg = await rows(env, 'SELECT account_id, kind, value FROM field_assignments WHERE company_id = ?', s.companyId);
  const today = todayIso();
  const stats = await rows(env, 'SELECT actor_email, COUNT(*) AS n, MAX(created_at) AS last_at FROM campaign_proofs WHERE company_id = ? AND proof_date = ? GROUP BY actor_email', s.companyId, today);
  const statBy = new Map(stats.map((x: any) => [x.actor_email, x]));
  const operators = ops.map((o: any) => {
    const mine = asg.filter((a: any) => a.account_id === o.account_id);
    const st: any = statBy.get(o.email);
    return { account_id: o.account_id, email: o.email, cities: mine.filter((a: any) => a.kind === 'city').map((a: any) => a.value), screen_ids: mine.filter((a: any) => a.kind === 'screen').map((a: any) => a.value), proofs_today: st?.n ?? 0, last_proof: st?.last_at ?? null };
  });
  const all = await fieldItems(env, s.companyId);
  const pending = all.filter((x) => Number(x.proofs_today) === 0).map((x) => {
    const who = operators.filter((o) => covers({ cities: o.cities, screens: o.screen_ids }, x)).map((o) => o.email);
    const open = operators.filter((o) => o.cities.length + o.screen_ids.length === 0).map((o) => o.email);
    return { campaign_id: x.campaign_id, campaign_name: x.campaign_name, client_name: x.client_name, screen_id: x.screen_id, screen_name: x.screen_name, city: x.city, assigned_to: who.length ? who : open };
  });
  const cities = (await rows(env, `SELECT DISTINCT city FROM inventory WHERE company_id = ? AND city IS NOT NULL AND city != '' ORDER BY city`, s.companyId)).map((c: any) => c.city);
  const screens = await rows(env, 'SELECT id, name, city FROM inventory WHERE company_id = ? ORDER BY name', s.companyId);
  const st = await one<{ remind_hour: number | null }>(env, 'SELECT remind_hour FROM field_settings WHERE company_id = ?', s.companyId);
  await maybeRemind(env, s.companyId, all);
  return json({ ok: true, today, operators, pending, covered: all.length - pending.length, total: all.length, cities, screens, remind_hour: st ? st.remind_hour : REMIND_DEFAULT });
}

async function saveAssignments(request: Request, env: Env, s: SessionContext, accountId: string): Promise<Response> {
  const own = await one(env, `SELECT 1 AS x FROM company_memberships WHERE company_id = ? AND account_id = ? AND account_type != 'client'`, s.companyId, accountId);
  if (!own) return fail(404, 'Team member not found.', 'NOT_FOUND');
  const b: any = await request.json().catch(() => ({}));
  const cities: string[] = Array.from(new Set((Array.isArray(b.cities) ? b.cities : []).map((c: unknown) => String(c).trim().slice(0, 60)).filter(Boolean))).slice(0, 40) as string[];
  const wanted: string[] = Array.from(new Set((Array.isArray(b.screen_ids) ? b.screen_ids : []).map(String))).slice(0, 200) as string[];
  const valid = wanted.length ? (await rows(env, `SELECT id FROM inventory WHERE company_id = ? AND id IN (${wanted.map(() => '?').join(',')})`, s.companyId, ...wanted)).map((x: any) => x.id) : [];
  await env.DB.prepare('DELETE FROM field_assignments WHERE company_id = ? AND account_id = ?').bind(s.companyId, accountId).run();
  for (const c of cities) await env.DB.prepare('INSERT INTO field_assignments (company_id, account_id, kind, value) VALUES (?,?,?,?)').bind(s.companyId, accountId, 'city', c).run();
  for (const v of valid) await env.DB.prepare('INSERT INTO field_assignments (company_id, account_id, kind, value) VALUES (?,?,?,?)').bind(s.companyId, accountId, 'screen', v).run();
  await logAudit(env, s.companyId, s.accountId, 'Field assignment changed', `${cities.length} cities, ${valid.length} screens`);
  return json({ ok: true, message: cities.length + valid.length ? 'Assignment saved.' : 'Assignment cleared. This person sees all screens.' });
}

async function saveFieldSettings(request: Request, env: Env, s: SessionContext): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const h = b.remind_hour === null || b.remind_hour === '' || b.remind_hour === undefined ? null : Math.floor(Number(b.remind_hour));
  if (h !== null && !(h >= 0 && h <= 23)) return fail(400, 'Choose an hour between 0 and 23.');
  await env.DB.prepare('INSERT INTO field_settings (company_id, remind_hour) VALUES (?,?) ON CONFLICT(company_id) DO UPDATE SET remind_hour = excluded.remind_hour').bind(s.companyId, h).run();
  return json({ ok: true, message: h === null ? 'Reminder is off.' : 'Reminder saved.' });
}

async function fieldProof(request: Request, env: Env, s: SessionContext): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const camp = await one<any>(env, 'SELECT id, name, client_id FROM campaigns WHERE id = ? AND company_id = ?', String(b.campaign_id ?? ''), s.companyId);
  if (!camp) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const inv = await one<any>(env, `SELECT i.id, i.name, i.latitude, i.longitude FROM inventory i JOIN campaign_screens cs ON cs.inventory_id = i.id
     WHERE i.id = ? AND i.company_id = ? AND cs.campaign_id = ?`, String(b.inventory_id ?? ''), s.companyId, camp.id);
  if (!inv) return fail(400, 'That screen is not part of this campaign.');
  const photo = text(b.photo_url, 400);
  if (!photo) return fail(400, 'Please take a photo first.');
  const fm = photo.match(/^\/api\/files\/([0-9a-fA-F-]{36})/);
  if (fm) {
    const f = await one(env, 'SELECT id FROM uploaded_files WHERE id = ? AND company_id = ?', fm[1], s.companyId);
    if (!f) return fail(400, 'The photo was not found. Please upload it again.');
  } else if (!/^https:\/\//i.test(photo)) return fail(400, 'The photo must be an uploaded file.');
  const sd = isoDate(b.proof_date);
  const proofDate = sd && Math.abs(dayNum(sd) - dayNum(todayIso())) <= 1 ? sd : todayIso();
  const lat = num(b.lat), lng = num(b.lng), acc = num(b.accuracy);
  const hasGeo = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  let dist: number | null = null, geoOk: number | null = null;
  if (hasGeo && inv.latitude != null && inv.longitude != null && Number.isFinite(Number(inv.latitude)) && Number.isFinite(Number(inv.longitude))) {
    dist = Math.round(meters(lat as number, lng as number, Number(inv.latitude), Number(inv.longitude)));
    geoOk = dist <= GEO_RADIUS_M ? 1 : 0;
  }
  const id = uuid();
  await env.DB.prepare(`INSERT INTO campaign_proofs (id, company_id, campaign_id, inventory_id, proof_date, photo_url, notes, actor_email, created_at, lat, lng, accuracy, taken_at, geo_ok, distance_m)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, s.companyId, camp.id, inv.id, proofDate, photo, text(b.notes, 500), await emailOf(env, s.accountId), nowIso(),
      hasGeo ? lat : null, hasGeo ? lng : null, hasGeo ? acc : null, nowIso(), geoOk, dist).run();
  if (camp.client_id) {
    await notify(env, s.companyId, { audience: 'client', clientId: camp.client_id, key: `proof-${id}`, severity: 'success', category: 'campaign', title: 'New proof of play added', detail: `${inv.name} \u00b7 ${camp.name}`, link: '/client-portal' });
  }
  await logAudit(env, s.companyId, s.accountId, 'Proof of play added', `${inv.name} \u00b7 ${camp.name}`);
  return json({ ok: true, id, geo: geoOk === 1 ? 'verified' : geoOk === 0 ? 'far' : 'none', distance_m: dist, message: geoOk === 0 ? `Sent. Note: you seem about ${dist} m away from the screen.` : 'Proof sent.' });
}

/* ---------------- router ---------------- */

export async function handleOpsRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path === '/api/player/ping') return ping(request, env, url);
  if (!path.startsWith('/api/ops/')) return null;
  try {
    await ensure(env.DB);
    const write = request.method !== 'GET';
    const isField = path === '/api/ops/field/today' || path === '/api/ops/field/proof';
    const g = await guard(request, env, write, isField);
    if (g instanceof Response) return g;
    const s = g;
    const id = '([0-9a-fA-F-]{36})';
    if (path === '/api/ops/field/today' && request.method === 'GET') return await fieldToday(env, s);
    if (path === '/api/ops/field/team' && request.method === 'GET') return await fieldTeam(env, s);
    if (path === '/api/ops/field/settings' && request.method === 'PUT') return await saveFieldSettings(request, env, s);
    const fa = path.match(/^\/api\/ops\/field\/team\/([0-9a-zA-Z_-]{1,64})$/);
    if (fa && request.method === 'PUT') return await saveAssignments(request, env, s, fa[1]);
    if (path === '/api/ops/field/proof' && request.method === 'POST') return await fieldProof(request, env, s);
    if (path === '/api/ops/overview' && request.method === 'GET') return await overview(env, s.companyId);
    if (path === '/api/ops/incidents') {
      if (request.method === 'GET') return await listIncidents(env, s, url);
      if (request.method === 'POST') return await createIncident(request, env, s);
    }
    if (path === '/api/ops/maintenance') {
      if (request.method === 'GET') return await listMaintenance(env, s);
      if (request.method === 'POST') return await createMaintenance(request, env, s);
    }
    if (path === '/api/ops/proofs' && request.method === 'GET') return await listProofs(env, s, url);
    let m = path.match(new RegExp(`^/api/ops/screens/${id}$`));
    if (m && request.method === 'GET') return await screenDetail(env, s, m[1]);
    m = path.match(new RegExp(`^/api/ops/screens/${id}/status$`));
    if (m && request.method === 'POST') return await setStatus(request, env, s, m[1]);
    m = path.match(new RegExp(`^/api/ops/screens/${id}/player$`));
    if (m && (request.method === 'POST' || request.method === 'DELETE')) return await playerKey(request, env, s, m[1]);
    m = path.match(new RegExp(`^/api/ops/incidents/${id}$`));
    if (m && (request.method === 'PUT' || request.method === 'DELETE')) return await updateIncident(request, env, s, m[1]);
    m = path.match(new RegExp(`^/api/ops/maintenance/${id}$`));
    if (m && (request.method === 'PUT' || request.method === 'DELETE')) return await maintenanceItem(request, env, s, m[1]);
    return fail(404, 'API route not found.', 'NOT_FOUND');
  } catch (e) {
    return json({ ok: false, error: 'SERVER_ERROR', message: 'Live Operations could not complete that request.' }, 500);
  }
}
