import React from "react";
import { StatusBadge, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { repo } from "@/repositories/demo";
import type { Campaign } from "@/domain";
import { INVOICE_STATUS_LABELS, formatMoney } from "@/domain";

export const BillingTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const invoices = useAsync(() => repo.finance.listInvoices(), [campaign.id]);
  const campaignInvoices = (invoices.data ?? []).filter((i) => i.campaignId === campaign.id);

  return (
    <PermissionGate permission="finance.view" action="view billing for this campaign">
      {campaignInvoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices for this campaign will appear here once Finance issues one." />
      ) : (
        <div className="panel divide-y divide-ink-800">
          {campaignInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-ink-100">{inv.code}</div>
                <div className="text-xs text-ink-500">Issued {inv.issueDate} · Due {inv.dueDate}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink-100">{formatMoney(inv.total)}</div>
                  <div className="text-xs text-ink-500">{formatMoney(inv.amountPaid)} paid</div>
                </div>
                <StatusBadge label={INVOICE_STATUS_LABELS[inv.status]} tone={invoiceStatusTone(inv.status)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PermissionGate>
  );
};
