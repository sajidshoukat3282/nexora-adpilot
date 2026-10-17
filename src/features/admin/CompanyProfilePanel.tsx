import React, { useEffect, useState } from "react";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import type { CompanyProfileInput } from "@/lib/api/companyProfile";

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
    <span className="text-xs font-semibold text-ink-300">
      {label}
      {required && <span className="text-signal-red"> *</span>}
    </span>
    <div className="mt-1">{children}</div>
    {hint && <span className="text-[11px] text-ink-500 mt-1 block">{hint}</span>}
  </label>
);

export const CompanyProfilePanel: React.FC = () => {
  const { profile, loading, save } = useCompanyProfile();
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
    <form onSubmit={onSubmit} className="panel p-5 mb-5" id="company-profile">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-semibold text-ink-50">Company Profile</h3>
        {profile && !profile.complete && (
          <span className="badge bg-signal-amber/10 text-signal-amber border border-signal-amber/25">
            Incomplete
          </span>
        )}
      </div>
      <p className="text-xs text-ink-500 mb-5">
        These details are printed on your invoices and on every report. They are
        saved for your company only and are never visible to other companies.
      </p>

      {loading && !profile && (
        <p className="text-xs text-ink-500 mb-3">Loading...</p>
      )}

      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 mb-2">
        Business details
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Company name" required>
          <input className="input" value={form.legalName} onChange={text("legalName")} maxLength={120} />
        </Field>
        <Field label="Owner / authorised person" hint="Shown at the top right of the dashboard.">
          <input className="input" value={form.ownerName} onChange={text("ownerName")} maxLength={80} />
        </Field>
        <Field label="Address" required wide>
          <input className="input" value={form.address} onChange={text("address")} maxLength={300} />
        </Field>
        <Field label="City" required>
          <input className="input" value={form.city} onChange={text("city")} maxLength={80} />
        </Field>
        <Field label="Province / State">
          <input className="input" value={form.province} onChange={text("province")} maxLength={80} />
        </Field>
        <Field label="Postal code">
          <input className="input" value={form.postalCode} onChange={text("postalCode")} maxLength={20} />
        </Field>
        <Field label="Country">
          <input className="input" value={form.country} onChange={text("country")} maxLength={80} />
        </Field>
        <Field label="Phone" required>
          <input className="input" value={form.phone} onChange={text("phone")} maxLength={40} />
        </Field>
        <Field label="Company email">
          <input className="input" type="email" value={form.email} onChange={text("email")} maxLength={120} />
        </Field>
        <Field label="Website">
          <input className="input" value={form.website} onChange={text("website")} maxLength={120} />
        </Field>
      </div>

      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 mb-2">
        Tax registration
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="NTN">
          <input className="input" value={form.ntn} onChange={text("ntn")} maxLength={30} />
        </Field>
        <Field label="Sales tax registration no. (STRN)">
          <input className="input" value={form.strn} onChange={text("strn")} maxLength={30} />
        </Field>
      </div>

      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 mb-2">
        Bank details (printed on invoices)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Bank name">
          <input className="input" value={form.bankName} onChange={text("bankName")} maxLength={80} />
        </Field>
        <Field label="Account title">
          <input className="input" value={form.bankAccountTitle} onChange={text("bankAccountTitle")} maxLength={120} />
        </Field>
        <Field label="IBAN / account number" wide>
          <input className="input" value={form.bankIban} onChange={text("bankIban")} maxLength={40} />
        </Field>
      </div>

      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 mb-2">
        Invoice settings
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Invoice prefix" hint="For example NEX- gives NEX-0001.">
          <input className="input" value={form.invoicePrefix} onChange={text("invoicePrefix")} maxLength={10} />
        </Field>
        <Field label="Default sales tax (%)">
          <input
            className="input"
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
            className="input"
            type="number"
            min={0}
            max={365}
            step={1}
            value={form.paymentTermsDays}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("paymentTermsDays", Math.round(Number(e.target.value)))}
          />
        </Field>
        <Field label="Invoice footer note" wide>
          <input className="input" value={form.invoiceFooter} onChange={text("invoiceFooter")} maxLength={300} />
        </Field>
      </div>

      <p className="text-[11px] text-ink-500 mb-4">
        Please confirm tax rates and which details must appear on an invoice with
        your accountant.
      </p>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save company profile"}
        </button>
        {message && (
          <span className={`text-xs ${message.ok ? "text-signal-green" : "text-signal-red"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
};
