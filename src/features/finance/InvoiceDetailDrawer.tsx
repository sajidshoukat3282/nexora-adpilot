import React, { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";

export const InvoiceDetailDrawer: React.FC<{
  invoice: any | null;
  onClose: () => void;
  onRecordPayment?: () => void;
}> = ({ invoice, onClose, onRecordPayment }) => {
  const [copied, setCopied] = useState(false);

  // Safe Data Access (Kyunke DB se snake_case aa raha hai)
  const totalAmount = invoice?.total_amount || 0;
  const amountPaid = invoice?.amount_paid || 0;
  const balanceDue = totalAmount - amountPaid;
  const currency = invoice?.currency || 'PKR';
  
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
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Drawer open={!!invoice} onClose={onClose} title={invoice?.invoice_number ?? ""} subtitle={invoice?.client_name}>
        {invoice && (
          <div className="space-y-6">
            
            {/* Top Actions (Hide during print) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700 no-print">
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide
                ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                  invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                  'bg-amber-100 text-amber-700'}`}>
                {invoice.status.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyLink} className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition">
                  {copied ? "✓ Copied" : "Share"}
                </button>
                <button onClick={handlePrint} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition flex items-center gap-1 font-medium">
                  🖨️ Print / PDF
                </button>
              </div>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printable-invoice" className="bg-white text-slate-900 p-8 rounded-lg shadow-sm">
              
              {/* Header: Company & Invoice Info */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">INVOICE</h1>
                  <p className="text-slate-500 font-mono mt-1">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-800">Nexora Technologies</h2>
                  <p className="text-sm text-slate-500">123 Business Avenue, Lahore</p>
                  <p className="text-sm text-slate-500">NTN: 1234567-8 | STRN: 0987654321</p>
                  <p className="text-sm text-slate-500">hello@nexoratechnologies.pk</p>
                </div>
              </div>

              {/* Bill To & Dates */}
              <div className="flex justify-between mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
                  <p className="font-bold text-slate-900">{invoice.client_name}</p>
                  <p className="text-sm text-slate-500">{invoice.client_email || 'Client Email'}</p>
                  <p className="text-sm text-slate-500">{invoice.client_address || 'Client Address'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm"><span className="text-slate-500">Issue Date:</span> <span className="font-medium">{invoice.issue_date}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Due Date:</span> <span className="font-medium">{invoice.due_date}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-left">
                    <th className="py-2 text-sm font-bold text-slate-800">Description</th>
                    <th className="py-2 text-sm font-bold text-slate-800 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-sm text-slate-700">
                      Advertising Campaign Services <br/>
                      <span className="text-xs text-slate-500">Ref: Campaign ID {invoice.campaign_id || 'N/A'}</span>
                    </td>
                    <td className="py-3 text-sm text-slate-900 text-right font-medium">{formatCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end mb-8">
                <div className="w-1/2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium">Included</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-slate-300 pt-2 mt-2">
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Amount Paid</span>
                    <span>-{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-rose-600 border-t border-slate-300 pt-2">
                    <span>Balance Due</span>
                    <span>{formatCurrency(balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-12">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-600">{invoice.notes || 'Payment is due within 15 days. Please transfer to our bank account.'}</p>
              </div>

              {/* Signatures & Stamp Area */}
              <div className="flex justify-between items-end mt-16 pt-8">
                <div className="text-center w-48">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm font-medium text-slate-800">Authorized Signature</p>
                  </div>
                </div>
                
                <div className="text-center w-32 h-24 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-300">
                  Company Stamp
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 text-center border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-400 font-medium">This is a system generated invoice.</p>
                <p className="text-xs text-slate-400">Thank you for your business!</p>
              </div>
            </div>
            {/* ================= END PRINTABLE AREA ================= */}

            {/* Payment History (Hidden during print) */}
            <div className="no-print pt-4 border-t border-gray-700">
              <h4 className="text-sm font-bold text-gray-300 mb-3">Payment History</h4>
              <p className="text-sm text-gray-500">Total Received: <span className="text-emerald-400 font-bold">{formatCurrency(amountPaid)}</span></p>
              
              {onRecordPayment && balanceDue > 0 && (
                <button onClick={onRecordPayment} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition">
                  Receive Payment
                </button>
              )}
            </div>

          </div>
        )}
      </Drawer>
    </>
  );
};
