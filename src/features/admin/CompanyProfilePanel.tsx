import { useSession } from "@/hooks/useSession";
import React, { useEffect, useState } from "react";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import type { CompanyProfileInput } from "@/lib/api/companyProfile";
import { FIN, SectionTitle } from "../finance/financeUi";

const EMPTY: CompanyProfileInput = {
  legalName: "",
  ownerName: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Pakistan",
  phone: "",
  email: "",
  website: "",
  ntn: "",
  strn: "",
  bankName: "",
  bankAccountTitle: "",
  bankIban: "",
  invoicePrefix: "INV-",
  defaultTaxRate: 18,
  paymentTermsDays: 30,
  invoiceFooter: "",
};

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ label, required, hint, children, wide }) => (
  <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
    <span className={FIN.label}>
      {label}
      {required && <span className="text-rose-400"> *</span>}
    </span>
    <div className="mt-1">{children}</div>
    {hint && <span className="mt-1 block text-[10px] text-zinc-500">{hint}</span>}
  </label>
);

export const CompanyProfilePanel: React.FC = () => {
  const { profile, loading, save } = useCompanyProfile();
  const { refresh } = useSession();
  const [form, setForm] = useState<CompanyProfileInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (profile) {
      const { complete: _complete, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  const set = <K extends keyof CompanyProfileInput>(
    key: K,
    value: CompanyProfileInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const text =
    (key: keyof CompanyProfileInput) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      set(key, event.target.value as never);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await save(form);
      await refresh(); // the company name is shown in many places, so reload it everywhere
      setMessage({ ok: true, text: "Company profile saved." });
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Unable to save the profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={`${FIN.panel} p-4 mb-4`} id="company-profile">
      <div className="flex items-start justify-between gap-3 mb-1">
        <SectionTitle>Company Profile</SectionTitle>
        {profile && !profile.complete && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            Incomplete
          </span>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">
        These details are printed on your invoices and on every report. They are
        saved for your company only and are never visible to other companies.
      </p>

      {loading && !profile && (
        <p className="text-[11px] text-zinc-500 mb-3">Loading...</p>
      )}

      <h4 className="mb-2 mt-1 border-b border-[#22262d] pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">
        Business details
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Field label="Company name" required>
          <input className={FIN.input} value={form.legalName} onChange={text("legalName")} maxLength={120} />
        </Field>
        <Field label="Owner / authorised person" hint="Shown at the top right of the dashboard.">
          <input className={FIN.input} value={form.ownerName} onChange={text("ownerName")} maxLength={80} />
        </Field>
        <Field label="Address" required wide>
          <input className={FIN.input} value={form.address} onChange={text("address")} maxLength={300} />
        </Field>
        <Field label="City" required>
          <input className={FIN.input} value={form.city} onChange={text("city")} maxLength={80} />
        </Field>
        <Field label="Province / State">
          <input className={FIN.input} value={form.province} onChange={text("province")} maxLength={80} />
        </Field>
        <Field label="Postal code">
          <input className={FIN.input} value={form.postalCode} onChange={text("postalCode")} maxLength={20} />
        </Field>
        <Field label="Country">
          <input className={FIN.input} value={form.country} onChange={text("country")} maxLength={80} />
        </Field>
        <Field label="Phone" required>
          <input className={FIN.input} value={form.phone} onChange={text("phone")} maxLength={40} />
        </Field>
        <Field label="Company email">
          <input className={FIN.input} type="email" value={form.email} onChange={text("email")} maxLength={120} />
        </Field>
        <Field label="Website">
          <input className={FIN.input} value={form.website} onChange={text("website")} maxLength={120} />
        </Field>
      </div>

      <h4 className="mb-2 mt-1 border-b border-[#22262d] pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">
        Tax registration
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Field label="NTN">
          <input className={FIN.input} value={form.ntn} onChange={text("ntn")} maxLength={30} />
        </Field>
        <Field label="Sales tax registration no. (STRN)">
          <input className={FIN.input} value={form.strn} onChange={text("strn")} maxLength={30} />
        </Field>
      </div>

      <h4 className="mb-2 mt-1 border-b border-[#22262d] pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">
        Bank details (printed on invoices)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Field label="Bank name">
          <input className={FIN.input} value={form.bankName} onChange={text("bankName")} maxLength={80} />
        </Field>
        <Field label="Account title">
          <input className={FIN.input} value={form.bankAccountTitle} onChange={text("bankAccountTitle")} maxLength={120} />
        </Field>
        <Field label="IBAN / account number" wide>
          <input className={FIN.input} value={form.bankIban} onChange={text("bankIban")} maxLength={40} />
        </Field>
      </div>

      <h4 className="mb-2 mt-1 border-b border-[#22262d] pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">
        Invoice settings
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Field label="Invoice prefix" hint="For example NEX- gives NEX-0001.">
          <input className={FIN.input} value={form.invoicePrefix} onChange={text("invoicePrefix")} maxLength={10} />
        </Field>
        <Field label="Default sales tax (%)">
          <input
            className={FIN.input}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.defaultTaxRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("defaultTaxRate", Number(e.target.value))}
          />
        </Field>
        <Field label="Payment terms (days)">
          <input
            className={FIN.input}
            type="number"
            min={0}
            max={365}
            step={1}
            value={form.paymentTermsDays}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("paymentTermsDays", Math.round(Number(e.target.value)))}
          />
        </Field>
        <Field label="Invoice footer note" wide>
          <input className={FIN.input} value={form.invoiceFooter} onChange={text("invoiceFooter")} maxLength={300} />
        </Field>
      </div>

      <p className="text-[10px] text-zinc-500 mb-3">
        Please confirm tax rates and which details must appear on an invoice with
        your accountant.
      </p>

      <div className="flex items-center gap-3">
        <button type="submit" className={FIN.btnGold} disabled={saving}>
          {saving ? "Saving..." : "Save company profile"}
        </button>
        {message && (
          <span className={`text-xs ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
};
