import React, { useState } from "react";
import { FIN, ModalTitle } from "../finance/financeUi";
import { campaignsApi } from "@/lib/api/campaigns";
import { addDaysIso, campaignDays } from "./campaignTools";

export const RenewModal: React.FC<{
  campaign: { id: string; name: string; start_date: string; end_date: string };
  onClose: () => void;
  onDone: (newId: string) => void;
}> = ({ campaign, onClose, onDone }) => {
  const len = campaignDays(campaign.start_date, campaign.end_date);
  const startDefault = addDaysIso(campaign.end_date, 1);
  const [name, setName] = useState(`${campaign.name} (Renewal)`);
  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(addDaysIso(startDefault, len - 1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: any) => {
    e.preventDefault();
    if (end < start) return setErr("End date must be on or after the start date.");
    setBusy(true);
    setErr("");
    try {
      const r = await campaignsApi.duplicate(campaign.id, { name, start_date: start, end_date: end });
      onDone(r.id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not renew the campaign.");
      setBusy(false);
    }
  };

  return (
    <div className={FIN.overlay}>
      <form onSubmit={submit} className={`${FIN.modal} max-w-md`}>
        <ModalTitle>Renew campaign</ModalTitle>
        <p className="mb-3 text-[11px] text-zinc-500">
          Creates a new draft with the same client and screens. Rates are copied; you can change them afterwards.
        </p>
        <div className="space-y-3">
          <div>
            <label className={FIN.label}>New campaign name</label>
            <input required className={FIN.input} value={name} onChange={(e: any) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={FIN.label}>Start date</label>
              <input required type="date" className={FIN.input} value={start} onChange={(e: any) => setStart(e.target.value)} />
            </div>
            <div>
              <label className={FIN.label}>End date</label>
              <input required type="date" className={FIN.input} value={end} onChange={(e: any) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        {err && <p className="mt-3 text-[11px] text-rose-300">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={FIN.btnText} onClick={onClose}>Cancel</button>
          <button type="submit" className={FIN.btnGold} disabled={busy}>{busy ? "Creating..." : "Create renewal"}</button>
        </div>
      </form>
    </div>
  );
};
