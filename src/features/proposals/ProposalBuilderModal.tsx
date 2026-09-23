import React, { useState, useMemo } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/ui/Modal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { formatMoney, money } from "@/domain";

interface LineItemDraft {
  key: string;
  assetId: string;
  days: number;
}

export const ProposalBuilderModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  const clients = useAsync(() => repo.crm.listClients(), []);
  const assets = useAsync(() => repo.inventory.listAssets(), []);

  const [clientId, setClientId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    if (!assets.data?.length) return;
    setItems((prev) => [...prev, { key: `${Date.now()}-${prev.length}`, assetId: assets.data![0].id, days: 7 }]);
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }
  function updateItem(key: string, patch: Partial<LineItemDraft>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  const computed = useMemo(() => {
    const lines = items.map((item) => {
      const asset = assets.data?.find((a) => a.id === item.assetId);
      const unitPriceCents = asset?.pricing.baseDailyRateCents ?? 0;
      const totalCents = unitPriceCents * item.days;
      return { ...item, asset, unitPriceCents, totalCents };
    });
    const subtotal = lines.reduce((s, l) => s + l.totalCents, 0);
    const discount = Math.round(subtotal * (discountPct / 100));
    return { lines, subtotal, discount, total: subtotal - discount };
  }, [items, assets.data, discountPct]);

  function reset() {
    setClientId("");
    setCampaignName("");
    setStartDate("");
    setEndDate("");
    setDiscountPct(0);
    setItems([]);
    setError(null);
  }

  async function submit() {
    if (!clientId || !campaignName || !startDate || !endDate || items.length === 0) {
      setError("Fill in client, campaign name, dates, and at least one inventory line item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await repo.proposals.createProposal({
        clientId,
        campaignName,
        startDate,
        endDate,
        discountPct,
        items: computed.lines.map((l) => ({
          assetId: l.assetId,
          description: `${l.asset?.name ?? "Asset"} — ${l.days} days`,
          days: l.days,
          unitPriceCents: l.unitPriceCents,
        })),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
      }}
      title="New Proposal"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Proposal"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-sm text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-lg px-3 py-2">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Client</label>
            <select className="input" value={clientId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)}>
              <option value="">Select client...</option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Campaign Name</label>
            <input className="input" value={campaignName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignName(e.target.value)} placeholder="e.g. Summer Push" />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Inventory Line Items</label>
            <button className="btn-ghost !py-1 !px-2 text-xs" onClick={addItem} disabled={!assets.data?.length}>
              <FiPlus size={13} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {computed.lines.map((line) => (
              <div key={line.key} className="flex items-center gap-2 panel p-2.5">
                <select
                  className="input !py-1.5 flex-1"
                  value={line.assetId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateItem(line.key, { assetId: e.target.value })}
                >
                  {assets.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {formatMoney(money(a.pricing.baseDailyRateCents))}/day</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input !py-1.5 w-20"
                  value={line.days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(line.key, { days: Math.max(1, Number(e.target.value)) })}
                />
                <span className="text-xs text-ink-500 w-8">days</span>
                <span className="text-sm font-semibold text-ink-100 w-24 text-right">{formatMoney(money(line.totalCents))}</span>
                <button onClick={() => removeItem(line.key)} className="text-ink-500 hover:text-signal-red p-1">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
            {computed.lines.length === 0 && (
              <p className="text-xs text-ink-500 py-3 text-center border border-dashed border-ink-700 rounded-lg">
                No line items yet — add inventory above.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ink-700/60">
          <div className="flex items-center gap-2">
            <label className="label !mb-0">Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              className="input !py-1.5 w-20"
              value={discountPct}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-500">Subtotal: {formatMoney(money(computed.subtotal))}</div>
            {discountPct > 0 && <div className="text-xs text-signal-green">-{formatMoney(money(computed.discount))} discount</div>}
            <div className="text-lg font-bold text-ink-50">{formatMoney(money(computed.total))}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
