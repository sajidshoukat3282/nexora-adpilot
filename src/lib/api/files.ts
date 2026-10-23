import { ApiError } from "@/lib/api/client";

export const MAX_UPLOAD_MB = 5;
export const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.mp4,.webm";

export interface UploadedFile { id: string; name: string; size: number; url: string }

/** Sends one file from the user's computer. The file body is sent as it is, the name travels in the address. */
export async function uploadFile(file: File, campaignId: string): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new ApiError(413, "TOO_LARGE", `The file is too large. The limit is ${MAX_UPLOAD_MB} MB. For bigger files, paste a link instead.`);
  }
  const res = await fetch(`/api/files?name=${encodeURIComponent(file.name)}&campaign_id=${encodeURIComponent(campaignId)}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.ok) throw new ApiError(res.status, data?.error ?? "UPLOAD_FAILED", data?.message ?? "The file could not be uploaded.");
  return data as UploadedFile;
}

export const prettySize = (n: number): string => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
