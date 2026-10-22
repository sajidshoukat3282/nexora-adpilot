import type { Env } from '../index';
import { fail, guard, json, log, ownCampaign, readBody } from './campaignRoutes';

/**
 * Real data for the campaign Creatives, Approvals and Proof-of-Play tabs.
 * Creatives hold a name, a link (Drive / Dropbox / image URL) and notes; every
 * approval step is stored. Proof of play is a photo link per screen and date.
 */

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS campaign_creatives (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT NOT NULL,
       name TEXT NOT NULL, url TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'draft',
       version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS creative_reviews (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, creative_id TEXT NOT NULL,
       from_status TEXT, to_status TEXT NOT NULL, comment TEXT, actor_email TEXT, created_at TEXT NOT NULL)`,
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS campaign_proofs (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT NOT NULL, inventory_id TEXT,
       proof_date TEXT NOT NULL, photo_url TEXT, notes TEXT, actor_email TEXT, created_at TEXT NOT NULL)`,
  ).run();
  ready = true;
}

export const CREATIVE_NEXT: Record<string, string[]> = {
  draft: ['internal_review'],
  internal_review: ['client_review', 'rejected', 'draft'],
  client_review: ['approved', 'rejected'],
  rejected: ['draft'],
  approved: [],
};

const text = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s ? s : null;
};
const link = (v: unknown): string | null => {
  const s = text(v, 500);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
};
const now = () => new Date().toISOString();

async function email(env: Env, accountId: string): Promise<string | null> {
  const a = await env.DB.prepare('SELECT email FROM accounts WHERE id = ? LIMIT 1').bind(accountId).first<{ email: string }>();
  return a?.email ?? null;
}

