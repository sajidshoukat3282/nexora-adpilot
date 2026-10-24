import React, { useEffect, useState } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { MIN_PASSWORD_LENGTH, passwordApi } from "@/lib/api/password";

/** Lets the signed-in person set or change their own password. */
export const PasswordCard: React.FC = () => {
  const [has, setHas] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    passwordApi.status().then((r) => setHas(r.has_password)).catch(() => setHas(null));
  }, []);

  const save = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < MIN_PASSWORD_LENGTH) { setMsg({ ok: false, text: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }); return; }
    if (next !== again) { setMsg({ ok: false, text: "The two passwords do not match." }); return; }
    setBusy(true);
    try {
      const r = await passwordApi.set(next, has ? current : undefined);
      setMsg({ ok: true, text: r.message });
      setHas(true); setCurrent(""); setNext(""); setAgain("");
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "The password could not be saved." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${FIN.panel} p-4`}>
      <SectionTitle>{has ? "Change password" : "Set a password"}</SectionTitle>
      <p className="mt-1 text-[11px] text-zinc-500">
        {has ? "Your account has a password. Enter the current one to change it." : "Add a password so you can also sign in with your email and password."}
      </p>
      <form onSubmit={save} className="mt-3 space-y-2.5">
        {has && (
          <div>
            <label className={FIN.label} htmlFor="pw-current">Current password</label>
            <input id="pw-current" className={FIN.input} type="password" autoComplete="current-password" value={current} onChange={(e: any) => setCurrent(e.target.value)} disabled={busy} />
          </div>
        )}
        <div>
          <label className={FIN.label} htmlFor="pw-new">New password</label>
          <input id="pw-new" className={FIN.input} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={next} onChange={(e: any) => setNext(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className={FIN.label} htmlFor="pw-again">Repeat new password</label>
          <input id="pw-again" className={FIN.input} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={again} onChange={(e: any) => setAgain(e.target.value)} disabled={busy} />
        </div>
        {msg && <p className={`text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
        <button type="submit" className={FIN.btnGold} disabled={busy || !next}>{busy ? "Saving..." : has ? "Change password" : "Save password"}</button>
        <p className="text-[10px] text-zinc-600">Minimum {MIN_PASSWORD_LENGTH} characters. Other devices are signed out when you save.</p>
      </form>
    </div>
  );
};
