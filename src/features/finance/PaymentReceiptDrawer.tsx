import React from "react";      
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FDrawer, FIN, AmountWordsInline } from "./financeUi";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

export const PaymentReceiptDrawer: React.FC<{
  payment: any | null;
  onClose: () => void;
}> = ({ payment, onClose }) => {

  const { company } = useSession();
  const { profile } = useCompanyProfile();

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number, currency = getDefaultCurrency()) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <>
      {/* CSS for Print View */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important; padding: 20px;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <FDrawer open={!!payment} onClose={onClose} title="Payment Receipt" subtitle={payment?.client_name}>
        {payment && (
          <div className="space-y-4">

            {/* Top Actions (Hide during print) */}
            <div className="no-print flex justify-end border-b border-[#2a2f37] pb-3">
              <button onClick={handlePrint} className={FIN.btnGold}>
                ðŸ–¨ï¸ Print / PDF Receipt
              </button>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-receipt" className={`${FIN.paper} border-t-[3px] border-[#c99b3b] p-6`}>

              {/* Header with Dynamic Company Details */}
              <div className="mb-5 flex items-start justify-between border-b border-[#e4dccb] pb-5">
                <div>
                  <h1 className="text-[18px] font-semibold tracking-[0.24em] text-[#1b1d21]">PAYMENT RECEIPT</h1>
                  <p className="mt-1 font-mono text-[11px] text-[#8a7a52]">Receipt #: RCPT-{payment.id.substring(0, 6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  {/* Asli Company Details Yahan Aayengi */}
                  <h2 className="text-[13px] font-semibold text-[#1b1d21]">
                    {profile?.legalName || company?.name || "Nexora Technologies"}
                  </h2>
                  {profile?.address && (
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {profile?.phone && <p className="text-[11px] leading-relaxed text-slate-500">Tel: {profile.phone}</p>}
                  {profile?.ntn && <p className="font-mono text-[11px] leading-relaxed text-slate-500">NTN: {profile.ntn}</p>}
                  {profile?.strn && <p className="font-mono text-[11px] leading-relaxed text-slate-500">STRN: {profile.strn}</p>}
                  {profile?.email && <p className="text-[11px] leading-relaxed text-slate-500">{profile.email}</p>}
                </div>
              </div>

              {/* Details */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#a8914f]">Received From</p>
                  <p className="text-[14px] font-semibold text-[#1b1d21]">{payment.client_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px]"><span className="text-slate-500">Date:</span> <span className="font-medium text-[#1b1d21]">{payment.payment_date}</span></p>
                  <p className="text-[11px]"><span className="text-slate-500">Invoice Ref:</span> <span className="font-medium text-[#1b1d21]">{payment.invoice_number}</span></p>
                </div>
              </div>

              {/* Amount Box */}
              <div className="mb-6 rounded-xl border border-[#c99b3b]/60 bg-[#f6f0e0] p-5 text-center">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7a52]">Amount Received</p>
                <p className="text-[28px] font-semibold leading-tight text-emerald-700">{formatCurrency(payment.amount, payment.currency || getDefaultCurrency())}</p>
                <AmountWordsInline amount={payment.amount} currency={payment.currency || getDefaultCurrency()} className="mt-1.5" />
              </div>

              {/* Payment Details Table */}
              <div className="mb-8">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-[#e4dccb]">
                      <td className="py-2.5 text-[11px] text-slate-500">Payment Method</td>
                      <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{payment.payment_method}</td>
                    </tr>
                    <tr className="border-b border-[#e4dccb]">
                      <td className="py-2.5 text-[11px] text-slate-500">Received By</td>
                      <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{payment.received_by || 'Authorized Staff'}</td>
                    </tr>
                    <tr className="border-b border-[#e4dccb]">
                      <td className="py-2.5 text-[11px] text-slate-500">Reference No</td>
                      <td className="py-2.5 text-right font-mono text-[12px] font-medium text-[#1b1d21]">{payment.reference_no || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Stamp Area */}
              <div className="mt-10 flex items-end justify-between pt-4">
                <div className="w-40 text-center">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="text-[11px] font-medium text-slate-800">Client Signature</p>
                  </div>
                </div>

                <div className="w-40 text-center">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="text-[11px] font-medium text-slate-800">Received By Signature</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-[#e4dccb] pt-3 text-center">
                <p className="text-[10px] font-medium text-slate-400">This is a system generated payment receipt.</p>
                <p className="text-[10px] text-slate-400">No signature is required if paid via electronic transfer.</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

          </div>
        )}
      </FDrawer>
    </>
  );
};
