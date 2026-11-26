import type { Job, SourceId } from "../shared/types.ts";

// Each source is a public job API that allows this use as long as every listing links back to
// the original posting and names the source. Remotive asks for at most ~4 requests a day, which
// the 6-hour cache in jobs.ts respects.

export interface Source {
  id: SourceId;
  name: string;
  homepage: string;
  /** Minimum time between real fetches, regardless of manual refresh. */
  minIntervalMs: number;
  fetch: () => Promise<RawJob[]>;
}

const UA = "job-scraper (personal, low-volume)";
const HOUR = 60 * 60 * 1000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });

const strip = (s: string) => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<\/?[a-z][^>]*>/gi, " ");

/**
 * Plain text from an HTML description. Some feeds send HTML that is itself entity-escaped
 * (`&lt;span …&gt;`), so decode and strip twice: once for the markup, once for what decoding revealed.
 */
export function toText(html: string | null | undefined): string {
  return strip(decode(strip(decode(strip(html ?? "")))))
    .replace(/\s+/g, " ")
    .trim();
}

/** Full description text is kept separately from Job (only used for matching, never sent to the browser). */
export type RawJob = Job & { body: string };

function make(job: Omit<RawJob, "excerpt" | "body"> & { description: string }): RawJob {
  const { description, ...rest } = job;
  const body = toText(description);
  return { ...rest, body, excerpt: body.length > 300 ? `${body.slice(0, 297).trimEnd()}…` : body };
}

const money = (min?: number | string | null, max?: number | string | null, currency = "USD") => {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return null;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const sym = currency === "USD" ? "$" : `${currency} `;
  return lo && hi && lo !== hi ? `${sym}${fmt(lo)} – ${sym}${fmt(hi)}` : `${sym}${fmt(lo || hi)}`;
};

// ---- Remotive: https://remotive.com/api-documentation ----
interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  tags: string[];
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  category: string;
}

const remotive: Source = {
  id: "remotive",
  name: "Remotive",
  homepage: "https://remotive.com",
  minIntervalMs: 6 * HOUR,
  async fetch() {
    const data = await getJson<{ jobs: RemotiveJob[] }>("https://remotive.com/api/remote-jobs");
    return data.jobs.map((j) =>
      make({
        id: `remotive:${j.id}`,
        source: "remotive",
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        remote: true,
        url: j.url,
        tags: [...(j.tags ?? []), j.category].filter(Boolean),
        salary: j.salary?.trim() || null,
        // Remotive omits the timezone; its timestamps are UTC.
        postedAt: new Date(`${j.publication_date}Z`).toISOString(),
        description: j.description,
      }),
    );
  },
};

// ---- Remote OK: https://remoteok.com/api (first array element is the legal notice) ----
interface RemoteOkJob {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  date?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
}

const remoteok: Source = {
  id: "remoteok",
  name: "Remote OK",
  homepage: "https://remoteok.com",
  minIntervalMs: 1 * HOUR,
  async fetch() {
    const data = await getJson<RemoteOkJob[]>("https://remoteok.com/api");
    return data
      .filter((j) => j.id && j.position && j.url)
      .map((j) =>
        make({
          id: `remoteok:${j.id}`,
          source: "remoteok",
          title: j.position!,
          company: j.company ?? "Unknown",
          location: j.location || "Remote",
          remote: true,
          url: j.url!,
          tags: j.tags ?? [],
          salary: money(j.salary_min, j.salary_max),
          postedAt: new Date(j.date ?? Date.now()).toISOString(),
          description: j.description ?? "",
        }),
      );
  },
};

// ---- Arbeitnow: https://www.arbeitnow.com/api/job-board-api (mostly Europe, many on-site) ----
interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

const arbeitnow: Source = {
  id: "arbeitnow",
  name: "Arbeitnow",
  homepage: "https://www.arbeitnow.com",
  minIntervalMs: 1 * HOUR,
  async fetch() {
    const pages = await Promise.all(
      [1, 2].map((page) =>
        getJson<{ data: ArbeitnowJob[] }>(`https://www.arbeitnow.com/api/job-board-api?page=${page}`),
      ),
    );
    return pages
      .flatMap((p) => p.data)
      .map((j) =>
        make({
          id: `arbeitnow:${j.slug}`,
          source: "arbeitnow",
          title: j.title,
          company: j.company_name,
          location: j.remote ? `Remote · ${j.location}` : j.location,
          remote: j.remote,
          url: j.url,
          tags: [...(j.tags ?? []), ...(j.job_types ?? [])],
          salary: null,
          postedAt: new Date(j.created_at * 1000).toISOString(),
          description: j.description,
        }),
      );
  },
};

// ---- Jobicy: https://jobicy.com/jobs-rss-feed (API v2) ----
interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobDescription?: string;
  pubDate: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
}

const jobicy: Source = {
  id: "jobicy",
  name: "Jobicy",
  homepage: "https://jobicy.com",
  minIntervalMs: 1 * HOUR,
  async fetch() {
    const data = await getJson<{ jobs: JobicyJob[] }>("https://jobicy.com/api/v2/remote-jobs?count=100");
    return data.jobs.map((j) =>
      make({
        id: `jobicy:${j.id}`,
        source: "jobicy",
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        remote: true,
        url: j.url,
        tags: [...(j.jobIndustry ?? []), ...(j.jobType ?? []), j.jobLevel ?? ""].filter(Boolean),
        salary: money(j.salaryMin, j.salaryMax, j.salaryCurrency),
        postedAt: new Date(j.pubDate).toISOString(),
        description: j.jobDescription ?? "",
      }),
    );
  },
};

export const SOURCES: Source[] = [remotive, remoteok, arbeitnow, jobicy];
