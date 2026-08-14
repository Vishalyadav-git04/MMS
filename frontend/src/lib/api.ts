/** Thin fetch helper for the MMS FastAPI (configured via VITE_API_BASE_URL). */

import { clearSession, getToken } from "@/lib/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  if (Array.isArray(b.detail) && b.detail[0]?.msg) return String(b.detail[0].msg);
  const err = b.error as { message?: string } | undefined;
  if (err?.message) return err.message;
  return fallback;
}

type ApiInit = RequestInit & { skipAuth?: boolean };

export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  const { skipAuth, headers: initHeaders, ...rest } = init ?? {};
  const isFormData = rest.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(initHeaders as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (res.status === 401 && !skipAuth) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
      window.dispatchEvent(new Event("mms:unauthorized"));
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, messageFromBody(body, res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface UploadResponse {
  message: string;
  file_name: string;
  relative_path: string;
  absolute_path: string;
  size_bytes: number;
}

export interface UploadOptions {
  module?: string;
  screen?: string;
  subfolder?: string;
}

export async function uploadFileApi(
  file: File,
  options?: UploadOptions,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (options?.subfolder) params.append("subfolder", options.subfolder);
  if (options?.module) params.append("module", options.module);
  if (options?.screen) params.append("screen", options.screen);
  const queryString = params.toString();
  const endpoint = queryString ? `/upload?${queryString}` : "/upload";
  return api<UploadResponse>(endpoint, {
    method: "POST",
    body: formData,
  });
}

