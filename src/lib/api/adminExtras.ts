import { apiRequest, ApiError } from "@/lib/api/client";

export interface AuditRow { id: string; actor: string | null; action: string; detail: string | null; at: string }
export interface PermissionTemplate { id: string; name: string; permissions: string[] }

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });

export const adminExtrasApi = {
  audit: (q: string, action: string) =>
    apiRequest<{ ok: boolean; entries: AuditRow[]; actions: string[] }>(`/api/admin/audit?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&limit=200`),
  templates: () => apiRequest<{ ok: boolean; templates: PermissionTemplate[] }>("/api/admin/templates"),
  saveTemplate: (name: string, permissions: string[]) => apiRequest<{ ok: boolean; id: string }>("/api/admin/templates", { method: "POST", ...body({ name, permissions }) }),
  deleteTemplate: (id: string) => apiRequest<{ ok: boolean }>(`/api/admin/templates/${id}`, { method: "DELETE" }),
  branding: () => apiRequest<{ ok: boolean; logo_url: string | null }>("/api/branding"),
  removeLogo: () => apiRequest<{ ok: boolean }>("/api/admin/logo", { method: "DELETE" }),
};

export const LOGO_MAX_MB = 1;

export async function uploadLogo(file: File): Promise<string> {
  if (file.size > LOGO_MAX_MB * 1024 * 1024) throw new ApiError(413, "TOO_LARGE", `The logo is too large. The limit is ${LOGO_MAX_MB} MB.`);
  const res = await fetch(`/api/admin/logo?name=${encodeURIComponent(file.name)}`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file,
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.ok) throw new ApiError(res.status, data?.error ?? "UPLOAD_FAILED", data?.message ?? "The logo could not be uploaded.");
  return data.logo_url as string;
}
