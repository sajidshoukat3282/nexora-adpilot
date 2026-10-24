import { apiRequest } from "@/lib/api/client";

export type ScreenState = "online" | "maintenance" | "offline";
export interface OpsRunning { campaign_id: string; campaign_name: string; client_name: string | null; status: string; end_date: string; slots: number }
export interface OpsScreen {
  id: string; name: string; city: string | null; location: string | null; screen_type: string | null;
  status: ScreenState; source: "manual" | "player"; reason: string | null; since: string | null;
  has_player: boolean; last_heartbeat: string | null; running: OpsRunning[]; open_incidents: number;
}
export interface OpsAlert { key: string; severity: "critical" | "warning" | "info"; title: string; detail: string; screen_id?: string; campaign_id?: string; incident_id?: string }
export interface OpsUpcoming { id: string; name: string; client_name: string | null; status: string; screens: number; kind: "starts" | "ends"; date: string; creative_ready: boolean }
export interface OpsOverview {
  ok: boolean; today: string; heartbeat_minutes: number;
  counts: { total: number; online: number; maintenance: number; offline: number };
  kpis: { running_campaigns: number; playing_screens: number; open_incidents: number; alerts: number };
  screens: OpsScreen[]; alerts: OpsAlert[]; upcoming: OpsUpcoming[];
}
export interface Incident {
  id: string; inventory_id: string | null; campaign_id: string | null; title: string; detail: string | null;
  severity: "low" | "medium" | "high"; status: "open" | "in_progress" | "resolved"; owner: string | null; resolution: string | null;
  created_by: string | null; created_at: string; updated_at: string; resolved_at: string | null; screen_name?: string | null; campaign_name?: string | null;
}
export interface MaintItem { id: string; inventory_id: string; planned_date: string; title: string; notes: string | null; done: number; done_at: string | null; screen_name: string | null; city: string | null }
export interface Proof { geo_ok?: number | null; distance_m?: number | null; taken_at?: string | null; id: string; campaign_id: string; inventory_id: string | null; proof_date: string; photo_url: string | null; notes: string | null; actor_email: string | null; campaign_name: string | null; screen_name: string | null; city: string | null }
export interface ScreenDetail {
  ok: boolean; screen: { id: string; name: string; city: string | null; location: string | null; screen_type: string | null };
  ops: { ops_status: string | null; reason: string | null; status_since: string | null; updated_by: string | null; has_player: boolean; last_heartbeat: string | null; info: { version?: string; storage?: number; temperature?: number } | null } | null;
  campaigns: { id: string; name: string; status: string; start_date: string; end_date: string; client_name: string | null }[];
  incidents: Incident[]; maintenance: (MaintItem & { done: number })[]; proofs: { id: string; proof_date: string; photo_url: string | null; notes: string | null; campaign_name: string | null }[];
}
type Msg = { ok: boolean; message?: string };
const body = (b: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

export interface FieldItem { campaign_id: string; campaign_name: string; client_name: string | null; screen_id: string; screen_name: string; city: string | null; location: string | null; proofs_today: number }

export interface FieldOperator { account_id: string; email: string; cities: string[]; screen_ids: string[]; proofs_today: number; last_proof: string | null }
export interface FieldPending { campaign_id: string; campaign_name: string; client_name: string | null; screen_id: string; screen_name: string; city: string | null; assigned_to: string[] }
export interface FieldTeam { ok: boolean; today: string; operators: FieldOperator[]; pending: FieldPending[]; covered: number; total: number; cities: string[]; screens: { id: string; name: string; city: string | null }[]; remind_hour: number | null }

export const opsApi = {
  fieldTeam: () => apiRequest<FieldTeam>("/api/ops/field/team"),
  saveAssignments: (accountId: string, b: { cities: string[]; screen_ids: string[] }) => apiRequest<{ ok: boolean; message?: string }>(`/api/ops/field/team/${accountId}`, { method: "PUT", ...body(b) }),
  saveFieldSettings: (remind_hour: number | null) => apiRequest<{ ok: boolean; message?: string }>("/api/ops/field/settings", { method: "PUT", ...body({ remind_hour }) }),
  fieldToday: () => apiRequest<{ ok: boolean; today: string; company: string; items: FieldItem[] }>("/api/ops/field/today"),
  fieldProof: (b: { campaign_id: string; inventory_id: string; photo_url: string; notes?: string; lat?: number; lng?: number; accuracy?: number; proof_date?: string }) =>
    apiRequest<{ ok: boolean; geo: "verified" | "far" | "none"; distance_m: number | null; message?: string }>("/api/ops/field/proof", { method: "POST", ...body(b) }),
  overview: () => apiRequest<OpsOverview>("/api/ops/overview"),
  screen: (id: string) => apiRequest<ScreenDetail>(`/api/ops/screens/${id}`),
  setStatus: (id: string, status: ScreenState, reason: string) => apiRequest<Msg>(`/api/ops/screens/${id}/status`, { method: "POST", ...body({ status, reason }) }),
  createPlayer: (id: string) => apiRequest<{ ok: boolean; key: string; url: string; player_url: string }>(`/api/ops/screens/${id}/player`, { method: "POST" }),
  removePlayer: (id: string) => apiRequest<Msg>(`/api/ops/screens/${id}/player`, { method: "DELETE" }),
  incidents: (status = "") => apiRequest<{ ok: boolean; incidents: Incident[] }>(`/api/ops/incidents${status ? `?status=${status}` : ""}`),
  addIncident: (b: { title: string; detail?: string; severity: string; inventory_id?: string; campaign_id?: string; owner?: string }) => apiRequest<Msg>("/api/ops/incidents", { method: "POST", ...body(b) }),
  updateIncident: (id: string, b: { status?: string; resolution?: string; owner?: string; severity?: string }) => apiRequest<Msg>(`/api/ops/incidents/${id}`, { method: "PUT", ...body(b) }),
  deleteIncident: (id: string) => apiRequest<Msg>(`/api/ops/incidents/${id}`, { method: "DELETE" }),
  maintenance: () => apiRequest<{ ok: boolean; items: MaintItem[]; today: string }>("/api/ops/maintenance"),
  addMaintenance: (b: { inventory_id: string; title: string; planned_date: string; notes?: string }) => apiRequest<Msg>("/api/ops/maintenance", { method: "POST", ...body(b) }),
  doneMaintenance: (id: string, done: boolean) => apiRequest<Msg>(`/api/ops/maintenance/${id}`, { method: "PUT", ...body({ done }) }),
  deleteMaintenance: (id: string) => apiRequest<Msg>(`/api/ops/maintenance/${id}`, { method: "DELETE" }),
  proofs: (campaign = "") => apiRequest<{ ok: boolean; proofs: Proof[]; campaigns: { id: string; name: string; status: string }[] }>(`/api/ops/proofs${campaign ? `?campaign=${campaign}` : ""}`),
  addProof: (campaignId: string, b: { inventory_id?: string; proof_date: string; photo_url?: string; notes?: string }) =>
    apiRequest<Msg>(`/api/campaigns/${campaignId}/proofs`, { method: "POST", ...body(b) }),
  deleteProof: (campaignId: string, id: string) => apiRequest<Msg>(`/api/campaigns/${campaignId}/proofs/${id}`, { method: "DELETE" }),
};
