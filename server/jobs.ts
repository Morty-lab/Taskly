import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScoredJob, SearchRequest, SearchResponse, Snippet, SourceStatus } from "../shared/types.ts";
import { matcherFor } from "./skills.ts";
import { SOURCES, toText, type RawJob, type Source } from "./sources.ts";

// Jobs are fetched in bulk per source and cached on disk, then matched locally. Every search runs
// against the cache, so typing in the UI never sends a request to a job site.

const CACHE_FILE = path.resolve("data", "cache.json");
const STALE_AFTER = 6 * 60 * 60 * 1000;

interface Entry {
  fetchedAt: string | null;
  jobs: RawJob[];
  error: string | null;
}

let cache: Record<string, Entry> = {};
let loaded = false;
let inflight: Promise<void> | null = null;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, "utf8"));
    // Re-clean saved text so cleanup fixes apply without refetching (Remotive allows ~4 fetches a day).
    for (const e of Object.values(cache))
      for (const j of e.jobs) {
        j.body = toText(j.body);
        j.excerpt = j.body.length > 300 ? `${j.body.slice(0, 297).trimEnd()}…` : j.body;
      }
  } catch {
    cache = {}; // first run, or an unreadable cache: refetch
  }
}

async function save() {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache));
}

const age = (e?: Entry) => (e?.fetchedAt ? Date.now() - Date.parse(e.fetchedAt) : Infinity);

function due(source: Source, force: boolean) {
  const a = age(cache[source.id]);
  return a > STALE_AFTER || (force && a > source.minIntervalMs);
}

async function refreshOne(source: Source) {
  const prev = cache[source.id];
  try {
    const jobs = await source.fetch();
    cache[source.id] = { fetchedAt: new Date().toISOString(), jobs, error: null };
  } catch (err) {
    // Keep serving the last good copy, but don't hammer a failing source: retry after its interval.
    cache[source.id] = {
      fetchedAt: new Date().toISOString(),
      jobs: prev?.jobs ?? [],
      error: err instanceof Error ? err.message : String(err),
    };
    console.warn(`[${source.id}] fetch failed:`, cache[source.id].error);
  }
}

/** Fetch every source whose cache is stale (or, when forced, older than its minimum interval). */
export async function refresh(force = false) {
  await load();
  if (inflight) return inflight;
  const todo = SOURCES.filter((s) => due(s, force));
  if (!todo.length) return;
  inflight = Promise.all(todo.map(refreshOne))
    .then(save)
    .finally(() => (inflight = null));
  return inflight;
}

export function statuses(): SourceStatus[] {
  return SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    homepage: s.homepage,
    count: cache[s.id]?.jobs.length ?? 0,
    fetchedAt: cache[s.id]?.fetchedAt ?? null,
    error: cache[s.id]?.error ?? null,
  }));
}

// Where a skill appears says how central it is to the job.
const WEIGHT = { title: 3, tags: 2, body: 1 } as const;
const ROLE_TITLE_WEIGHT = 4;

function score(job: RawJob, skills: { name: string; re: RegExp }[], roles: { name: string; re: RegExp }[]) {
  const tags = job.tags.join(" · ");
  // Some postings list every technology under the sun as tags; those tags say nothing about the role.
  const tagWeight = job.tags.length > 15 ? WEIGHT.body : WEIGHT.tags;
  const hits: { name: string; w: number }[] = [];
  for (const s of skills) {
    const w = s.re.test(job.title) ? WEIGHT.title : s.re.test(tags) ? tagWeight : s.re.test(job.body) ? WEIGHT.body : 0;
    if (w) hits.push({ name: s.name, w });
  }
  // Roles only count when they're in the title: "work with our backend team" isn't a backend job.
  const roleBonus = roles.some((r) => r.re.test(job.title)) ? ROLE_TITLE_WEIGHT : 0;
  hits.sort((a, b) => b.w - a.w);
  return { score: hits.reduce((n, h) => n + h.w, 0) + (hits.length ? roleBonus : 0), matched: hits.map((h) => h.name) };
}

const SNIPPET_RADIUS = 70;

/** Up to three sentences from the description where the user's skills appear, cut at word boundaries. */
function snippetsFor(job: RawJob, skills: { name: string; re: RegExp }[], matched: string[]): Snippet[] {
  const out: Snippet[] = [];
  const used: [number, number][] = [];
  for (const name of matched) {
    if (out.length === 3) break;
    const re = skills.find((s) => s.name === name)?.re;
    const m = re && new RegExp(re.source, "i").exec(job.body);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (used.some(([a, b]) => start < b && end > a)) continue; // already shown in another snippet
    let from = Math.max(0, start - SNIPPET_RADIUS);
    let to = Math.min(job.body.length, end + SNIPPET_RADIUS);
    if (from > 0) from = job.body.indexOf(" ", from) + 1 || from;
    if (to < job.body.length) to = job.body.lastIndexOf(" ", to) > end ? job.body.lastIndexOf(" ", to) : to;
    used.push([from, to]);
    out.push({
      skill: name,
      before: (from > 0 ? "…" : "") + job.body.slice(from, start),
      hit: m[0],
      after: job.body.slice(end, to) + (to < job.body.length ? "…" : ""),
    });
  }
  return out;
}

export async function search(req: SearchRequest): Promise<SearchResponse> {
  await refresh();
  const skills = [...new Set(req.skills)].map((name) => ({ name, re: matcherFor(name) }));
  const roles = [...new Set(req.roles)].map((name) => ({ name, re: matcherFor(name) }));

  const seen = new Set<string>();
  const all = Object.values(cache).flatMap((e) => e.jobs);
  const jobs: ScoredJob[] = [];
  for (const job of all) {
    // The same opening is often cross-posted; keep the first copy.
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const s = score(job, skills, roles);
    if (!s.score) continue;
    const { body: _body, ...publicJob } = job;
    jobs.push({ ...publicJob, ...s, snippets: snippetsFor(job, skills, s.matched) });
  }
  jobs.sort((a, b) => b.score - a.score || Date.parse(b.postedAt) - Date.parse(a.postedAt));

  return { jobs, total: seen.size, sources: statuses() };
}
