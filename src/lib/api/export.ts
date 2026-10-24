import { apiRequest } from "@/lib/api/client";

export interface ExportTable { name: string; rows: number }
export interface ExportFile { id: string; name: string; ext: string; size: number; campaign_id: string | null; created_at: string }

export const exportApi = {
  tables: () => apiRequest<{ ok: boolean; tables: ExportTable[] }>("/api/export/tables"),
  page: (name: string, offset: number) =>
    apiRequest<{ ok: boolean; columns: string[]; rows: Record<string, unknown>[]; has_more: boolean; next_offset: number }>(
      `/api/export/table/${encodeURIComponent(name)}?offset=${offset}`,
    ),
  files: () => apiRequest<{ ok: boolean; files: ExportFile[]; total_bytes: number }>("/api/export/files"),
};
