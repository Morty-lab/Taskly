import type { NextFunction, Request, Response } from "express";
import { Account, Client, Query, Storage, TablesDB, Users, type Models } from "node-appwrite";
import {
  ADMIN_LABEL,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  DATABASE_ID,
  PROFILES_TABLE,
  RESUMES_BUCKET,
  type AdminUser,
  type AdminUsersResponse,
  type ProfileRow,
} from "../shared/appwrite.ts";

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID || APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY ?? "";

export const appwriteConfigured = Boolean(endpoint && projectId && apiKey);

// Server client: holds the API key, so it can read every user and row. Never exposed to the browser.
const admin = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const users = new Users(admin);
const tables = new TablesDB(admin);
const storage = new Storage(admin);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type AuthedRequest = Request & { user?: Models.User<Models.Preferences> };

/**
 * Identifies the caller from the short-lived JWT the browser sends (account.createJWT()).
 * Appwrite itself validates the token, so a forged or expired one fails here.
 */
export async function requireUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!appwriteConfigured) throw new HttpError(503, "Appwrite isn't configured on the server. See README.");
  const jwt = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) throw new HttpError(401, "Sign in first.");
  try {
    const caller = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    req.user = await new Account(caller).get();
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }
  if (!req.user.status) throw new HttpError(403, "This account is disabled.");
  next();
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user?.labels.includes(ADMIN_LABEL)) throw new HttpError(403, "Admins only.");
  next();
}

export const callerOf = (req: Request) => (req as AuthedRequest).user!;

const notFound = (err: unknown) => (err as { code?: number })?.code === 404;

async function profilesFor(ids: string[]) {
  if (!ids.length) return new Map<string, ProfileRow>();
  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: PROFILES_TABLE,
    queries: [Query.equal("$id", ids), Query.limit(ids.length)],
  });
  return new Map(rows.map((r) => [r.$id, r as unknown as ProfileRow]));
}

const countSkills = (json: string | null) => {
  try {
    return (JSON.parse(json ?? "[]") as unknown[]).length;
  } catch {
    return 0;
  }
};

const LAST_SEEN_PREF = "adminUsersSeenAt";

export async function listUsers(adminId: string, search: string, offset: number): Promise<AdminUsersResponse> {
  const prefs = await users.getPrefs({ userId: adminId });
  const lastVisit = typeof prefs[LAST_SEEN_PREF] === "string" ? (prefs[LAST_SEEN_PREF] as string) : null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [page, sinceVisit, week] = await Promise.all([
    users.list({
      queries: [Query.orderDesc("$createdAt"), Query.limit(50), Query.offset(offset)],
      search: search || undefined,
    }),
    lastVisit
      ? users.list({ queries: [Query.greaterThan("$createdAt", lastVisit), Query.limit(1)] })
      : users.list({ queries: [Query.limit(1)] }),
    users.list({ queries: [Query.greaterThan("$createdAt", weekAgo), Query.limit(1)] }),
  ]);

  const profiles = await profilesFor(page.users.map((u) => u.$id));
  return {
    total: page.total,
    newSinceLastVisit: sinceVisit.total,
    newThisWeek: week.total,
    lastVisit,
    users: page.users.map((u): AdminUser => {
      const p = profiles.get(u.$id);
      return {
        id: u.$id,
        name: u.name,
        email: u.email,
        createdAt: u.$createdAt,
        accessedAt: u.accessedAt || null,
        enabled: u.status,
        verified: u.emailVerification,
        admin: u.labels.includes(ADMIN_LABEL),
        isNew: !lastVisit || u.$createdAt > lastVisit,
        profile: p
          ? {
              title: p.title ?? null,
              location: p.location,
              yearsExperience: p.yearsExperience,
              skills: countSkills(p.skills),
              hasResume: Boolean(p.resumeFileId),
              photoFileId: p.photoFileId ?? null,
            }
          : null,
      };
    }),
  };
}

/** Records "now" as the admin's last look at the users list, for the "new since last visit" count. */
export async function markUsersSeen(adminId: string) {
  const prefs = await users.getPrefs({ userId: adminId });
  await users.updatePrefs({ userId: adminId, prefs: { ...prefs, [LAST_SEEN_PREF]: new Date().toISOString() } });
}

export async function updateUser(adminId: string, userId: string, change: { enabled?: boolean; admin?: boolean }) {
  if (userId === adminId) throw new HttpError(400, "You can't disable or demote your own account.");
  if (typeof change.enabled === "boolean") {
    await users.updateStatus({ userId, status: change.enabled });
    // Disabling should also end any open sessions right away.
    if (!change.enabled) await users.deleteSessions({ userId });
  }
  if (typeof change.admin === "boolean") {
    const u = await users.get({ userId });
    const labels = u.labels.filter((l) => l !== ADMIN_LABEL);
    await users.updateLabels({ userId, labels: change.admin ? [...labels, ADMIN_LABEL] : labels });
  }
}

/** Deletes a user and everything they stored: resume file, profile row, then the account. */
export async function deleteUser(userId: string) {
  try {
    const row = (await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE,
      rowId: userId,
    })) as unknown as ProfileRow;
    for (const fileId of [row.resumeFileId, row.photoFileId]) {
      if (!fileId) continue;
      await storage.deleteFile({ bucketId: RESUMES_BUCKET, fileId }).catch((err) => {
        if (!notFound(err)) throw err;
      });
    }
    await tables.deleteRow({ databaseId: DATABASE_ID, tableId: PROFILES_TABLE, rowId: userId });
  } catch (err) {
    if (!notFound(err)) throw err; // no profile yet is fine
  }
  await users.delete({ userId });
}

const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * A stored file (resume or photo), readable only by its owner or an admin. Served through this server
 * so it works without third-party cookies, and so <img> tags can show photos via a blob URL.
 */
export async function readFile(caller: Models.User<Models.Preferences>, fileId: string) {
  if (!/^[a-zA-Z0-9._-]{1,36}$/.test(fileId)) throw new HttpError(400, "Bad file id.");
  const isAdmin = caller.labels.includes(ADMIN_LABEL);
  try {
    const meta = await storage.getFile({ bucketId: RESUMES_BUCKET, fileId });
    // Ownership comes from the file's own permissions (set by the uploader's browser), not the profile
    // row, so a just-uploaded photo is readable before the debounced profile save lands.
    const owner = meta.$permissions.includes(`read("user:${caller.$id}")`);
    if (!owner && !isAdmin) throw new HttpError(404, "File not found.");
    const data = await storage.getFileView({ bucketId: RESUMES_BUCKET, fileId });
    return {
      name: meta.name,
      // Only known image types render inline; everything else downloads, so a stored file can't run script here.
      type: INLINE_TYPES.has(meta.mimeType) ? meta.mimeType : "application/octet-stream",
      inline: INLINE_TYPES.has(meta.mimeType),
      body: Buffer.from(data),
    };
  } catch (err) {
    if (notFound(err)) throw new HttpError(404, "File not found.");
    throw err;
  }
}
