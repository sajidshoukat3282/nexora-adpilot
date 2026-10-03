export interface ApiErrorPayload {
  ok?: false;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;

    throw new ApiError(
      response.status,
      errorPayload?.error ?? "REQUEST_FAILED",
      errorPayload?.message ?? "The request could not be completed.",
    );
  }

  return payload as T;
}
