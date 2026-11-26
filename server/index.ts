// Local server: `npm run dev` (API only, Vite serves the pages) or `npm start` (API + built pages).
// In production on Netlify the same app runs as a function instead: see netlify/functions/api.ts.
import "./env.ts";
import express from "express";
import path from "node:path";
import { createApp, onError } from "./app.ts";
import { appwriteConfigured } from "./appwrite.ts";
import { refresh } from "./jobs.ts";

const PORT = Number(process.env.PORT ?? 3001);
const app = createApp();

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
