import React from "react";
import { Drawer } from "@/components/ui/Drawer";
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
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);
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
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Drawer open={!!expense} onClose={onClose} title="Expense Voucher" subtitle={expense?.category}>
        {expense && (
          <div className="space-y-6">
            
            {/* Top Actions */}
            <div className="flex justify-end pb-3 border-b border-gray-700 no-print">
              <button onClick={handlePrint} className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-500 transition flex items-center gap-1 font-medium">
                🖨️ Print / PDF Voucher
              </button>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-expense" className="bg-white text-slate-900 p-8 rounded-lg shadow-sm">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">EXPENSE VOUCHER</h1>
                  <p className="text-slate-500 font-mono mt-1 text-sm">Voucher #: EXP-{expense.id.substring(0, 6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-800">
                    {profile?.legalName || company?.name || "Nexora Technologies"}
                  </h2>
                  {profile?.address && <p className="text-sm text-slate-500">{[profile.address, profile.city].filter(Boolean).join(", ")}</p>}
                  {profile?.ntn && <p className="text-sm text-slate-500 font-mono">NTN: {profile.ntn}</p>}
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-center">
                <p className="text-sm text-slate-500 mb-1">Total Amount Paid</p>
                <p className="text-4xl font-bold text-rose-600">{formatCurrency(expense.amount)}</p>
              </div>

              {/* Details Table */}
              <table className="w-full mb-12">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-500 w-1/3">Date Paid</td>
                    <td className="py-3 text-sm text-slate-900 font-medium text-right">{expense.expense_date}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-500">Category</td>
                    <td className="py-3 text-sm text-slate-900 font-medium text-right">{expense.category}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-500">Description</td>
                    <td className="py-3 text-sm text-slate-900 font-medium text-right">{expense.description || 'N/A'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-500">Payment Method</td>
                    <td className="py-3 text-sm text-slate-900 font-medium text-right">{expense.payment_method}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-500">Reference No</td>
                    <td className="py-3 text-sm text-slate-900 font-medium text-right font-mono">{expense.reference_no || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures Area */}
              <div className="flex justify-between items-end mt-16 pt-8">
                <div className="text-center w-48">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm font-medium text-slate-800">Prepared By</p>
                  </div>
                </div>
                <div className="text-center w-48">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm font-medium text-slate-800">Approved By</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 text-center border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-400 font-medium">This is a system generated expense voucher.</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

          </div>
        )}
      </Drawer>
    </>
  );
};
