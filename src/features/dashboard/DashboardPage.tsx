// ==========================================
    // DASHBOARD SUMMARY (READ-ONLY)
    // ==========================================
    if (url.pathname === '/api/dashboard/summary' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const companyId = session.companyId;

        const DAYS = 30;
        const since = new Date(Date.now() - (DAYS - 1) * 86400000).toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);

        // ---- campaigns (with OOH/DOOH screen counts, revenue and expenses) ----
        const campaignRows = await env.DB.prepare(`
          SELECT c.id, c.name, c.status, c.total_budget, c.currency, c.start_date, c.end_date, c.created_at,
            (SELECT COUNT(*) FROM campaign_screens cs JOIN inventory i ON i.id = cs.inventory_id
               WHERE cs.campaign_id = c.id AND i.screen_type = 'static') AS ooh_screens,
            (SELECT COUNT(*) FROM campaign_screens cs JOIN inventory i ON i.id = cs.inventory_id
               WHERE cs.campaign_id = c.id AND i.screen_type != 'static') AS dooh_screens,
            (SELECT COALESCE(SUM(inv.amount_paid), 0) FROM invoices inv
               WHERE inv.campaign_id = c.id AND inv.company_id = c.company_id AND inv.status != 'cancelled') AS revenue,
            (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
               WHERE e.campaign_id = c.id AND e.company_id = c.company_id) AS expenses
          FROM campaigns c
          WHERE c.company_id = ?
          ORDER BY c.created_at DESC
        `).bind(companyId).all<any>();

        const campaigns = (campaignRows.results || []).map((c: any) => {
          const budget = Number(c.total_budget) || 0;
          const revenue = Number(c.revenue) || 0;
          const expenses = Number(c.expenses) || 0;
          const ooh = Number(c.ooh_screens) || 0;
          const dooh = Number(c.dooh_screens) || 0;
          const type = ooh > 0 && dooh > 0 ? 'OOH + DOOH' : dooh > 0 ? 'DOOH' : ooh > 0 ? 'OOH' : '—';
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            currency: c.currency || 'PKR',
            start_date: c.start_date,
            end_date: c.end_date,
            budget,
            revenue,
            expenses,
            roas: expenses > 0 ? revenue / expenses : null,
            ooh_screens: ooh,
            dooh_screens: dooh,
            type,
          };
        });

        // ---- OOH / DOOH split (allocated by screen share) ----
        const split = {
          ooh: { budget: 0, revenue: 0, expenses: 0, screens: 0 },
          dooh: { budget: 0, revenue: 0, expenses: 0, screens: 0 },
        };
        for (const c of campaigns) {
          const total = c.ooh_screens + c.dooh_screens;
          split.ooh.screens += c.ooh_screens;
          split.dooh.screens += c.dooh_screens;
          if (total === 0) continue;
          const oShare = c.ooh_screens / total;
          const dShare = c.dooh_screens / total;
          split.ooh.budget += c.budget * oShare;
          split.dooh.budget += c.budget * dShare;
          split.ooh.revenue += c.revenue * oShare;
          split.dooh.revenue += c.revenue * dShare;
          split.ooh.expenses += c.expenses * oShare;
          split.dooh.expenses += c.expenses * dShare;
        }

        // ---- inventory counts ----
        const invRows = await env.DB.prepare(`
          SELECT screen_type, status, COUNT(*) AS n FROM inventory WHERE company_id = ? GROUP BY screen_type, status
        `).bind(companyId).all<any>();
        const inventory = { ooh: 0, dooh: 0, online: 0, total: 0 };
        for (const r of invRows.results || []) {
          const n = Number(r.n) || 0;
          inventory.total += n;
          if (r.screen_type === 'static') inventory.ooh += n; else inventory.dooh += n;
          if (r.status === 'online') inventory.online += n;
        }

        // ---- daily series (last 30 days) ----
        const payDaily = await env.DB.prepare(`
          SELECT substr(p.payment_date, 1, 10) AS d, SUM(p.amount) AS v
          FROM invoice_payments p JOIN invoices i ON p.invoice_id = i.id
          WHERE i.company_id = ? AND substr(p.payment_date, 1, 10) >= ?
          GROUP BY d
        `).bind(companyId, since).all<any>();
        const expDaily = await env.DB.prepare(`
          SELECT substr(expense_date, 1, 10) AS d, SUM(amount) AS v
          FROM expenses WHERE company_id = ? AND substr(expense_date, 1, 10) >= ?
          GROUP BY d
        `).bind(companyId, since).all<any>();
        const leadDaily = await env.DB.prepare(`
          SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS v
          FROM leads WHERE company_id = ? AND substr(created_at, 1, 10) >= ?
          GROUP BY d
        `).bind(companyId, since).all<any>();

        const toMap = (rows: any[]) => {
          const m: Record<string, number> = {};
          for (const r of rows || []) m[r.d] = Number(r.v) || 0;
          return m;
        };
        const payMap = toMap(payDaily.results as any[]);
        const expMap = toMap(expDaily.results as any[]);
        const leadMap = toMap(leadDaily.results as any[]);
        const daily: { date: string; revenue: number; expenses: number; leads: number }[] = [];
        for (let i = 0; i < DAYS; i++) {
          const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
          daily.push({ date: d, revenue: payMap[d] || 0, expenses: expMap[d] || 0, leads: leadMap[d] || 0 });
        }

        // ---- health score (online screens 40%, collection rate 40%, any live campaign 20%) ----
        const invoiceTotals = await env.DB.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) AS invoiced, COALESCE(SUM(amount_paid), 0) AS paid
          FROM invoices WHERE company_id = ? AND status NOT IN ('cancelled', 'draft')
        `).bind(companyId).first<any>();
        const onlineRatio = inventory.total > 0 ? inventory.online / inventory.total : 0;
        const collection = Number(invoiceTotals?.invoiced) > 0 ? Number(invoiceTotals.paid) / Number(invoiceTotals.invoiced) : 0;
        const hasLive = campaigns.some((c: any) => c.status === 'live') ? 1 : 0;
        const health_score = Math.round(100 * (0.4 * onlineRatio + 0.4 * Math.min(1, collection) + 0.2 * hasLive));

        // ---- activity & alerts feed ----
        type FeedEvent = { kind: 'ok' | 'warn' | 'info'; title: string; sub: string; at: string };
        const events: FeedEvent[] = [];

        const offline = await env.DB.prepare(`
          SELECT name, status, city FROM inventory WHERE company_id = ? AND status != 'online' LIMIT 3
        `).bind(companyId).all<any>();
        for (const s of offline.results || []) {
          events.push({ kind: 'warn', title: `Screen ${s.status}: ${s.name}`, sub: s.city ? `Inventory · ${s.city}` : 'Inventory', at: today });
        }

        const overdue = await env.DB.prepare(`
          SELECT invoice_number, due_date, (total_amount - amount_paid) AS due
          FROM invoices
          WHERE company_id = ? AND status NOT IN ('paid', 'cancelled', 'draft') AND due_date < ?
          ORDER BY due_date ASC LIMIT 3
        `).bind(companyId, today).all<any>();
        for (const inv of overdue.results || []) {
          events.push({ kind: 'warn', title: `Invoice overdue: ${inv.invoice_number}`, sub: `Due ${inv.due_date}`, at: today });
        }

        for (const c of campaigns.filter((x: any) => x.status === 'live').slice(0, 3)) {
          events.push({ kind: 'ok', title: `Campaign live: ${c.name}`, sub: `${c.type} · ${c.start_date} → ${c.end_date}`, at: c.start_date || '' });
        }

        const recentPay = await env.DB.prepare(`
          SELECT p.amount, p.payment_date, c.name AS client_name, i.currency
          FROM invoice_payments p
          JOIN invoices i ON p.invoice_id = i.id
          JOIN clients c ON i.client_id = c.id
          WHERE i.company_id = ?
          ORDER BY p.payment_date DESC LIMIT 4
        `).bind(companyId).all<any>();
        for (const p of recentPay.results || []) {
          events.push({
            kind: 'ok',
            title: `Payment received: ${p.currency || 'PKR'} ${Number(p.amount).toLocaleString('en-US')}`,
            sub: `${p.client_name} · ${String(p.payment_date).slice(0, 10)}`,
            at: String(p.payment_date).slice(0, 10),
          });
        }

        const recentLeads = await env.DB.prepare(`
          SELECT company_name, source, created_at FROM leads WHERE company_id = ? ORDER BY created_at DESC LIMIT 4
        `).bind(companyId).all<any>();
        for (const l of recentLeads.results || []) {
          events.push({
            kind: 'info',
            title: `New lead: ${l.company_name}`,
            sub: `${l.source ? l.source + ' · ' : ''}${String(l.created_at).slice(0, 10)}`,
            at: String(l.created_at).slice(0, 10),
          });
        }

        events.sort((a, b) => {
          if ((a.kind === 'warn') !== (b.kind === 'warn')) return a.kind === 'warn' ? -1 : 1;
          return b.at.localeCompare(a.at);
        });

        return json({
          ok: true,
          data: {
            health_score,
            campaigns,
            inventory,
            split,
            daily,
            events: events.slice(0, 10),
          },
        });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
