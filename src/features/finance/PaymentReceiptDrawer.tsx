import React from "react";
import { Drawer } from "@/components/ui/Drawer";
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

  const formatCurrency = (amount: number, currency = 'PKR') => {
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
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Drawer open={!!payment} onClose={onClose} title="Payment Receipt" subtitle={payment?.client_name}>
        {payment && (
          <div className="space-y-6">
            
            {/* Top Actions (Hide during print) */}
            <div className="flex justify-end pb-3 border-b border-gray-700 no-print">
              <button onClick={handlePrint} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition flex items-center gap-1 font-medium">
                🖨️ Print / PDF Receipt
              </button>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-receipt" className="bg-white text-slate-900 p-8 rounded-lg shadow-sm">
              
              {/* Header with Dynamic Company Details */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">PAYMENT RECEIPT</h1>
                  <p className="text-slate-500 font-mono mt-1 text-sm">Receipt #: RCPT-{payment.id.substring(0, 6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  {/* Asli Company Details Yahan Aayengi */}
                  <h2 className="text-lg font-bold text-slate-800">
                    {profile?.legalName || company?.name || "Nexora Technologies"}
                  </h2>
                  {profile?.address && (
                    <p className="text-sm text-slate-500">
                      {[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {profile?.phone && <p className="text-sm text-slate-500">Tel: {profile.phone}</p>}
                  {profile?.ntn && <p className="text-sm text-slate-500 font-mono">NTN: {profile.ntn}</p>}
                  {profile?.strn && <p className="text-sm text-slate-500 font-mono">STRN: {profile.strn}</p>}
                  {profile?.email && <p className="text-sm text-slate-500">{profile.email}</p>}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received From</p>
                  <p className="font-bold text-slate-900 text-lg">{payment.client_name}</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm"><span className="text-slate-500">Date:</span> <span className="font-medium">{payment.payment_date}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Invoice Ref:</span> <span className="font-medium">{payment.invoice_number}</span></p>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-center">
                <p className="text-sm text-slate-500 mb-1">Amount Received</p>
                <p className="text-4xl font-bold text-emerald-600">{formatCurrency(payment.amount, payment.currency || 'PKR')}</p>
              </div>

              {/* Payment Details Table */}
              <div className="mb-12">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-sm text-slate-500">Payment Method</td>
                      <td className="py-3 text-sm text-slate-900 font-medium text-right">{payment.payment_method}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-sm text-slate-500">Received By</td>
                      <td className="py-3 text-sm text-slate-900 font-medium text-right">{payment.received_by || 'Authorized Staff'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-sm text-slate-500">Reference No</td>
                      <td className="py-3 text-sm text-slate-900 font-medium text-right font-mono">{payment.reference_no || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Stamp Area */}
              <div className="flex justify-between items-end mt-16 pt-8">
                <div className="text-center w-48">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm font-medium text-slate-800">Client Signature</p>
                  </div>
                </div>
                
                <div className="text-center w-48">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm font-medium text-slate-800">Received By Signature</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 text-center border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-400 font-medium">This is a system generated payment receipt.</p>
                <p className="text-xs text-slate-400">No signature is required if paid via electronic transfer.</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

          </div>
        )}
      </Drawer>
    </>
  );
};
