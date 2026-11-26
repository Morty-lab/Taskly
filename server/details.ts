// Pulls profile details out of resume text with plain heuristics (no AI): section headings, date
// ranges, phone formats and a list of Philippine cities. Every field is best-effort and may be null;
// the UI only fills empty fields automatically and offers the rest as suggestions.

import type { ResumeDetails } from "../shared/types.ts";

const ROLE_WORDS =
  /\b(developer|engineer|programmer|designer|architect|analyst|manager|consultant|specialist|administrator|admin|lead|intern|scientist|officer|assistant|associate|technician|coordinator|director|tester|qa|devops|sre|writer|editor|marketer|accountant|representative|agent|supervisor|head|cto|ceo|freelancer|virtual assistant)\b/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Common section headings. A heading is a short line that is (mostly) one of these.
const HEADINGS: [string, RegExp][] = [
  ["experience", /^(?:work|professional|relevant|employment|career)?\s*(?:experience|history|employment(?: history)?)$/i],
  ["education", /^(?:education(?:al)?(?: background| attainment)?|academic (?:background|history)|academics)$/i],
  ["skills", /^(?:technical |core |key )?(?:skills|competencies|technologies|tech stack|expertise)(?: & tools| and tools)?$/i],
  ["projects", /^(?:personal |selected |key )?projects$/i],
  ["summary", /^(?:professional |career )?(?:summary|profile|objective|about me|about)$/i],
  ["other", /^(?:certifications?|licenses?|awards?|achievements|languages|interests|hobbies|references|trainings?(?: (?:and|&) seminars)?|seminars|affiliations|volunteer(?: experience| work)?|contact(?: information| details)?|personal (?:information|details|data))$/i],
];

