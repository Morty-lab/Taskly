import express, { Router, type ErrorRequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import type { SearchRequest } from "../shared/types.ts";
import {
  HttpError,
  callerOf,
  deleteUser,
  listUsers,
  markUsersSeen,
  readFile,
  requireAdmin,
  requireUser,
  updateUser,
} from "./appwrite.ts";
import { refresh, search, statuses } from "./jobs.ts";
import { ACCEPTED, UserError, parseResume } from "./resume.ts";
import { roleNames, skillNames } from "./skills.ts";

// Netlify Functions accept request bodies up to 6 MB, and an upload arrives base64-encoded (+33%),
// so 4 MB is the largest file that fits. Resumes are almost always far smaller.
export const MAX_UPLOAD_MB = 4;

/** The whole API as an Express app. Run by server/index.ts locally and netlify/functions/api.ts in production. */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  const api = Router();

  // Resumes stay in memory only long enough to extract text.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ACCEPTED.includes(ext)) cb(null, true);
      else cb(new UserError(`Unsupported file type "${ext}". Upload a PDF, DOCX or TXT file.`));
    },
  });

  api.post("/resume", upload.single("resume"), async (req, res) => {
    if (!req.file) throw new UserError("No file received.");
    res.json(await parseResume(req.file.originalname, req.file.buffer));
  });

  api.get("/dictionary", (_req, res) => {
    res.json({ skills: skillNames(), roles: roleNames() });
  });

  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 100) : [];

  api.post("/jobs/search", async (req, res) => {
    const body = req.body as Partial<SearchRequest>;
    res.json(await search({ skills: strings(body.skills), roles: strings(body.roles) }));
  });

  api.post("/jobs/refresh", async (_req, res) => {
    await refresh(true);
    res.json({ sources: statuses() });
  });

  // ---- Account (the signed-in user acting on themselves) ----
  api.delete("/me", requireUser, async (req, res) => {
    await deleteUser(callerOf(req).$id);
    res.status(204).end();
  });

  // Resume and photo files: owner or admin only.
  api.get("/files/:id", requireUser, async (req, res) => {
    const f = await readFile(callerOf(req), String(req.params.id));
    res.set({
      "Content-Type": f.type,
      "Content-Disposition": `${f.inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    });
    res.send(f.body);
  });

  // ---- Admin: user management. Every route checks the caller's "admin" label. ----
  api.get("/admin/users", requireUser, requireAdmin, async (req, res) => {
    const q = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
    const offset = Math.max(0, Number(req.query.offset) || 0);
    res.json(await listUsers(callerOf(req).$id, q, offset));
  });

  api.post("/admin/users/seen", requireUser, requireAdmin, async (req, res) => {
    await markUsersSeen(callerOf(req).$id);
    res.status(204).end();
  });

  api.patch("/admin/users/:id", requireUser, requireAdmin, async (req, res) => {
    const { enabled, admin } = req.body as { enabled?: unknown; admin?: unknown };
    await updateUser(callerOf(req).$id, String(req.params.id), {
      enabled: typeof enabled === "boolean" ? enabled : undefined,
      admin: typeof admin === "boolean" ? admin : undefined,
    });
    res.status(204).end();
  });

  api.delete("/admin/users/:id", requireUser, requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    if (id === callerOf(req).$id) throw new HttpError(400, "Delete your own account from the Profile page.");
    await deleteUser(id);
    res.status(204).end();
  });

  // Netlify rewrites /api/* to the function; depending on the route the function sees either path.
  app.use(["/api", "/.netlify/functions/api"], api);
  return app;
}

export const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof UserError) return res.status(400).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? `That file is over ${MAX_UPLOAD_MB} MB.` : err.message;
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Try again in a moment." });
};
