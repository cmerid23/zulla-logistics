import { API_BASE_PATH, type ApiResponse, type AuthUser } from "@zulla/shared";
import { useAuthStore } from "../stores/auth.store";

// Spec uses VITE_API_URL. Accept legacy VITE_API_BASE_URL too.
const baseUrl =
  ((import.meta.env.VITE_API_URL as string | undefined) ??
    (import.meta.env.VITE_API_BASE_URL as string | undefined))?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the automatic refresh-on-401 retry. Used by /auth/refresh itself. */
  skipRefresh?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

interface RefreshResponse {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

async function refreshAccess(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const url = `${baseUrl}${API_BASE_PATH}/auth/refresh`;
      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      const payload = (await res.json()) as ApiResponse<RefreshResponse>;
      if (!payload.ok) return false;
      useAuthStore
        .getState()
        .setSession(payload.data.user, payload.data.accessToken, payload.data.expiresAt);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function doRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const url = new URL(`${baseUrl}${API_BASE_PATH}${path}`, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers(opts.headers);
  const isForm = opts.body instanceof FormData;
  if (!isForm && opts.body !== undefined) headers.set("content-type", "application/json");

  const token = useAuthStore.getState().accessToken;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(url.toString(), {
    ...opts,
    headers,
    credentials: "include",
    body:
      opts.body === undefined
        ? undefined
        : isForm
          ? (opts.body as FormData)
          : JSON.stringify(opts.body),
  });

  if (res.status === 401 && !opts.skipRefresh) {
    const ok = await refreshAccess();
    if (ok) return doRequest<T>(path, { ...opts, skipRefresh: true });
    useAuthStore.getState().clear();
  }

  let payload: ApiResponse<T> | undefined;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    /* empty body */
  }

  if (!res.ok || !payload || payload.ok === false) {
    const message = payload && payload.ok === false ? payload.error.message : `HTTP ${res.status}`;
    const details = payload && payload.ok === false ? payload.error.details : undefined;
    throw new ApiError(res.status, message, details);
  }
  return payload.data;
}

export const api = {
  get: <T,>(path: string, opts?: RequestOptions) => doRequest<T>(path, { ...opts, method: "GET" }),
  post: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>(path, { ...opts, method: "PUT", body }),
  delete: <T,>(path: string, opts?: RequestOptions) =>
    doRequest<T>(path, { ...opts, method: "DELETE" }),
  refresh: refreshAccess,
};
