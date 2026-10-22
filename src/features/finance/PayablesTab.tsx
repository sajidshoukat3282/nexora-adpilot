import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import {
  createBill,
  deleteBill,
  deleteVendor,
  getAccounts,
  getBills,
  getVendors,
  payBill,
  saveVendor,
  type Bill,
  type CashAccount,
  type Vendor,
} from "@/lib/api/accounting";
import { FIN, SectionTitle, statusPill } from "./financeUi";
import { AccModal, Field, Kpi, ModalActions, Notice, TD, TH, errText, fmt, fmtMap } from "./accountingUi";
import { addDays, billStats, isoToday, outstanding } from "./accountingTools";

type Msg = { tone: "ok" | "error"; text: string } | null;
const METHODS = ["Bank Transfer", "IBFT / Online Transfer", "Cash", "Cheque", "Credit Card"];
const CATEGORIES = ["Media Owner / Rent", "Printing & Production", "Maintenance & Repair", "Utilities", "Services", "Other"];

export const PayablesTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"bills" | "vendors">("bills");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "paid">("open");
  const [msg, setMsg] = useState<Msg>(null);

  const [vendorModal, setVendorModal] = useState<Vendor | "new" | null>(null);
  const [billModal, setBillModal] = useState(false);
  const [payModal, setPayModal] = useState<Bill | null>(null);

  const cur = getDefaultCurrency();

  const load = useCallback(async () => {
    try {
      const [v, b, a] = await Promise.all([getVendors(), getBills(), getAccounts()]);
      setVendors(v);
      setBills(b);
      setAccounts(a);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => billStats(bills), [bills]);
  const shown = bills.filter((b) =>
    filter === "all" ? true : filter === "open" ? b.status !== "paid" : filter === "overdue" ? b.status === "overdue" : b.status === "paid",
  );

  const done = async (text: string) => {
    setMsg({ tone: "ok", text });
    await load();
    onChanged?.();
  };

  async function removeBill(b: Bill) {
    if (!window.confirm(`Delete bill ${b.bill_number || ""} from ${b.vendor_name}?`)) return;
    try {
      const r = await deleteBill(b.id);
      await done(r.message);
    } catch (e) {
      setMsg({ tone: "error", text: errText(e) });
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <SectionTitle>Payables</SectionTitle>
          <p className="mt-1 text-[11px] text-zinc-500">Bills you owe to media owners, printers and other suppliers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={FIN.btnGhost} onClick={() => setVendorModal("new")}>Add Vendor</button>
          <button className={FIN.btnGold} onClick={() => (vendors.length ? setBillModal(true) : setVendorModal("new"))}>
            Add Bill
          </button>
        </div>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Total payable" value={fmtMap(stats.due, cur)} tone="gold" hint={`${stats.openCount} open bills`} />
        <Kpi label="Overdue" value={fmtMap(stats.overdue, cur)} tone="rose" hint={`${stats.overdueCount} bills`} />
        <Kpi label="Due in 7 days" value={fmtMap(stats.soon, cur)} tone="amber" />
        <Kpi label="Vendors" value={String(vendors.length)} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[#2a2f37]">
        {(["bills", "vendors"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-3 py-2 text-[11px] font-semibold ${
              view === v ? "border-[#d9b45a] text-[#f1d68a]" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {v === "bills" ? `Bills (${bills.length})` : `Vendors (${vendors.length})`}
          </button>
        ))}
        {view === "bills" && (
          <select
            className={`${FIN.input} mb-1 ml-auto !w-auto`}
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as typeof filter)}
          >
            <option value="open">Open bills</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="py-6 text-center text-[12px] text-zinc-500">Loading...</p>
      ) : view === "bills" ? (
        shown.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-zinc-500">
            {bills.length === 0 ? "No bills yet. Click Add Bill to record what you owe a supplier." : "No bills in this view."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#2a2f37]">
                  <th className={TH}>Vendor</th>
                  <th className={TH}>Bill No</th>
                  <th className={TH}>Due</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={`${TH} text-right`}>Balance</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d2128]">
                {shown.map((b) => {
                  const pill = statusPill(b.status === "paid" ? "paid" : b.status === "overdue" ? "overdue" : "pending");
                  return (
                    <tr key={b.id}>
                      <td className={`${TD} font-medium text-zinc-100`}>{b.vendor_name}</td>
                      <td className={`${TD} text-zinc-400`}>{b.bill_number || "-"}</td>
                      <td className={`${TD} text-zinc-300`}>{b.due_date}</td>
                      <td className={`${TD} text-right text-zinc-300`}>{fmt(b.total_amount, b.currency)}</td>
                      <td className={`${TD} text-right font-semibold text-[#f1d68a]`}>{fmt(outstanding(b), b.currency)}</td>
                      <td className={TD}>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${pill.cls}`}>
                          <i className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                          {b.status}
                        </span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex justify-end gap-1.5">
                          {b.status !== "paid" && (
                            <button className={`${FIN.btnGhost} !px-2 !py-1`} onClick={() => setPayModal(b)}>
                              Pay
                            </button>
                          )}
                          {b.amount_paid === 0 && (
                            <button className={`${FIN.btnGhost} !px-2 !py-1 !text-rose-300`} onClick={() => removeBill(b)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : vendors.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-zinc-500">No vendors yet. Click Add Vendor to add your first supplier.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#2a2f37]">
                <th className={TH}>Vendor</th>
                <th className={TH}>Category</th>
                <th className={TH}>Contact</th>
                <th className={`${TH} text-right`}>Bills</th>
                <th className={`${TH} text-right`}>Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2128]">
              {vendors.map((v) => (
                <tr key={v.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => setVendorModal(v)}>
                  <td className={`${TD} font-medium text-zinc-100`}>{v.name}</td>
                  <td className={`${TD} text-zinc-400`}>{v.category || "-"}</td>
                  <td className={`${TD} text-zinc-400`}>{[v.contact_name, v.phone].filter(Boolean).join(" - ") || "-"}</td>
                  <td className={`${TD} text-right text-zinc-300`}>{v.bill_count}</td>
                  <td className={`${TD} text-right font-semibold text-[#f1d68a]`}>{fmt(v.outstanding, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vendorModal && (
        <VendorModal
          vendor={vendorModal === "new" ? null : vendorModal}
          onClose={() => setVendorModal(null)}
          onSaved={async (text) => {
            setVendorModal(null);
            await done(text);
          }}
        />
      )}
      {billModal && (
        <BillModal
          vendors={vendors}
          onClose={() => setBillModal(false)}
          onSaved={async (text) => {
            setBillModal(false);
            await done(text);
          }}
        />
      )}
      {payModal && (
        <PayModal
          bill={payModal}
          accounts={accounts}
          onClose={() => setPayModal(null)}
          onSaved={async (text) => {
            setPayModal(null);
            await done(text);
          }}
        />
      )}
    </div>
  );
};

/* ---------------- modals ---------------- */

const VendorModal: React.FC<{ vendor: Vendor | null; onClose: () => void; onSaved: (msg: string) => void }> = ({ vendor, onClose, onSaved }) => {
  const [f, setF] = useState({
    name: vendor?.name ?? "",
    contact_name: vendor?.contact_name ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    ntn: vendor?.ntn ?? "",
    category: vendor?.category ?? CATEGORIES[0],
    notes: vendor?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await saveVendor(f, vendor?.id);
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }

  async function remove() {
    if (!vendor || !window.confirm(`Delete vendor ${vendor.name}?`)) return;
    try {
      const r = await deleteVendor(vendor.id);
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
    }
  }

  return (
    <AccModal title={vendor ? "Edit Vendor" : "Add Vendor"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {err && <Notice tone="error">{err}</Notice>}
        <Field label="Vendor name *">
          <input required className={FIN.input} value={f.name} onChange={set("name")} maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className={FIN.input} value={f.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Contact person">
            <input className={FIN.input} value={f.contact_name} onChange={set("contact_name")} maxLength={100} />
          </Field>
          <Field label="Phone">
            <input className={FIN.input} value={f.phone} onChange={set("phone")} maxLength={40} />
          </Field>
          <Field label="Email">
            <input type="email" className={FIN.input} value={f.email} onChange={set("email")} maxLength={120} />
          </Field>
        </div>
        <Field label="NTN / tax number (optional)">
          <input className={FIN.input} value={f.ntn} onChange={set("ntn")} maxLength={30} />
        </Field>
        <Field label="Notes">
          <input className={FIN.input} value={f.notes} onChange={set("notes")} maxLength={300} />
        </Field>
        <ModalActions
          onClose={onClose}
          busy={busy}
          submitLabel="Save Vendor"
          extra={vendor && vendor.bill_count === 0 ? <button type="button" className={`${FIN.btnText} !text-rose-300`} onClick={remove}>Delete</button> : null}
        />
      </form>
    </AccModal>
  );
};

const BillModal: React.FC<{ vendors: Vendor[]; onClose: () => void; onSaved: (msg: string) => void }> = ({ vendors, onClose, onSaved }) => {
  const [f, setF] = useState({
    vendor_id: vendors[0]?.id ?? "",
    bill_number: "",
    bill_date: isoToday(),
    due_date: addDays(isoToday(), 30),
    subtotal: "",
    tax_amount: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cur = getDefaultCurrency();
  const total = (Number(f.subtotal) || 0) + (Number(f.tax_amount) || 0);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await createBill({ ...f, subtotal: Number(f.subtotal), tax_amount: Number(f.tax_amount) || 0, currency: cur });
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }

  return (
    <AccModal title="Add Bill" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {err && <Notice tone="error">{err}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor *">
            <select required className={FIN.input} value={f.vendor_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, vendor_id: e.target.value })}>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Bill / invoice no.">
            <input className={FIN.input} value={f.bill_number} onChange={set("bill_number")} maxLength={60} />
          </Field>
          <Field label="Bill date *">
            <input required type="date" className={FIN.input} value={f.bill_date} onChange={set("bill_date")} />
          </Field>
          <Field label="Due date *">
            <input required type="date" className={FIN.input} value={f.due_date} onChange={set("due_date")} />
          </Field>
          <Field label={`Amount before tax (${cur}) *`}>
            <input required type="number" min="0" step="0.01" className={FIN.input} value={f.subtotal} onChange={set("subtotal")} />
          </Field>
          <Field label="Tax amount (optional)">
            <input type="number" min="0" step="0.01" className={FIN.input} value={f.tax_amount} onChange={set("tax_amount")} />
          </Field>
        </div>
        <Field label="Notes">
          <input className={FIN.input} value={f.notes} onChange={set("notes")} maxLength={300} />
        </Field>
        <p className="text-[12px] text-zinc-400">
          Total bill: <b className="text-[#f1d68a]">{fmt(total, cur)}</b>
        </p>
        <ModalActions onClose={onClose} busy={busy} submitLabel="Save Bill" />
      </form>
    </AccModal>
  );
};

const PayModal: React.FC<{ bill: Bill; accounts: CashAccount[]; onClose: () => void; onSaved: (msg: string) => void }> = ({
  bill,
  accounts,
  onClose,
  onSaved,
}) => {
  const due = outstanding(bill);
  const [f, setF] = useState({ amount: String(due), payment_date: isoToday(), method: METHODS[0], account_id: "", reference_no: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await payBill(bill.id, { ...f, amount: Number(f.amount) });
      onSaved(r.message);
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }

  return (
    <AccModal title={`Pay ${bill.vendor_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {err && <Notice tone="error">{err}</Notice>}
        <p className="text-[12px] text-zinc-400">
          Bill {bill.bill_number || ""} - balance due <b className="text-[#f1d68a]">{fmt(due, bill.currency)}</b>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *">
            <input required type="number" min="0" step="0.01" className={FIN.input} value={f.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label="Date *">
            <input required type="date" className={FIN.input} value={f.payment_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, payment_date: e.target.value })} />
          </Field>
          <Field label="Payment method">
            <select className={FIN.input} value={f.method} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, method: e.target.value })}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Paid from account (optional)">
            <select className={FIN.input} value={f.account_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, account_id: e.target.value })}>
              <option value="">Do not track</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Reference no (optional)">
          <input className={FIN.input} value={f.reference_no} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, reference_no: e.target.value })} maxLength={60} />
        </Field>
        <ModalActions onClose={onClose} busy={busy} submitLabel="Save Payment" />
      </form>
    </AccModal>
  );
};
