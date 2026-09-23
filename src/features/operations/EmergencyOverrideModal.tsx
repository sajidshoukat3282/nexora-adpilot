import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import { repo } from "@/repositories/demo";
import type { LiveScreen } from "@/domain";

export const EmergencyOverrideModal: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedScreens: LiveScreen[];
  onDone: () => void;
}> = ({ open, onClose, selectedScreens, onDone }) => {
  const { user, can } = useSession();
  const approvedCreatives = useAsync(() => repo.creatives.listApprovedCreatives(), [open]);
  const [creativeId, setCreativeId] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "result">("form");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setCreativeId(""); setReason(""); setStep("form"); setResult(null);
  }

  async function publish() {
    setBusy(true);
    try {
      const record = await repo.operations.publishEmergencyOverride({
        screenIds: selectedScreens.map((s) => s.id),
        creativeId,
        reason,
        hasPermission: can("operations.override"),
        actorName: user?.name ?? "You",
      });
      setResult(
        record.result === "published"
          ? { ok: true, message: `Published to ${selectedScreens.length} screen(s).` }
          : {
              ok: false,
              message: `Denied — your current role ("${user?.role.replace("_", " ")}") does not hold the operations.override permission. This is a real authorization check against your active demo role, not a hidden button.`,
            }
      );
      setStep("result");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Emergency Override"
      footer={
        step === "form" ? (
          <>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-danger" disabled={!creativeId || !reason} onClick={() => setStep("confirm")}>
              Continue
            </button>
          </>
        ) : step === "confirm" ? (
          <>
            <button className="btn-secondary" onClick={() => setStep("form")}>Back</button>
            <button className="btn-danger" disabled={busy} onClick={publish}>
              {busy ? "Publishing..." : "Confirm & Publish Now"}
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => { reset(); onClose(); }}>Close</button>
        )
      }
    >
      {step === "form" && (
        <div className="space-y-3">
          <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-3 py-2">
            This immediately replaces normal scheduling on the selected screens. Demo only — no real screen is affected.
          </div>
          <div>
            <label className="label">Selected Screens ({selectedScreens.length})</label>
            <div className="flex flex-wrap gap-1.5">
              {selectedScreens.map((s) => (
                <span key={s.id} className="text-xs bg-ink-800 px-2 py-1 rounded-md text-ink-300">{s.name}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Approved Creative</label>
            <select className="input" value={creativeId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreativeId(e.target.value)}>
              <option value="">Select an approved creative...</option>
              {approvedCreatives.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {approvedCreatives.data?.length === 0 && (
              <p className="text-xs text-ink-500 mt-1">No creatives are currently approved company-wide.</p>
            )}
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={2} value={reason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)} placeholder="e.g. Client compliance takedown request" />
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-200">
            You're about to publish <span className="font-semibold text-ink-50">1 creative</span> to{" "}
            <span className="font-semibold text-ink-50">{selectedScreens.length} screen(s)</span> immediately, overriding their current schedule.
          </p>
          <p className="text-xs text-ink-500">Reason: {reason}</p>
        </div>
      )}

      {step === "result" && result && (
        <div className={`rounded-lg px-4 py-3 text-sm ${result.ok ? "bg-signal-green/10 text-signal-green border border-signal-green/25" : "bg-signal-red/10 text-signal-red border border-signal-red/25"}`}>
          {result.message}
        </div>
      )}
    </Modal>
  );
};
