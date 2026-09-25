import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign, CampaignObjective, Proposal } from "@/domain";
import { OBJECTIVE_LABELS } from "@/domain";

const OBJECTIVES = Object.keys(OBJECTIVE_LABELS) as CampaignObjective[];

const CURRENCIES = [
  { code: "PKR", label: "PKR - Pakistani Rupee" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
];

export const NewCampaignModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
  fromProposal?: Proposal | null;
}> = ({ open, onClose, onCreated, fromProposal }) => {
  const clients = useAsync(() => repo.crm.listClients(), []);

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [brand, setBrand] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("brand_awareness");
  const [currency, setCurrency] = useState("PKR");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fromProposal) {
      setName(fromProposal.campaignName);
      setClientId(fromProposal.clientId);
      setStartDate(fromProposal.startDate);
      setEndDate(fromProposal.endDate);
    }
  }, [open, fromProposal]);

  function reset() {
    setName(""); setClientId(""); setBrand(""); setObjective("brand_awareness");
    setCurrency("PKR"); setBudget("");
    setStartDate(""); setEndDate(""); setError(null);
  }

  async function submit() {
    if (!name || !clientId || !brand || !startDate || !endDate) {
      setError("Fill in all fields to create a campaign.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await repo.campaigns.createCampaign({
        name, clientId, brand, objective,
        currency,
        budget: budget ? parseFloat(budget) : 0,
        schedule: {
          startDate, endDate,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          operatingHours: { start: "08:00", end: "22:00" },
          spotDurationSec: 10,
          loopPosition: null,
          dayparts: [],
        },
      } as any);
      reset();
      onCreated(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fromProposal ? `New Campaign — from ${fromProposal.code}` : "New Campaign"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Campaign"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="text-sm text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-lg px-3 py-2">{error}</div>}
        {fromProposal && (
          <div className="text-xs text-signal-cyan bg-signal-cyan/10 border border-signal-cyan/25 rounded-lg px-3 py-2">
            Pre-filled from accepted proposal {fromProposal.code}.
          </div>
        )}
        <div>
          <label className="label">Campaign Name</label>
          <input className="input" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Summer Refresh" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Client</label>
            <select className="input" value={clientId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)} disabled={!!fromProposal}>
              <option value="">Select client...</option>
              {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" value={brand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrand(e.target.value)} placeholder="e.g. Zenith Cola" />
          </div>
        </div>
        <div>
          <label className="label">Objective</label>
          <select className="input" value={objective} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setObjective(e.target.value as CampaignObjective)}>
            {OBJECTIVES.map((o) => <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Total Budget</label>
            <input type="number" min="0" className="input" value={budget} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudget(e.target.value)} placeholder="e.g. 500000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} disabled={!!fromProposal} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} disabled={!!fromProposal} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
