import React, { useEffect, useState } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { apiKeysApi, type ApiKeyRow } from "@/lib/api/apiKeys";

const ENDPOINTS = ["screens", "campaigns", "clients", "invoices"];

/** Owner tool: create and revoke API keys for reading company data from other tools (Power BI, Excel, scripts). */
export const ApiKeysCard: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [max, setMax] = useState(5);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const base = typeof window !== "undefined" ? window.location.origin : "";

  const load = () => apiKeysApi.list().then((r) => { setKeys(r.keys); setMax(r.max); }).catch(() => setKeys([]));
  useEffect(() => { load(); }, []);

  const create = async (e: any) => {
    e.preventDefault();
    setMsg(null); setFresh(null);
    setBusy(true);
    try {
      const r = await apiKeysApi.create(name.trim());
      setFresh(r.key); setName("");
      await load();
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "The key could not be created." });
    } finally { setBusy(false); }
  };

  const revoke = async (k: ApiKeyRow) => {
    if (!window.confirm(`Revoke the key "${k.name}"? Tools using it will stop working.`)) return;
    try { await apiKeysApi.revoke(k.id); setFresh(null); await load(); }
    catch (err: any) { setMsg({ ok: false, text: err?.message || "The key could not be revoked." }); }
  };

  const copy = async () => {
    if (!fresh) return;
    try { await navigator.clipboard.writeText(fresh); setMsg({ ok: true, text: "Key copied." }); }
    catch { setMsg({ ok: false, text: "Copy failed. Select the key and copy it by hand." }); }
  };

  return (
    <div className={`${FIN.panel} p-4`}>
      <SectionTitle>API access</SectionTitle>
      <p className="mt-1 text-[11px] text-zinc-500">
        Read your screens, campaigns, clients and invoices from other tools such as Power BI, Excel or your own scripts. Keys are read-only.
      </p>

      {fresh && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-[11px] text-amber-200">Copy this key now. It is shown only once.</p>
          <code className="mt-1.5 block break-all rounded bg-black/40 p-2 text-[11px] text-zinc-100">{fresh}</code>
          <button type="button" className={`${FIN.btnGold} mt-2`} onClick={copy}>Copy key</button>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {keys === null && <p className="text-[11px] text-zinc-500">Loading...</p>}
        {keys && keys.length === 0 && <p className="text-[11px] text-zinc-500">No keys yet.</p>}
        {keys?.map((k) => (
          <div key={k.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
            <div className="min-w-0">
              <div className="truncate text-zinc-100">{k.name}</div>
              <div className="text-[10px] text-zinc-500">
                {k.prefix}... {"\u00b7"} created {k.createdAt.slice(0, 10)} {"\u00b7"} {k.lastUsedAt ? `last used ${k.lastUsedAt.slice(0, 10)}` : "never used"}
              </div>
            </div>
            <button type="button" className="shrink-0 text-[11px] text-rose-300 hover:text-rose-200" onClick={() => revoke(k)}>Revoke</button>
          </div>
        ))}
      </div>

      {keys && keys.length < max && (
        <form onSubmit={create} className="mt-3 flex gap-2">
          <input className={FIN.input} placeholder='Key name, e.g. "Power BI"' maxLength={40} value={name} onChange={(e: any) => setName(e.target.value)} disabled={busy} />
          <button type="submit" className={FIN.btnGold} disabled={busy || name.trim().length < 2}>{busy ? "Creating..." : "Create key"}</button>
        </form>
      )}
      {msg && <p className={`mt-2 text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}

      <div className="mt-3 rounded-lg bg-black/30 p-3 text-[10px] leading-relaxed text-zinc-400">
        <div className="text-zinc-300">How to use</div>
        <div>Send the key in the Authorization header:</div>
        <code className="block break-all text-zinc-200">curl -H "Authorization: Bearer YOUR_KEY" {base}/api/v1/screens</code>
        <div className="mt-1">Endpoints: {ENDPOINTS.map((e) => `/api/v1/${e}`).join(", ")}. Add ?limit=50&amp;offset=0 to page through results (up to 200 per page). Up to {max} active keys.</div>
      </div>
    </div>
  );
};
