import type { Env } from '../index';
import { resolveSession } from '../auth/session';
import { logAudit } from '../admin/adminRoutes';

/**
 * API access for the company owner.
 * Key management (signed-in owner only):
 * - GET    /api/admin/api-keys      : list keys (prefix only, never the key itself)
 * - POST   /api/admin/api-keys      : { name } -> creates a key, the full key is shown ONCE
 * - DELETE /api/admin/api-keys/:id  : revoke a key
 * Read-only data API (Authorization: Bearer nxp_...):
 * - GET /api/v1/me, /api/v1/screens, /api/v1/campaigns, /api/v1/clients, /api/v1/invoices   (?limit=1..200&offset=0)
 * Only the SHA-256 hash of a key is stored. Every query is scoped by the company the key belongs to.
 */

const MAX_KEYS = 5;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const SECRET_COL = /(password|token|secret|player_key|api_key|hash|salt)/i;
const strip = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) if (!SECRET_COL.test(k)) out[k] = row[k];
  return out;
};

async function ensure(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL,
    created_by TEXT, created_at TEXT NOT NULL, last_used_at TEXT, revoked_at TEXT)`).run();
  try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)').run(); } catch { /* ignore */ }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return 'nxp_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const TABLES: Record<string, { sql: string; hasCompany: string }> = {
  screens: { sql: 'SELECT * FROM inventory WHERE company_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', hasCompany: 'inventory' },
  clients: { sql: 'SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', hasCompany: 'clients' },
  campaigns: {
    sql: 'SELECT c.*, cl.name AS client_name FROM campaigns c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.company_id = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?',
    hasCompany: 'campaigns',
  },
  invoices: {
    sql: 'SELECT i.*, cl.name AS client_name FROM invoices i LEFT JOIN clients cl ON cl.id = i.client_id WHERE i.company_id = ? ORDER BY i.created_at DESC LIMIT ? OFFSET ?',
    hasCompany: 'invoices',
  },
};

export async function handleApiRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const isMgmt = path === '/api/admin/api-keys' || /^\/api\/admin\/api-keys\/[0-9a-fA-F-]{36}$/.test(path);
  const isV1 = path === '/api/v1' || path.startsWith('/api/v1/');
  if (!isMgmt && !isV1) return null;
  try {
    await ensure(env.DB);

    if (isMgmt) {
      const s = await resolveSession(request, env.DB);
      if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
      if (s.accountType === 'client' || !(s.accountType === 'owner' || s.permissions.includes('company.manage'))) {
        return fail(403, 'Only the company owner can manage API keys.', 'FORBIDDEN');
      }
      if (path === '/api/admin/api-keys' && request.method === 'GET') {
        const rows = await env.DB.prepare('SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE company_id = ? AND revoked_at IS NULL ORDER BY created_at DESC').bind(s.companyId).all<any>();
        return json({ ok: true, keys: (rows.results ?? []).map((r) => ({ id: r.id, name: r.name, prefix: r.key_prefix, createdAt: r.created_at, lastUsedAt: r.last_used_at })), max: MAX_KEYS });
      }
      if (path === '/api/admin/api-keys' && request.method === 'POST') {
        const b = (await request.json().catch(() => ({}))) as { name?: unknown };
        const name = typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '';
        if (name.length < 2) return fail(400, 'Give the key a name, for example "Power BI".');
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM api_keys WHERE company_id = ? AND revoked_at IS NULL').bind(s.companyId).first<{ n: number }>();
        if ((n?.n ?? 0) >= MAX_KEYS) return fail(409, `You can keep up to ${MAX_KEYS} active keys. Revoke one first.`, 'LIMIT');
        const key = newKey();
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO api_keys (id, company_id, name, key_prefix, key_hash, created_by, created_at) VALUES (?,?,?,?,?,?,?)')
          .bind(id, s.companyId, name, key.slice(0, 10), await sha256(key), s.accountId, new Date().toISOString()).run();
        await logAudit(env, s.companyId, s.accountId, 'API key created', name);
        return json({ ok: true, id, key });
      }
      const m = path.match(/^\/api\/admin\/api-keys\/([0-9a-fA-F-]{36})$/);
      if (m && request.method === 'DELETE') {
        const k = await env.DB.prepare('SELECT name FROM api_keys WHERE id = ? AND company_id = ? AND revoked_at IS NULL').bind(m[1], s.companyId).first<{ name: string }>();
        if (!k) return fail(404, 'Key not found.', 'NOT_FOUND');
        await env.DB.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND company_id = ?').bind(new Date().toISOString(), m[1], s.companyId).run();
        await logAudit(env, s.companyId, s.accountId, 'API key revoked', k.name);
        return json({ ok: true });
      }
      return fail(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
    }

    // ---- read-only data API ----
    if (request.method !== 'GET') return fail(405, 'The API is read-only. Use GET.', 'METHOD_NOT_ALLOWED');
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!/^nxp_[0-9a-f]{48}$/.test(token)) return json({ ok: false, error: 'UNAUTHENTICATED', message: 'Send your key as: Authorization: Bearer nxp_...' }, 401);
    const key = await env.DB.prepare('SELECT id, company_id, name, last_used_at FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL').bind(await sha256(token)).first<{ id: string; company_id: string; name: string; last_used_at: string | null }>();
    if (!key) return json({ ok: false, error: 'UNAUTHENTICATED', message: 'This API key is not valid or was revoked.' }, 401);
    const now = Date.now();
    if (!key.last_used_at || now - Date.parse(key.last_used_at) > 60_000) {
      await env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(new Date(now).toISOString(), key.id).run();
    }
    const resource = path.replace(/^\/api\/v1\/?/, '');
    if (resource === 'me' || resource === '') {
      const c = await env.DB.prepare('SELECT id, name, plan, default_currency FROM companies WHERE id = ?').bind(key.company_id).first<any>();
      return json({ ok: true, company: c ? { id: c.id, name: c.name, plan: c.plan, currency: c.default_currency } : null, key: key.name, endpoints: Object.keys(TABLES) });
    }
    const t = TABLES[resource];
    if (!t) return fail(404, 'Unknown endpoint. Use: ' + Object.keys(TABLES).join(', '), 'NOT_FOUND');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const rows = await env.DB.prepare(t.sql).bind(key.company_id, limit + 1, offset).all<Record<string, unknown>>();
    const list = (rows.results ?? []).map(strip);
    const more = list.length > limit;
    return json({ ok: true, data: more ? list.slice(0, limit) : list, limit, offset, has_more: more });
  } catch {
    return fail(500, 'The request could not be completed.', 'API_FAILED');
  }
}
