import { ApiError } from "@/lib/api/client";

export const MAX_UPLOAD_MB = 25;
export const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.mp4,.webm";

export interface UploadedFile { id: string; name: string; size: number; url: string }

/** Photos are made smaller in the browser (max 1600 px, JPEG) so storage lasts longer. Falls back to the original file. */
async function shrinkImage(file: File): Promise<File> {
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 350 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const ctx = c.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Sends one file from the user's computer. The file body is sent as it is, the name travels in the address. */
export async function uploadFile(original: File, campaignId: string): Promise<UploadedFile> {
  const file = await shrinkImage(original);
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