const PH_CITIES = [
  "Manila", "Quezon City", "Makati", "Taguig", "Pasig", "Mandaluyong", "Pasay", "Parañaque", "Paranaque",
  "Las Piñas", "Las Pinas", "Muntinlupa", "Marikina", "San Juan", "Caloocan", "Valenzuela", "Malabon",
  "Navotas", "Pateros", "Cebu City", "Cebu", "Mandaue", "Lapu-Lapu", "Talisay", "Davao City", "Davao",
  "Cagayan de Oro", "Iloilo City", "Iloilo", "Bacolod", "Baguio", "Zamboanga City", "Zamboanga",
  "General Santos", "Antipolo", "Dasmariñas", "Dasmarinas", "Bacoor", "Imus", "Calamba", "Santa Rosa",
  "Biñan", "Binan", "San Pedro", "Angeles", "San Fernando", "Olongapo", "Batangas City", "Lipa",
  "Lucena", "Naga", "Legazpi", "Tacloban", "Dumaguete", "Tagbilaran", "Puerto Princesa", "Butuan",
  "Iligan", "Cotabato", "Malolos", "Meycauayan", "Tarlac City", "Cabanatuan", "Dagupan", "Laoag",
];
const CITY_RE = new RegExp(`\\b(${PH_CITIES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const words = (s: string) => clean(s).split(" ").filter(Boolean);

function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
}

function headingOf(line: string): string | null {
  const t = clean(line).replace(/[:|•·_-]+$/g, "").trim();
  if (!t || words(t).length > 5) return null;
  for (const [key, re] of HEADINGS) if (re.test(t)) return key;
  return null;
}

/** Splits lines into named sections; everything before the first heading is "header". */
function sections(lines: string[]) {
  const out: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const line of lines) {
    const h = headingOf(line);
    if (h) {
      current = h;
      out[current] ??= [];
      continue;
    }
    (out[current] ??= []).push(line);
  }
  return out;
}

function findName(header: string[]): string | null {
  for (const raw of header.slice(0, 8)) {
    // Header lines often hold several fields separated by | or •; the name is usually the first.
    const line = clean(raw.split(/[|•·]/)[0]);
    const w = words(line);
    if (w.length < 2 || w.length > 5) continue;
    if (/[\d@/:]|https?|www\./i.test(line)) continue;
    if (ROLE_WORDS.test(line) || /resume|curriculum|vitae|\bcv\b/i.test(line)) continue;
    if (!w.every((x) => /^[\p{Lu}][\p{L}.'-]*$/u.test(x) || /^(de|del|dela|de la|van|von|da|dos|y)$/i.test(x))) continue;
    return titleCase(line);
  }
  return null;
}

/** Strips dates, company names and separators from a job line, leaving the role. */
function roleFrom(line: string): string | null {
  let t = clean(line)
    .replace(/\(?\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}.*$/i, "")
    .replace(/\(?\b(?:19|20)\d{2}\b.*$/, "");
  t = t.split(/\s+(?:at|@)\s+|\s[|–—]\s|\s-\s|,\s/)[0];
  t = clean(t.replace(/[|•·,:;-]+$/, ""));
  const w = words(t);
  if (!w.length || w.length > 8 || !ROLE_WORDS.test(t)) return null;
  return titleCase(t);
}

function findTitle(header: string[], experience: string[] | undefined): string | null {
  for (const line of header.slice(1, 10)) {
    for (const part of line.split(/[|•·]/)) {
      if (/@|https?:|www\.|\d{4}/.test(part)) continue;
      const r = roleFrom(part);
      if (r) return r;
    }
  }
  for (const line of experience?.slice(0, 12) ?? []) {
    const r = roleFrom(line);
    if (r) return r;
  }
  return null;
}

function findLocation(lines: string[]): string | null {
  for (const line of lines.slice(0, 60)) {
    const m = /\b(?:address|location|based in|city|residence)\s*[:\-–]\s*(.+)$/i.exec(line);
    if (m) {
      const v = clean(m[1].split(/[|•·]/)[0]).replace(/\b\d{4}\b/g, "").replace(/,\s*$/, "");
      if (v.length >= 3 && v.length <= 120) return shortenAddress(v);
    }
  }
  for (const line of lines.slice(0, 15)) {
    for (const part of line.split(/[|•·]/)) {
      if (/@|https?:|www\./i.test(part)) continue;
      const city = CITY_RE.exec(part);
      if (city) return shortenAddress(clean(part));
      const m = /\b([A-Z][a-zA-Z.]+(?: [A-Z][a-zA-Z.]+)*),\s*(Philippines|PH)\b/.exec(part);
      if (m) return `${m[1]}, Philippines`;
    }
  }
  const anywhere = CITY_RE.exec(lines.slice(0, 40).join(" "));
  return anywhere ? anywhere[1] : null;
}

/** "Blk 4 Lot 2, Brgy. Lahug, Cebu City, Cebu 6000" → "Cebu City, Cebu". */
function shortenAddress(v: string): string {
  const parts = v.split(",").map(clean).filter(Boolean);
  const cityIdx = parts.findIndex((p) => CITY_RE.test(p));
  const kept = cityIdx >= 0 ? parts.slice(cityIdx, cityIdx + 2) : parts.slice(-2);
  return kept.join(", ").replace(/\s+\d{4}$/, "").slice(0, 120);
}

function findPhone(text: string): string | null {
  const ph = /(?:\+?63|0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/.exec(text);
  if (ph) return clean(ph[0]);
  for (const m of text.matchAll(/\+?\d[\d\s().-]{8,18}\d/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}/.test(digits)) return clean(m[0]);
  }
  return null;
}

function findLinks(text: string): string[] {
  const found = new Map<string, string>();
  // Whole URL-ish tokens: optional scheme, a dotted host, optional path.
  const re = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|•·,;()<>"]*)?/gi;
  const PROFILE = /(^|\.)(linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|github\.io)$/;
  // Personal-site endings that are rarely an employer's or school's domain.
  const PERSONAL = /\.(dev|io|me|app|page|site|xyz|tech|codes|netlify\.app|vercel\.app|pages\.dev)$/;
  for (const m of text.matchAll(re)) {
    const prev = text[m.index - 1] ?? "";
    if (prev === "@" || /[\w.-]/.test(prev)) continue; // inside an email address or a longer word
    if (text[m.index + m[0].length] === "@") continue;
    const explicit = /^https?:\/\//i.test(m[0]);
    let url = m[0].replace(/[).,;:!?]+$/, "");
    if (!explicit) url = `https://${url}`;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (/(gmail|yahoo|outlook|hotmail|icloud|proton)\./.test(host)) continue;
    // Without a scheme, only keep profile hosts and personal-site domains; "acme.com" in a job line
    // is usually the employer, not the applicant's link.
    if (!explicit && !PROFILE.test(host) && !PERSONAL.test(host)) continue;
    if (PROFILE.test(host) && /^(linkedin|github|gitlab)\.com$/.test(host) && u.pathname.length <= 1) continue;
    found.set(`${host}${u.pathname}`.replace(/\/$/, "").toLowerCase(), `https://${host}${u.pathname}`.replace(/\/$/, ""));
  }
  return [...found.values()].slice(0, 5);
}

