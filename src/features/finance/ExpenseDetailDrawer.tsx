import React from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FDrawer, FIN, AmountWordsInline } from "./financeUi";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

export const ExpenseDetailDrawer: React.FC<{
  expense: any | null;
  onClose: () => void;
}> = ({ expense, onClose }) => {

  const { company } = useSession();
  const { profile } = useCompanyProfile();

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: getDefaultCurrency(), minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-expense, #printable-expense * { visibility: visible; }
          #printable-expense {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important; padding: 20px;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <FDrawer open={!!expense} onClose={onClose} title="Expense Voucher" subtitle={expense?.category}>
        {expense && (
          <div className="space-y-4">

            {/* Top Actions */}
            <div className="no-print flex justify-end border-b border-[#2a2f37] pb-3">
              <button onClick={handlePrint} className={FIN.btnRose}>
                {"\u{1F5A8}\u{FE0F}"} Print / PDF Voucher
              </button>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-expense" className={`${FIN.paper} border-t-[3px] border-[#c99b3b] p-6`}>

              {/* Header */}
              <div className="mb-5 flex items-start justify-between border-b border-[#e4dccb] pb-5">
                <div>
                  <h1 className="text-[18px] font-semibold tracking-[0.24em] text-[#1b1d21]">EXPENSE VOUCHER</h1>
                  <p className="mt-1 font-mono text-[11px] text-[#8a7a52]">Voucher #: EXP-{expense.id.substring(0, 6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-[13px] font-semibold text-[#1b1d21]">
                    {profile?.legalName || company?.name || "Nexora Technologies"}
                  </h2>
                  {profile?.address && <p className="text-[11px] leading-relaxed text-slate-500">{[profile.address, profile.city].filter(Boolean).join(", ")}</p>}
                  {profile?.ntn && <p className="font-mono text-[11px] leading-relaxed text-slate-500">NTN: {profile.ntn}</p>}
                </div>
              </div>

              {/* Amount Box */}
              <div className="mb-6 rounded-xl border border-[#c99b3b]/60 bg-[#f6f0e0] p-5 text-center">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7a52]">Total Amount Paid</p>
                <p className="text-[28px] font-semibold leading-tight text-rose-700">{formatCurrency(expense.amount)}</p>
                <AmountWordsInline amount={expense.amount} currency={getDefaultCurrency()} className="mt-1.5" />
              </div>

              {/* Details Table */}
              <table className="mb-8 w-full">
                <tbody>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="w-1/3 py-2.5 text-[11px] text-slate-500">Date Paid</td>
                    <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{expense.expense_date}</td>
                  </tr>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="py-2.5 text-[11px] text-slate-500">Category</td>
                    <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{expense.category}</td>
                  </tr>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="py-2.5 text-[11px] text-slate-500">Description</td>
                    <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{expense.description || 'N/A'}</td>
                  </tr>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="py-2.5 text-[11px] text-slate-500">Payment Method</td>
                    <td className="py-2.5 text-right text-[12px] font-medium text-[#1b1d21]">{expense.payment_method}</td>
                  </tr>
                  <tr className="border-b border-[#e4dccb]">
                    <td className="py-2.5 text-[11px] text-slate-500">Reference No</td>
                    <td className="py-2.5 text-right font-mono text-[12px] font-medium text-[#1b1d21]">{expense.reference_no || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures Area */}
              <div className="mt-10 flex items-end justify-between pt-4">
                <div className="w-40 text-center">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="text-[11px] font-medium text-slate-800">Prepared By</p>
                  </div>
                </div>
                <div className="w-40 text-center">
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="text-[11px] font-medium text-slate-800">Approved By</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-[#e4dccb] pt-3 text-center">
                <p className="text-[10px] font-medium text-slate-400">This is a system generated expense voucher.</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

          </div>
        )}
      </FDrawer>
    </>
  );
};
