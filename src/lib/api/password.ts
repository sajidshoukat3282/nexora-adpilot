import { apiRequest } from "@/lib/api/client";

export const MIN_PASSWORD_LENGTH = 8;

export const passwordApi = {
  status: () => apiRequest<{ ok: boolean; has_password: boolean }>("/api/auth/password-status"),
  set: (password: string, currentPassword?: string) =>
    apiRequest<{ ok: boolean; message: string }>("/api/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ password, current_password: currentPassword || undefined }),
    }),
};