export async function handleCampaignExtras(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const re = path.match(/^\/api\/campaigns\/([0-9a-fA-F-]{36})\/(creatives|proofs)(?:\/([0-9a-fA-F-]{36})(\/status)?)?$/);
  if (!re) return null;
  const [, cid, kind, itemId, statusPart] = re;
  const method = request.method;
  try {
    const write = method !== 'GET';
    const s = await guard(request, env, write);
    if (s instanceof Response) return s;
    await ensure(env.DB);
    const camp = await ownCampaign(env, s.companyId, cid);
    if (!camp) return fail(404, 'Campaign not found.', 'NOT_FOUND');

    if (kind === 'creatives') {
      if (method === 'GET' && !itemId) {
        const items = await env.DB.prepare('SELECT * FROM campaign_creatives WHERE company_id = ? AND campaign_id = ? ORDER BY created_at DESC').bind(s.companyId, cid).all();
        const reviews = await env.DB.prepare(
          `SELECT r.* FROM creative_reviews r INNER JOIN campaign_creatives c ON c.id = r.creative_id
            WHERE c.company_id = ? AND c.campaign_id = ? ORDER BY r.created_at DESC`,
        ).bind(s.companyId, cid).all();
        return json({ ok: true, creatives: items.results, reviews: reviews.results, next: CREATIVE_NEXT });
      }
      if (method === 'POST' && !itemId) {
        const b = await readBody(request);
        const name = text(b.name, 120);
        if (!name) return fail(400, 'Creative name is required.');
        if (b.url && !link(b.url)) return fail(400, 'The link must start with http:// or https://.');
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO campaign_creatives (id, company_id, campaign_id, name, url, notes, status, version, created_at, updated_at)
           VALUES (?,?,?,?,?,?,'draft',1,?,?)`,
        ).bind(id, s.companyId, cid, name, link(b.url), text(b.notes, 500), now(), now()).run();
        await log(env, s, cid, 'Creative added', name);
        return json({ ok: true, id });
      }
      if (itemId && !statusPart && method === 'PUT') {
        const b = await readBody(request);
        const name = text(b.name, 120);
        if (!name) return fail(400, 'Creative name is required.');
        if (b.url && !link(b.url)) return fail(400, 'The link must start with http:// or https://.');
        const cur = await env.DB.prepare('SELECT url FROM campaign_creatives WHERE id=? AND company_id=? AND campaign_id=?').bind(itemId, s.companyId, cid).first<{ url: string | null }>();
        if (!cur) return fail(404, 'Creative not found.', 'NOT_FOUND');
        const newUrl = link(b.url);
        const bump = newUrl !== cur.url ? 1 : 0;
        await env.DB.prepare('UPDATE campaign_creatives SET name=?, url=?, notes=?, version=version+?, updated_at=? WHERE id=? AND company_id=?')
          .bind(name, newUrl, text(b.notes, 500), bump, now(), itemId, s.companyId).run();
        return json({ ok: true });
      }
      if (itemId && !statusPart && method === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM creative_reviews WHERE creative_id=? AND company_id=?').bind(itemId, s.companyId),
          env.DB.prepare('DELETE FROM campaign_creatives WHERE id=? AND company_id=? AND campaign_id=?').bind(itemId, s.companyId, cid),
        ]);
        return json({ ok: true });
      }
      if (itemId && statusPart && method === 'POST') {
        const b = await readBody(request);
        const to = String(b.status ?? '');
        const row = await env.DB.prepare('SELECT name, status FROM campaign_creatives WHERE id=? AND company_id=? AND campaign_id=?').bind(itemId, s.companyId, cid).first<{ name: string; status: string }>();
        if (!row) return fail(404, 'Creative not found.', 'NOT_FOUND');
        if (!(CREATIVE_NEXT[row.status] ?? []).includes(to)) return fail(409, `A ${row.status.replace('_', ' ')} creative cannot move to ${to.replace('_', ' ')}.`, 'INVALID_STATE');
        const comment = text(b.comment, 300);
        if (to === 'rejected' && !comment) return fail(400, 'Please add a reason when rejecting.');
        await env.DB.batch([
          env.DB.prepare('UPDATE campaign_creatives SET status=?, updated_at=? WHERE id=? AND company_id=?').bind(to, now(), itemId, s.companyId),
          env.DB.prepare('INSERT INTO creative_reviews (id, company_id, creative_id, from_status, to_status, comment, actor_email, created_at) VALUES (?,?,?,?,?,?,?,?)')
            .bind(crypto.randomUUID(), s.companyId, itemId, row.status, to, comment, await email(env, s.accountId), now()),
        ]);
        await log(env, s, cid, `Creative ${to.replace('_', ' ')}`, row.name);
        return json({ ok: true });
      }
    }

    if (kind === 'proofs') {
      if (method === 'GET' && !itemId) {
        const rows = await env.DB.prepare(
          `SELECT p.*, i.name AS screen_name, i.city FROM campaign_proofs p LEFT JOIN inventory i ON i.id = p.inventory_id
            WHERE p.company_id=? AND p.campaign_id=? ORDER BY p.proof_date DESC, p.created_at DESC`,
        ).bind(s.companyId, cid).all();
        return json({ ok: true, proofs: rows.results });
      }
      if (method === 'POST' && !itemId) {
        const b = await readBody(request);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.proof_date)) ? String(b.proof_date) : null;
        if (!date) return fail(400, 'Proof date is required.');
        if (b.photo_url && !link(b.photo_url)) return fail(400, 'The photo link must start with http:// or https://.');
        if (!link(b.photo_url) && !text(b.notes, 500)) return fail(400, 'Add a photo link or a note.');
        let inv: string | null = null;
        if (b.inventory_id) {
          const ok = await env.DB.prepare('SELECT 1 AS x FROM campaign_screens WHERE campaign_id=? AND inventory_id=?').bind(cid, String(b.inventory_id)).first();
          if (!ok) return fail(400, 'That screen is not part of this campaign.');
          inv = String(b.inventory_id);
        }
        await env.DB.prepare('INSERT INTO campaign_proofs (id, company_id, campaign_id, inventory_id, proof_date, photo_url, notes, actor_email, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), s.companyId, cid, inv, date, link(b.photo_url), text(b.notes, 500), await email(env, s.accountId), now()).run();
        await log(env, s, cid, 'Proof of play added', date);
        return json({ ok: true });
      }
      if (itemId && method === 'DELETE') {
        await env.DB.prepare('DELETE FROM campaign_proofs WHERE id=? AND company_id=? AND campaign_id=?').bind(itemId, s.companyId, cid).run();
        return json({ ok: true });
      }
    }
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'CAMPAIGN_REQUEST_FAILED');
  }
  return null;
}
