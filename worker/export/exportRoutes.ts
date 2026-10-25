import type { Env } from '../index';
import { resolveSession } from '../auth/session';
import { logAudit } from '../admin/adminRoutes';

/**
 * "Export all my data": lets the company owner download everything that belongs to the company.
 * The browser asks for the list of tables, then reads each table in pages, and builds the zip file itself.
 * - GET /api/export/tables              : [{ name, rows }] for every table that holds company data
 * - GET /api/export/table/:name?offset= : { columns, rows, has_more } (5000 rows per page)
 * - GET /api/export/files               : the uploaded files of the company (each opens at /api/files/:id)
 * Secrets (password hashes, tokens, player keys) and other companies' data are never included.
 */

const PAGE = 5000;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const SKIP_TABLE = /(^sqlite_|^_cf_|^d1_|token|session|cache|chunks|invitation|^accounts$)/i;
const SECRET_COL = /(password|token|secret|player_key|api_key|hash|salt)/i;
const PARENTS: Record<string, string> = {
  campaign_id: 'campaigns', invoice_id: 'invoices', client_id: 'clients', inventory_id: 'inventory', proposal_id: 'proposals', lead_id: 'leads', incident_id: 'incidents',
};

interface TableInfo { name: string; columns: string[]; where: string; binds: unknown[] }

async function discover(env: Env, companyId: string): Promise<TableInfo[]> {
  const all = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all<{ name: string }>()).results ?? [];
  const names = all.map((r) => r.name).filter((n) => /^[A-Za-z0-9_]+$/.test(n));
  const cols = new Map<string, string[]>();
  for (const n of names) {
    if (SKIP_TABLE.test(n)) continue;
    const info = (await env.DB.prepare(`PRAGMA table_info(${n})`).all<{ name: string }>()).results ?? [];
    cols.set(n, info.map((c) => c.name));
  }
  const hasCompany = (t: string) => (cols.get(t) ?? []).includes('company_id');
  const out: TableInfo[] = [];
  for (const [name, c] of cols) {
    const visible = c.filter((x) => !SECRET_COL.test(x));
    if (visible.length === 0) continue;
    if (name === 'companies') { out.push({ name, columns: visible, where: 'id = ?', binds: [companyId] }); continue; }
    if (c.includes('company_id')) { out.push({ name, columns: visible, where: 'company_id = ?', binds: [companyId] }); continue; }
    const link = Object.keys(PARENTS).find((k) => c.includes(k) && cols.has(PARENTS[k]) && hasCompany(PARENTS[k]));
    if (link) out.push({ name, columns: visible, where: `${link} IN (SELECT id FROM ${PARENTS[link]} WHERE company_id = ?)`, binds: [companyId] });
  }
  return out;
}

export async function handleExportRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/export/')) return null;
  if (request.method !== 'GET') return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    if (s.accountType === 'client' || !(s.accountType === 'owner' || s.permissions.includes('company.manage'))) {
      return fail(403, 'Only the company owner can export the company data.', 'FORBIDDEN');
    }
    if (path === '/api/export/tables') {
      await logAudit(env, s.companyId, s.accountId, 'Data export started');
      const tables = await discover(env, s.companyId);
      const out: { name: string; rows: number }[] = [];
      for (const t of tables) {
        const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t.name} WHERE ${t.where}`).bind(...t.binds).first<{ n: number }>().catch(() => null);
        out.push({ name: t.name, rows: Number(r?.n) || 0 });
      }
      return json({ ok: true, tables: out.filter((t) => t.rows > 0) });
    }
    const tm = path.match(/^\/api\/export\/table\/([A-Za-z0-9_]{1,64})$/);
    if (tm) {
      const tables = await discover(env, s.companyId);
      const t = tables.find((x) => x.name === tm[1]);
      if (!t) return fail(404, 'Table not found.', 'NOT_FOUND');
      const offset = Math.max(0, Math.trunc(Number(url.searchParams.get('offset')) || 0));
      const rs = await env.DB.prepare(`SELECT ${t.columns.map((c) => `"${c}"`).join(', ')} FROM ${t.name} WHERE ${t.where} LIMIT ${PAGE + 1} OFFSET ${offset}`).bind(...t.binds).all<Record<string, unknown>>();
      const rows = rs.results ?? [];
      return json({ ok: true, name: t.name, columns: t.columns, rows: rows.slice(0, PAGE), has_more: rows.length > PAGE, next_offset: offset + PAGE });
    }
    if (path === '/api/export/files') {
      let files: any[] = [];
      try {
        files = (await env.DB.prepare('SELECT id, name, ext, size, campaign_id, created_at FROM uploaded_files WHERE company_id = ? ORDER BY created_at').bind(s.companyId).all<any>()).results ?? [];
      } catch { files = []; }
      return json({ ok: true, files, total_bytes: files.reduce((a, f) => a + (Number(f.size) || 0), 0) });
    }
    return fail(404, 'Not found.', 'NOT_FOUND');
  } catch {
    return fail(500, 'Unable to prepare the export. Please try again.', 'EXPORT_FAILED');
  }
}
