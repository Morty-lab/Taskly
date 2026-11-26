import type { AdminUsersResponse } from "../shared/appwrite.ts";
import type { ResumeResult, SearchRequest, SearchResponse, SourceStatus } from "../shared/types.ts";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Can't reach the server. Check that it's running and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`);
  return body as T;
}

const json = (method: string, body: unknown, jwt?: string): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
  body: JSON.stringify(body),
});

const auth = (jwt: string, method = "GET"): RequestInit => ({ method, headers: { Authorization: `Bearer ${jwt}` } });

export const api = {
  uploadResume(file: File) {
    const form = new FormData();
    form.append("resume", file);
    return call<ResumeResult>("/api/resume", { method: "POST", body: form });
  },
  dictionary: () => call<{ skills: string[]; roles: string[] }>("/api/dictionary"),
  search: (req: SearchRequest) => call<SearchResponse>("/api/jobs/search", json("POST", req)),
  refresh: () => call<{ sources: SourceStatus[] }>("/api/jobs/refresh", { method: "POST" }),

  deleteMe: (jwt: string) => call<void>("/api/me", auth(jwt, "DELETE")),

  admin: {
    users: (jwt: string, search = "", offset = 0) =>
      call<AdminUsersResponse>(`/api/admin/users?${new URLSearchParams({ search, offset: String(offset) })}`, auth(jwt)),
    markSeen: (jwt: string) => call<void>("/api/admin/users/seen", auth(jwt, "POST")),
    update: (jwt: string, id: string, change: { enabled?: boolean; admin?: boolean }) =>
      call<void>(`/api/admin/users/${encodeURIComponent(id)}`, json("PATCH", change, jwt)),
    remove: (jwt: string, id: string) => call<void>(`/api/admin/users/${encodeURIComponent(id)}`, auth(jwt, "DELETE")),
  },
};
