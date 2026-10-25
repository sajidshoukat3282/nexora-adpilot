import { apiRequest } from "@/lib/api/client";

export interface ApiKeyRow { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null }

export const apiKeysApi = {
  list: () => apiRequest<{ ok: boolean; keys: ApiKeyRow[]; max: number }>("/api/admin/api-keys"),
  create: (name: string) =>
    apiRequest<{ ok: boolean; id: string; key: string }>("/api/admin/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
  revoke: (id: string) => apiRequest<{ ok: boolean }>(`/api/admin/api-keys/${id}`, { method: "DELETE" }),
};
