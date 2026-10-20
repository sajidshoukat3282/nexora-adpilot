import React, { useEffect, useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FDrawer, FIN, AmountWordsInline, statusPill } from "./financeUi";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import {
  QrSvg,
  buildInvoiceMessage,
  buildPaymentQrText,
  hasBankDetails,
  mailtoUrl,
  normalizePhone,
  whatsappUrl,
} from "./financeTools";

export const InvoiceDetailDrawer: React.FC<{
  invoice: any | null;
  onClose: () => void;
  onRecordPayment?: () => void;
  client?: any | null;
}> = ({ invoice, onClose, onRecordPayment, client }) => {
  const [copied, setCopied] = useState(false);
  const { profile } = useCompanyProfile();
  const [reminders, setReminders] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [remindMsg, setRemindMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadReminders = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoice-reminders?invoice_id=${encodeURIComponent(invoiceId)}`);
      const data = await res.json();
      if (data.ok) setReminders(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setRemindMsg(null);
    setReminders([]);
    if (invoice?.id) loadReminders(invoice.id);
  }, [invoice?.id]);

  // Safe Data Access (Kyunke DB se snake_case aa raha hai)
  const totalAmount = invoice?.total_amount || 0;
  const amountPaid = invoice?.amount_paid || 0;
  const balanceDue = totalAmount - amountPaid;
  const currency = invoice?.currency || getDefaultCurrency();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
  };

  const clientPhone = normalizePhone(client?.phone ?? invoice?.client_phone);
  const clientEmail = String(client?.email ?? invoice?.client_email ?? "").trim();
  const companyName = profile?.legalName || "Nexora Technologies";
  const showBank = hasBankDetails(profile);

  const shareMessage = () =>
    buildInvoiceMessage({
      clientName: invoice?.client_name ?? "",
      companyName,
      invoiceNumber: invoice?.invoice_number ?? "",
      dueDate: invoice?.due_date ?? "",
      total: formatCurrency(totalAmount),
      paid: formatCurrency(amountPaid),
      balance: formatCurrency(balanceDue),
      profile,
    });

  const handleWhatsApp = () => {
    window.open(whatsappUrl(clientPhone, shareMessage()), "_blank", "noopener");
  };

  const handleEmail = () => {
    window.location.href = mailtoUrl(
      clientEmail,
      `Invoice ${invoice?.invoice_number ?? ""} from ${companyName}`,
      shareMessage(),
    );
  };

  const REMIND_ERRORS: Record<string, string> = {
    CLIENT_EMAIL_MISSING: "This client has no email address saved.",
    EMAIL_PROVIDER_NOT_CONFIGURED: "Email sending is not configured on the server.",
    ALREADY_PAID: "This invoice is already paid.",
    NOT_FOUND: "Invoice not found.",
  };

  const handleSendReminder = async () => {
    if (!invoice || sending) return;
    if (!window.confirm(`Email a payment reminder for ${invoice.invoice_number} to ${clientEmail || "the client"}?`)) return;
    setSending(true);
    setRemindMsg(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/remind`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setRemindMsg({ ok: true, text: `Reminder sent to ${data.to}` });
        loadReminders(invoice.id);
      } else {
        setRemindMsg({ ok: false, text: REMIND_ERRORS[data.error] || "Could not send the reminder." });
      }
    } catch {
      setRemindMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* CSS for Print View */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <FDrawer open={!!invoice} onClose={onClose} title={invoice?.invoice_number ?? ""} subtitle={invoice?.client_name}>
        {invoice && (
          <div className="space-y-4">

            {/* Top Actions (Hide during print) */}
            <div className="no-print flex items-center justify-between border-b border-[#2a2f37] pb-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusPill(invoice.status).cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusPill(invoice.status).dot}`} />
                {invoice.status.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyLink} className={FIN.btnGhost}>
                  {copied ? "✓ Copied" : "Share"}
                </button>
                <button onClick={handlePrint} className={FIN.btnGold}>
                  🖨️ Print / PDF
                </button>
              </div>
            </div>

            {/* Share / remind row (hidden during print) */}
            <div className="no-print flex flex-wrap items-center gap-2">
              <button onClick={handleWhatsApp} className={FIN.btnGhost} title={clientPhone ? `WhatsApp +${clientPhone}` : "Choose a contact in WhatsApp"}>
                💬 WhatsApp
              </button>
              <button onClick={handleEmail} className={FIN.btnGhost} title={clientEmail || "Opens your email app"}>
                ✉️ Email
              </button>
              {balanceDue > 0 && (
                <button onClick={handleSendReminder} disabled={sending} className={`${FIN.btnGhost} disabled:opacity-50`}>
                  {sending ? "Sending…" : "🔔 Send Reminder"}
                </button>
              )}
            </div>
            {remindMsg && (
              <p className={`no-print text-[11px] ${remindMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{remindMsg.text}</p>
            )}

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-invoice" className={`${FIN.paper} border-t-[3px] border-[#c99b3b] p-6`}>

              {/* Header: Company & Invoice Info */}
              <div className="mb-5 flex items-start justify-between border-b border-[#e4dccb] pb-5">
                <div>
                  <h1 className="text-[20px] font-semibold tracking-[0.28em] text-[#1b1d21]">INVOICE</h1>
                  <p className="mt-1 font-mono text-[11px] text-[#8a7a52]">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-[13px] font-semibold text-[#1b1d21]">Nexora Technologies</h2>
                  <p className="text-[11px] leading-relaxed text-slate-500">123 Business Avenue, Lahore</p>
                  <p className="text-[11px] leading-relaxed text-slate-500">NTN: 1234567-8 | STRN: 0987654321</p>
                  <p className="text-[11px] leading-relaxed text-slate-500">hello@nexoratechnologies.pk</p>
                </div>
              </div>

              {/* Bill To & Dates */}
              <div className="mb-6 flex justify-between">
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#a8914f]">Billed To</p>
                  <p className="text-[13px] font-semibold text-[#1b1d21]">{invoice.client_name}</p>
                  <p className="text-[11px] text-slate-500">{invoice.client_email || 'Client Email'}</p>
                  <p className="text-[11px] text-slate-500">{invoice.client_address || 'Client Address'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px]"><span className="text-slate-500">Issue Date:</span> <span className="font-medium text-[#1b1d21]">{invoice.issue_date}</span></p>
                  <p className="text-[11px]"><span className="text-slate-500">Due Date:</span> <span className="font-medium text-[#1b1d21]">{invoice.due_date}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="mb-6 w-full">
                <thead>
                  <tr className="border-b border-[#1b1d21] text-left">
                    <th className="py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1b1d21]">Description</th>
                    <th className="py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1b1d21]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="py-3 text-[12px] text-slate-700">
                      Advertising Campaign Services <br/>
                      <span className="text-[10px] text-slate-500">Ref: Campaign ID {invoice.campaign_id || 'N/A'}</span>
                    </td>
                    <td className="py-3 text-right text-[12px] font-medium text-[#1b1d21]">{formatCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="mb-6 flex justify-end">
                <div className="w-full space-y-1.5 sm:w-3/5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium">Included</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-[#d9cfb8] pt-2 text-[13px] font-semibold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <AmountWordsInline amount={totalAmount} currency={currency} className="text-right" />
                  <div className="flex justify-between text-[12px] font-medium text-emerald-700">
                    <span>Amount Paid</span>
                    <span>-{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-[#c99b3b] pt-2 text-[15px] font-bold text-rose-700">
                    <span>Balance Due</span>
                    <span>{formatCurrency(balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details + QR */}
              {showBank && (
                <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-[#e4dccb] bg-[#f6f0e0] p-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#a8914f]">Payment Details</p>
                    {profile?.bankAccountTitle && <p className="text-[11px] text-slate-700"><span className="text-slate-500">Account Title:</span> <span className="font-medium">{profile.bankAccountTitle}</span></p>}
                    {profile?.bankName && <p className="text-[11px] text-slate-700"><span className="text-slate-500">Bank:</span> <span className="font-medium">{profile.bankName}</span></p>}
                    {profile?.bankIban && <p className="break-all font-mono text-[11px] text-slate-700"><span className="font-sans text-slate-500">IBAN:</span> <span className="font-medium">{profile.bankIban}</span></p>}
                    <p className="mt-1 text-[10px] text-slate-500">Reference: <span className="font-mono">{invoice.invoice_number}</span></p>
                  </div>
                  {balanceDue > 0 && (
                    <div className="shrink-0 text-center">
                      <QrSvg text={buildPaymentQrText(profile ?? {}, invoice.invoice_number, currency, balanceDue)} size={84} />
                      <p className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">Scan for details</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="mb-8">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#a8914f]">Notes</p>
                <p className="text-[11px] leading-relaxed text-slate-600">{invoice.notes || 'Payment is due within 15 days. Please transfer to our bank account.'}</p>
              </div>

              {/* Signatures & Stamp Area */}
              <div className="mt-10 flex items-end justify-between pt-4">
                <div className="w-40 text-center">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="text-[11px] font-medium text-slate-800">Authorized Signature</p>
                  </div>
                </div>

                <div className="flex h-20 w-28 items-center justify-center rounded-lg border-2 border-dashed border-[#d9cfb8] text-center text-[10px] text-[#b8ab88]">
                  Company Stamp
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-[#e4dccb] pt-3 text-center">
                <p className="text-[10px] font-medium text-slate-400">This is a system generated invoice.</p>
                <p className="text-[10px] text-slate-400">Thank you for your business!</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

            {/* Payment History (Hidden during print) */}
            <div className="no-print border-t border-[#2a2f37] pt-4">
              <h4 className="mb-2 text-[12px] font-semibold text-zinc-200">Payment History</h4>
              <p className="text-[12px] text-zinc-500">Total Received: <span className="font-semibold text-emerald-400">{formatCurrency(amountPaid)}</span></p>

              {reminders.length > 0 && (
                <div className="mt-3 rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Reminders sent</p>
                  <ul className="space-y-0.5">
                    {reminders.slice(0, 5).map((r: any) => (
                      <li key={r.id} className="flex justify-between text-[11px] text-zinc-400">
                        <span>{String(r.sent_at).slice(0, 16).replace("T", " ")} · {r.kind === "auto" ? "auto" : "manual"}</span>
                        <span className={r.status === "sent" ? "text-emerald-400" : "text-rose-400"}>{r.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onRecordPayment && balanceDue > 0 && (
                <button onClick={onRecordPayment} className={`${FIN.btnGold} mt-3 w-full`}>
                  Receive Payment
                </button>
              )}
            </div>

          </div>
        )}
      </FDrawer>
    </>
  );
};
