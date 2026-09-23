import React, { useMemo } from "react";
import { FiAlertTriangle, FiInfo, FiTrendingUp } from "react-icons/fi";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign, Creative } from "@/domain";

interface Recommendation {
  id: string;
  icon: React.ReactNode;
  tone: "amber" | "cyan" | "red";
  title: string;
  why: string;
  data: string;
  action: string;
}

/**
 * PHASE 1 HONESTY NOTE: these are transparent, rule-based checks over real
 * demo data — not machine learning, not a real AI model. Each recommendation
 * states exactly which rule fired and what data triggered it.
 */
function buildRecommendations(campaigns: Campaign[], creativesByCampaign: Map<string, Creative[]>): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const c of campaigns) {
    const creatives = creativesByCampaign.get(c.id) ?? [];
    const hasApproved = creatives.some((cr) => cr.status === "approved");

    if (!["draft", "completed", "archived", "cancelled"].includes(c.status) && !hasApproved) {
      recs.push({
        id: `no-approved-${c.id}`,
        icon: <FiAlertTriangle />, tone: "amber",
        title: `${c.name} has no approved creative`,
        why: "A campaign past the draft stage should have at least one approved creative before it can go live.",
        data: `Campaign status: ${c.status.replace("_", " ")}. Creatives found: ${creatives.length}, approved: 0.`,
        action: "Open the Creatives tab and move a version through internal and client review.",
      });
    }

    const daysToEnd = (new Date(c.schedule.endDate).getTime() - now) / DAY;
    if (c.status === "live" && daysToEnd <= 5 && daysToEnd >= 0) {
      recs.push({
        id: `ending-soon-${c.id}`,
        icon: <FiInfo />, tone: "cyan",
        title: `${c.name} ends in ${Math.ceil(daysToEnd)} day(s)`,
        why: "Live campaigns approaching their end date may need a renewal conversation or wrap-up report.",
        data: `Schedule end date: ${c.schedule.endDate}.`,
        action: "Prepare a campaign report and reach out to the client about renewal.",
      });
    }

    const daysToStart = (new Date(c.schedule.startDate).getTime() - now) / DAY;
    if (["draft", "proposal", "pending_approval"].includes(c.status) && daysToStart <= 7 && daysToStart >= 0) {
      recs.push({
        id: `scheduling-risk-${c.id}`,
        icon: <FiAlertTriangle />, tone: "amber",
        title: `${c.name} starts soon but isn't booked`,
        why: "Campaigns starting within 7 days should normally already be booked or scheduled.",
        data: `Status: ${c.status.replace("_", " ")}. Start date: ${c.schedule.startDate} (${Math.ceil(daysToStart)} day(s) away).`,
        action: "Move this campaign through approval and booking, or confirm the start date with the client.",
      });
    }
  }

  return recs;
}

export const NexoraIntelligencePanel: React.FC = () => {
  const campaigns = useAsync(() => repo.campaigns.listCampaigns(), []);
  const creativesMap = useAsync(async () => {
    const map = new Map<string, Creative[]>();
    for (const c of campaigns.data ?? []) {
      map.set(c.id, await repo.creatives.listCreativesForCampaign(c.id));
    }
    return map;
  }, [campaigns.data]);

  const recommendations = useMemo(
    () => (campaigns.data && creativesMap.data ? buildRecommendations(campaigns.data, creativesMap.data) : []),
    [campaigns.data, creativesMap.data]
  );

  const toneClasses = {
    amber: "border-signal-amber/25 bg-signal-amber/5 text-signal-amber",
    cyan: "border-signal-cyan/25 bg-signal-cyan/5 text-signal-cyan",
    red: "border-signal-red/25 bg-signal-red/5 text-signal-red",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FiTrendingUp className="text-signal-cyan" />
        <h3 className="font-semibold text-ink-50">Nexora Intelligence</h3>
      </div>
      <p className="text-xs text-ink-500 mb-4">
        Transparent, rule-based recommendations computed from real campaign data — not a live AI model.
      </p>

      {recommendations.length === 0 ? (
        <p className="text-sm text-ink-500 py-6 text-center">No recommendations right now — everything checked out.</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className={`rounded-xl2 border p-4 ${toneClasses[rec.tone]}`}>
              <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                {rec.icon}
                {rec.title}
              </div>
              <dl className="text-xs space-y-1 text-ink-300">
                <div><dt className="inline font-semibold text-ink-400">Why: </dt><dd className="inline">{rec.why}</dd></div>
                <div><dt className="inline font-semibold text-ink-400">Data: </dt><dd className="inline">{rec.data}</dd></div>
                <div><dt className="inline font-semibold text-ink-400">Suggested action: </dt><dd className="inline">{rec.action}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
