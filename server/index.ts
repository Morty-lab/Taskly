import "./env.ts";
import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import type { SearchRequest } from "../shared/types.ts";
import {
  HttpError,
  appwriteConfigured,
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

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(express.json({ limit: "100kb" }));

// Resumes stay in memory only long enough to extract text.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ACCEPTED.includes(ext)) cb(null, true);
    else cb(new UserError(`Unsupported file type "${ext}". Upload a PDF, DOCX or TXT file.`));
  },
});

app.post("/api/resume", upload.single("resume"), async (req, res) => {
  if (!req.file) throw new UserError("No file received.");
  res.json(await parseResume(req.file.originalname, req.file.buffer));
});

app.get("/api/dictionary", (_req, res) => {
  res.json({ skills: skillNames(), roles: roleNames() });
});

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 100) : [];

app.post("/api/jobs/search", async (req, res) => {
  const body = req.body as Partial<SearchRequest>;
  res.json(await search({ skills: strings(body.skills), roles: strings(body.roles) }));
});

app.post("/api/jobs/refresh", async (_req, res) => {
  await refresh(true);
  res.json({ sources: statuses() });
});

// ---- Account (the signed-in user acting on themselves) ----
app.delete("/api/me", requireUser, async (req, res) => {
  await deleteUser(callerOf(req).$id);
  res.status(204).end();
});

// Resume and photo files: owner or admin only.
app.get("/api/files/:id", requireUser, async (req, res) => {
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
app.get("/api/admin/users", requireUser, requireAdmin, async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
  const offset = Math.max(0, Number(req.query.offset) || 0);
  res.json(await listUsers(callerOf(req).$id, search, offset));
});

app.post("/api/admin/users/seen", requireUser, requireAdmin, async (req, res) => {
  await markUsersSeen(callerOf(req).$id);
  res.status(204).end();
});

app.patch("/api/admin/users/:id", requireUser, requireAdmin, async (req, res) => {
  const { enabled, admin } = req.body as { enabled?: unknown; admin?: unknown };
  await updateUser(callerOf(req).$id, String(req.params.id), {
    enabled: typeof enabled === "boolean" ? enabled : undefined,
    admin: typeof admin === "boolean" ? admin : undefined,
  });
  res.status(204).end();
});

app.delete("/api/admin/users/:id", requireUser, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  if (id === callerOf(req).$id) throw new HttpError(400, "Delete your own account from the Profile page.");
  await deleteUser(id);
  res.status(204).end();
});

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof UserError) return res.status(400).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "That file is over 10 MB." : err.message;
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Check the terminal for details." });
};

// `npm start` serves the built client from the same port.
if (process.argv.includes("--serve-dist")) {
  const dist = path.resolve("dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use(onError);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Job scraper API on http://127.0.0.1:${PORT}`);
  if (!appwriteConfigured) console.warn("Appwrite env vars missing: admin and account-deletion routes will return 503.");
  // Warm the cache so the first search is instant.
  refresh().catch((err) => console.error("Initial fetch failed:", err));
});
