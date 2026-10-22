import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import {
  addTransaction,
  createAccount,
  deleteAccount,
  deleteTransaction,
  depositPayment,
  getAccounts,
  getTransactions,
  getUnlinkedPayments,
  type AccountTx,
  type CashAccount,
  type UnlinkedPayment,
} from "@/lib/api/accounting";
import { FIN, SectionTitle } from "./financeUi";
import { AccModal, Field, Kpi, ModalActions, Notice, TD, TH, errText, fmt, fmtMap } from "./accountingUi";
import { isoToday, sumByCurrency } from "./accountingTools";

type Msg = { tone: "ok" | "error"; text: string } | null;
const KIND_LABEL: Record<string, string> = { cash: "Cash", bank: "Bank", wallet: "Wallet" };

export const AccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [txs, setTxs] = useState<AccountTx[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedPayment[]>([]);
  const [target, setTarget] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [txModal, setTxModal] = useState<{ account: CashAccount; direction: "in" | "out" } | null>(null);
  const cur = getDefaultCurrency();

  const load = useCallback(async () => {
    try {
      const [a, t, u] = await Promise.all([getAccounts(), getTransactions(), getUnlinkedPayments()]);
      setAccounts(a);
      setTxs(t);
      setUnlinked(u);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(() => sumByCurrency(accounts.map((a) => ({ amount: a.balance, currency: a.currency }))), [accounts]);
  const shownTx = txs.filter((t) => !selected || t.account_id === selected);
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "-";

  const done = async (text: string) => {
    setMsg({ tone: "ok", text });
    await load();
  };

  async function removeAccount(a: CashAccount) {
    if (!window.confirm(`Delete account ${a.name}?`)) return;
    try {
      const r = await deleteAccount(a.id);
      if (selected === a.id) setSelected("");
      await done(r.message);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    }
  }

  async function linkPayment(p: UnlinkedPayment) {
    const accountId = target[p.id] || accounts[0]?.id;
    if (!accountId) return;
    try {
      const r = await depositPayment(p.id, accountId);
      await done(r.message);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    }
  }

  async function removeTx(t: AccountTx) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      const r = await deleteTransaction(t.id);
      await done(r.message);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <SectionTitle>Cash & Bank Accounts</SectionTitle>
          <p className="mt-1 text-[11px] text-zinc-500">Track where your money is. Bill payments you mark with an account are recorded here automatically.</p>
        </div>
        <button className={FIN.btnGold} onClick={() => setAddOpen(true)}>Add Account</button>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {loading ? (
        <p className="py-6 text-center text-[12px] text-zinc-500">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-zinc-500">No accounts yet. Add your cash box, bank account or mobile wallet to start.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Total cash & bank" value={fmtMap(total, cur)} tone="gold" hint={`${accounts.length} accounts`} />
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(selected === a.id ? "" : a.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected === a.id ? "border-[#c99b3b]/60 bg-[#c99b3b]/5" : "border-[#22262d] bg-[#0f1216] hover:border-[#c99b3b]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold text-zinc-100">{a.name}</span>
                  <span className="rounded-full bg-white/5 px-1.5 text-[9px] uppercase tracking-wider text-zinc-400">{KIND_LABEL[a.kind]}</span>
                </div>
                <p className={`mt-1 text-[15px] font-semibold ${a.balance < 0 ? "text-rose-300" : "text-emerald-300"}`}>{fmt(a.balance, a.currency)}</p>
                <div className="mt-2 flex gap-1.5" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <span className={`${FIN.btnGhost} !px-2 !py-1`} role="button" onClick={() => setTxModal({ account: a, direction: "in" })}>Money In</span>
                  <span className={`${FIN.btnGhost} !px-2 !py-1`} role="button" onClick={() => setTxModal({ account: a, direction: "out" })}>Money Out</span>
                  <span className={`${FIN.btnGhost} !px-2 !py-1 !text-rose-300`} role="button" onClick={() => removeAccount(a)}>Delete</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {selected ? `Transactions - ${nameOf(selected)}` : "All transactions"}
            </p>
            {selected && (
              <button className={`${FIN.btnGhost} !px-2 !py-1`} onClick={() => setSelected("")}>Show all</button>
            )}
          </div>
          {shownTx.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-zinc-500">No transactions yet. Use Money In or Money Out on an account.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#2a2f37]">
                    <th className={TH}>Date</th>
                    <th className={TH}>Account</th>
                    <th className={TH}>Description</th>
                    <th className={`${TH} text-right`}>In</th>
                    <th className={`${TH} text-right`}>Out</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2128]">
                  {shownTx.map((t) => (
                    <tr key={t.id}>
                      <td className={`${TD} text-zinc-300`}>{t.tx_date}</td>
                      <td className={`${TD} text-zinc-400`}>{nameOf(t.account_id)}</td>
                      <td className={`${TD} text-zinc-200`}>{t.description || (t.direction === "in" ? "Money in" : "Money out")}</td>
                      <td className={`${TD} text-right text-emerald-300`}>{t.direction === "in" ? fmt(t.amount, cur) : ""}</td>
                      <td className={`${TD} text-right text-rose-300`}>{t.direction === "out" ? fmt(t.amount, cur) : ""}</td>
                      <td className={`${TD} text-right`}>
                        {t.ref_type === "manual" && (
                          <button className="text-[11px] text-zinc-500 hover:text-rose-300" onClick={() => removeTx(t)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {unlinked.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#c99b3b]/25 bg-[#0f1216] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d9b45a]">
                Client payments not in any account ({unlinked.length})
              </p>
              <p className="mb-2 text-[10px] text-zinc-500">Choose where each payment was deposited so your balances stay correct. New payments can be linked when you receive them.</p>
              <ul className="space-y-1.5">
                {unlinked.slice(0, 20).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#22262d] px-2.5 py-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate text-zinc-200">
                      {p.client_name} - {p.invoice_number} <span className="text-zinc-500">({String(p.payment_date).slice(0, 10)})</span>
                    </span>
                    <span className="font-semibold text-emerald-300">{fmt(p.amount, p.currency || cur)}</span>
                    <select
                      className={`${FIN.input} !w-auto`}
                      value={target[p.id] || accounts[0]?.id || ""}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTarget({ ...target, [p.id]: e.target.value })}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button className={`${FIN.btnGhost} !px-2 !py-1`} onClick={() => linkPayment(p)}>Add to account</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {addOpen && (
        <AddAccountModal
          onClose={() => setAddOpen(false)}
          onSaved={async (t) => {
            setAddOpen(false);
            await done(t);
          }}
        />
      )}
      {txModal && (
        <TxModal
          account={txModal.account}
          direction={txModal.direction}
          onClose={() => setTxModal(null)}
          onSaved={async (t) => {
            setTxModal(null);
            await done(t);
          }}
        />
      )}
    </div>
  );
};

const AddAccountModal: React.FC<{ onClose: () => void; onSaved: (m: string) => void }> = ({ onClose, onSaved }) => {
  const [f, setF] = useState({ name: "", kind: "bank", opening_balance: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await createAccount({ ...f, opening_balance: Number(f.opening_balance) || 0 });
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }
  return (
    <AccModal title="Add Account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {err && <Notice tone="error">{err}</Notice>}
        <Field label="Account name *">
          <input required className={FIN.input} placeholder="e.g. HBL Current Account" value={f.name} maxLength={80} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={FIN.input} value={f.kind} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, kind: e.target.value })}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="wallet">Mobile wallet</option>
            </select>
          </Field>
          <Field label="Opening balance">
            <input type="number" step="0.01" className={FIN.input} value={f.opening_balance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, opening_balance: e.target.value })} />
          </Field>
        </div>
        <ModalActions onClose={onClose} busy={busy} submitLabel="Save Account" />
      </form>
    </AccModal>
  );
};

const TxModal: React.FC<{ account: CashAccount; direction: "in" | "out"; onClose: () => void; onSaved: (m: string) => void }> = ({
  account,
  direction,
  onClose,
  onSaved,
}) => {
  const [f, setF] = useState({ amount: "", tx_date: isoToday(), description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await addTransaction(account.id, { ...f, amount: Number(f.amount), direction });
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }
  return (
    <AccModal title={`${direction === "in" ? "Money In" : "Money Out"} - ${account.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {err && <Notice tone="error">{err}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *">
            <input required type="number" min="0" step="0.01" className={FIN.input} value={f.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label="Date *">
            <input required type="date" className={FIN.input} value={f.tx_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, tx_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Description">
          <input className={FIN.input} placeholder={direction === "in" ? "e.g. Payment from AR Food" : "e.g. Office rent"} value={f.description} maxLength={200} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, description: e.target.value })} />
        </Field>
        <ModalActions onClose={onClose} busy={busy} submitLabel="Save" />
      </form>
    </AccModal>
  );
};
