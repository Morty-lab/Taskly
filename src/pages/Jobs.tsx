import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SearchResponse, SourceId } from "../../shared/types.ts";
import { api } from "../api.ts";
import { Envelope } from "../components/Envelope.tsx";
import { JobSlip, OPEN_TO_PH, ago } from "../components/JobSlip.tsx";
import { useProfile } from "../lib/profile.ts";
import { useResumeUpload } from "../lib/useResumeUpload.ts";

const PAGE = 25;
type Posted = "any" | "7" | "30";

export function JobsPage() {
  const { profile, setProfile, loaded, storeResume, error: profileError } = useProfile();
  const upload = useResumeUpload(profile, setProfile, storeResume);
  const [dictionary, setDictionary] = useState({ skills: [] as string[], roles: [] as string[] });

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceId | "all">("all");
  const [posted, setPosted] = useState<Posted>("any");
  const [minMatches, setMinMatches] = useState(1);
  const [openToPh, setOpenToPh] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(profile.workSetup === "remote");
  const [shown, setShown] = useState(PAGE);
  const [moreOpen, setMoreOpen] = useState(false);
  const activeExtras = [source !== "all", posted !== "any", minMatches > 1, remoteOnly].filter(Boolean).length;

  useEffect(() => {
    api.dictionary().then(setDictionary).catch(() => {});
  }, []);
  useEffect(() => {
    if (loaded) setRemoteOnly(profile.workSetup === "remote");
  }, [loaded, profile.workSetup]);

  const skills = useMemo(() => profile.skills.filter((s) => s.on).map((s) => s.name), [profile.skills]);
  const roles = useMemo(() => profile.roles.filter((r) => r.on).map((r) => r.name), [profile.roles]);
  const key = JSON.stringify([skills, roles]);

  useEffect(() => {
    if (!skills.length) {
      setResult(null);
      return;
    }
    let stale = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      api
        .search({ skills, roles })
        .then((r) => !stale && setResult(r))
        .catch((e) => !stale && setError(e.message))
        .finally(() => !stale && setLoading(false));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
    // `key` is the serialized skills + roles: search again only when they change.
  }, [key]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await api.refresh();
      setResult(await api.search({ skills, roles }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    const cutoff = posted === "any" ? 0 : Date.now() - Number(posted) * 86_400_000;
    return result.jobs.filter(
      (j) =>
        j.matched.length >= minMatches &&
        (source === "all" || j.source === source) &&
        (!remoteOnly || j.remote) &&
        (!openToPh || OPEN_TO_PH.test(j.location)) &&
        Date.parse(j.postedAt) >= cutoff &&
        (!q || `${j.title} ${j.company} ${j.location} ${j.tags.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [result, query, source, remoteOnly, openToPh, posted, minMatches]);

  useEffect(() => setShown(PAGE), [filtered]);

  const sources = new Map(result?.sources.map((s) => [s.id, s]));
  const newest = result?.sources.map((s) => s.fetchedAt).filter(Boolean).sort().at(-1) ?? null;
  const failing = result?.sources.filter((s) => s.error) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[21rem_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        {loaded ? (
          <Envelope profile={profile} setProfile={setProfile} dictionary={dictionary} upload={upload} />
        ) : (
          <div className="bg-envelope/60 h-72 animate-pulse rounded-[3px]" aria-label="Loading your profile" />
        )}
        {profileError && (
          <p role="alert" className="slip text-string mt-3 px-3 py-2 text-xs">
            {profileError}
          </p>
        )}
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="text-desk-ink mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="results-heading" className="text-2xl font-extrabold tracking-tight text-desk-ink">
              Jobs that match your envelope
            </h1>
            {result && (
              <p className="mt-1 text-sm font-medium tabular-nums" aria-live="polite">
                {filtered.length} of {result.total.toLocaleString()} postings · boards checked {ago(newest)}
              </p>
            )}
          </div>
          {result && (
            <button type="button" onClick={refresh} disabled={refreshing} className="btn-quiet text-desk-ink">
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              {refreshing ? "Checking boards…" : "Check for new jobs"}
            </button>
          )}
        </div>

        {!loaded ? (
          <div className="space-y-4" aria-label="Loading">
            {[0, 1].map((i) => (
              <div key={i} className="slip h-40 animate-pulse opacity-70" />
            ))}
          </div>
        ) : !skills.length ? (
          <EmptyState hasSkills={profile.skills.length > 0} />
        ) : (
          <>
            <form
              className="slip mb-5 grid gap-x-5 gap-y-3 px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-[1.6fr_repeat(3,1fr)]"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Filter jobs"
            >
              <label className="block sm:col-span-2 xl:col-span-1">
                <span className="caption text-ink-soft">Look for</span>
                <span className="relative block">
                  <Search className="text-ink-soft absolute top-2.5 left-0 size-4" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="title, company, place"
                    className="field pl-6!"
                  />
                </span>
              </label>
              <div className="sm:col-span-2 lg:hidden">
                <Check label="Open to the Philippines" hint="worldwide, APAC or PH" checked={openToPh} onChange={setOpenToPh} />
              </div>
              {/* On phones the less-used filters fold away so the first job lands in the first screen. */}
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="more-filters"
                onClick={() => setMoreOpen((o) => !o)}
                className="text-ballpen flex items-center gap-1.5 text-sm font-semibold sm:col-span-2 lg:hidden"
              >
                {moreOpen ? "Fewer filters" : `More filters${activeExtras ? ` (${activeExtras} on)` : ""}`}
                <ChevronDown className={`size-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              <div id="more-filters" className={moreOpen ? "contents" : "hidden lg:contents"}>
                <FieldSelect label="Board" value={source} onChange={(v) => setSource(v as SourceId | "all")}>
                  <option value="all">All boards</option>
                  {result?.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </FieldSelect>
                <FieldSelect label="Posted" value={posted} onChange={(v) => setPosted(v as Posted)}>
                  <option value="any">Any time</option>
                  <option value="7">Past week</option>
                  <option value="30">Past month</option>
                </FieldSelect>
                <FieldSelect label="At least" value={String(minMatches)} onChange={(v) => setMinMatches(Number(v))}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} skill{n > 1 ? "s" : ""} matched
                    </option>
                  ))}
                </FieldSelect>
                <div className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2 lg:col-span-full">
                  <div className="hidden lg:block">
                    <Check label="Open to the Philippines" hint="worldwide, APAC or PH" checked={openToPh} onChange={setOpenToPh} />
                  </div>
                  <Check label="Remote only" checked={remoteOnly} onChange={setRemoteOnly} />
                </div>
              </div>
            </form>

            {error && (
              <p role="alert" className="slip text-string mb-4 px-4 py-3 text-sm">
                {error}
              </p>
            )}

            {loading && !result ? (
              <div className="space-y-4" aria-label="Loading jobs">
                <p className="text-desk-ink text-sm font-medium">Checking four job boards. The first look takes a few seconds…</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="slip h-40 animate-pulse opacity-70" />
                ))}
              </div>
            ) : (
              <div className={`space-y-4 transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
                {filtered.slice(0, shown).map((j, i) => (
                  <JobSlip key={j.id} job={j} rank={i} source={sources.get(j.source)} totalSkills={skills.length} />
                ))}
              </div>
            )}

            {filtered.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="btn-quiet mt-5 w-full text-desk-ink"
              >
                Show {Math.min(PAGE, filtered.length - shown)} more ({filtered.length - shown} left)
              </button>
            )}

            {result && !loading && filtered.length === 0 && (
              <div className="slip px-6 py-8 text-center">
                <p className="font-semibold">Nothing matches these filters.</p>
                <p className="text-ink-soft mt-1 text-sm">
                  Loosen a filter above, or switch more skill tabs back on in your envelope.
                </p>
              </div>
            )}

            {failing.length > 0 && (
              <ul className="typed text-desk-ink mt-6 space-y-1 text-xs">
                {failing.map((s) => (
                  <li key={s.id}>
                    {s.name} didn't answer last time ({s.error}). Showing its last saved jobs.
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ hasSkills }: { hasSkills: boolean }) {
  return (
    <div className="slip max-w-2xl px-6 py-7 sm:px-8">
      <h2 className="text-lg font-bold">{hasSkills ? "Every skill tab is switched off" : "Put your resume in the envelope"}</h2>
      <p className="text-ink-soft mt-2 text-[0.95rem] leading-relaxed">
        {hasSkills
          ? "Tap a tab in your envelope to switch it back on, and matching jobs will appear here."
          : "Drop it on the slip at the left. We read the skills and roles it mentions, then rank remote jobs from four boards by how many of them each posting asks for. You can also type your skills in by hand."}
      </p>
    </div>
  );
}

function FieldSelect(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="caption text-ink-soft">{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)} className="field cursor-pointer">
        {props.children}
      </select>
    </label>
  );
}

function Check(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="accent-ballpen size-4"
      />
      <span className="font-medium">{props.label}</span>
      {props.hint && <span className="text-ink-soft text-xs">({props.hint})</span>}
    </label>
  );
}