function monthIndex(month: string | undefined, num: string | undefined, end: boolean) {
  if (month) return MONTHS.indexOf(month.slice(0, 3).toLowerCase());
  if (num) return Math.min(11, Math.max(0, Number(num) - 1));
  return end ? 11 : 0; // a bare year counts as the whole year
}

function findYears(text: string, experience: string[] | undefined, education: string[] | undefined): number | null {
  const stated = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:[a-z-]+\s+){0,3}experience/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n < 50);
  if (stated.length) return Math.max(...stated);

  const scope = experience?.length ? experience.join("\n") : text.replace((education ?? []).join("\n"), "");
  const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
  const re = new RegExp(
    `(?:${MON}\\s+|(\\d{1,2})[/.-])?((?:19|20)\\d{2})\\s*(?:-|–|—|to|until)\\s*(?:(?:${MON}\\s+|(\\d{1,2})[/.-])?((?:19|20)\\d{2})|(present|current|now|date|today))`,
    "gi",
  );
  const now = new Date();
  const ranges: [number, number][] = [];
  for (const m of scope.matchAll(re)) {
    const start = Number(m[3]) * 12 + monthIndex(m[1], m[2], false);
    const end = m[7] ? now.getFullYear() * 12 + now.getMonth() : Number(m[6]) * 12 + monthIndex(m[4], m[5], true);
    if (end >= start && end - start < 50 * 12) ranges.push([start, end]);
  }
  if (!ranges.length) return null;
  // Merge overlapping jobs so concurrent roles don't double-count.
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = ranges[0];
  for (const [a, b] of ranges.slice(1)) {
    if (a <= e + 1) e = Math.max(e, b);
    else {
      total += e - s + 1;
      [s, e] = [a, b];
    }
  }
  total += e - s + 1;
  const years = Math.floor(total / 12);
  return years >= 1 && years < 50 ? years : null;
}

function findEducation(education: string[] | undefined): string | null {
  if (!education?.length) return null;
  const DEGREE =
    /\b(bachelor|master|doctor(?:ate)?|ph\.?\s?d|mba|associate|diploma|b\.?\s?s\.?\s?(?:c\.?)?|b\.?\s?a\.?|m\.?\s?s\.?|bsit|bscs|bsis|bsece|bsee|bsme|bsce|bsba|bsa|bsed|beed|abcomm)\b/i;
  const SCHOOL = /\b(university|college|institute|school|academy|polytechnic|universidad)\b/i;
  const stripDates = (s: string) =>
    clean(s.replace(/\(?\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?[a-z]*\.?\s*(?:19|20)\d{2}\b.*$/i, "").trim().replace(/[\s|•·,–—-]+$/, ""));
  const lines = education.slice(0, 12).map(stripDates).filter(Boolean);
  const degree = lines.find((l) => DEGREE.test(l));
  const school = lines.find((l) => SCHOOL.test(l));
  const parts = [degree, school && school !== degree ? school : null].filter(Boolean) as string[];
  if (!parts.length) return null;
  return parts.join(" — ").slice(0, 255);
}

export function extractDetails(text: string): ResumeDetails {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const s = sections(lines);
  return {
    name: findName(s.header),
    title: findTitle(s.header, s.experience),
    location: findLocation(lines),
    yearsExperience: findYears(text, s.experience, s.education),
    phone: findPhone(text),
    links: findLinks(text),
    education: findEducation(s.education),
  };
}
