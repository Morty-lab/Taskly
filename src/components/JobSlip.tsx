import { ArrowUpRight } from "lucide-react";
import type { ScoredJob, SourceStatus } from "../../shared/types.ts";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function ago(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return rtf.format(-Math.max(mins, 0), "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return days < 30 ? rtf.format(-days, "day") : stampDate(iso);
}

/** "25 NOV 2026": the way a received-stamp prints a date. */
export const stampDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

export const OPEN_TO_PH = /worldwide|anywhere|global|asia|apac|philippines|southeast|\bsea\b|gmt\+8|utc\+8/i;

interface Props {
  job: ScoredJob;
  source?: SourceStatus;
  totalSkills: number;
  rank: number;
}

/** One posting, on a slip of long bond, stamped with how well it matches. */
export function JobSlip({ job, source, totalSkills, rank }: Props) {
  const isNew = Date.now() - Date.parse(job.postedAt) < 3 * 86_400_000;
  const openToPh = OPEN_TO_PH.test(job.location);
  // Slight, stable tilt per slip so the stamps look pressed by hand, not rendered.
  const lead = rank === 0;
  // The best match gets a big stamp pressed half off the slip's corner; the rest a small hand-tilted one.
  const tilt = lead ? -7 : ((job.id.charCodeAt(job.id.length - 1) % 5) - 3) * 1.2;
  const strong = rank < 3;

  const matchStamp = (
    <div
      className={`stamp stamp-press text-stamp shrink-0 flex-col gap-0! ${
        lead ? "absolute -top-5 -right-2 border-[3px]! px-3.5 py-1.5 sm:-right-5" : ""
      }`}
      style={{ "--tilt": `${tilt}deg`, rotate: `${tilt}deg` } as React.CSSProperties}
      title={`Mentions ${job.matched.length} of your ${totalSkills} skills`}
      aria-label={`Matches ${job.matched.length} of your ${totalSkills} skills`}
    >
      <span className={`leading-none tabular-nums ${lead ? "text-4xl" : "text-lg"}`}>
        {job.matched.length}/{totalSkills}
      </span>
      <span className={`tracking-[0.14em] ${lead ? "text-xs" : "text-[0.6rem]"}`}>{lead ? "Best match" : "Match"}</span>
    </div>
  );

  return (
    <article className={`slip relative px-5 pb-4 sm:px-6 ${lead ? "pt-7" : "pt-5"}`} aria-labelledby={`job-${job.id}`}>
      {lead && matchStamp}
      <div className="flex items-start gap-4">
        <div className={`min-w-0 flex-1 ${lead ? "pr-24 sm:pr-28" : ""}`}>
          <h3 id={`job-${job.id}`} className="text-[1.05rem] leading-snug font-bold text-balance">
            <a href={job.url} target="_blank" rel="noopener" className="hover:text-ballpen hover:underline">
              {job.title}
            </a>
          </h3>
          <p className="text-ink-soft mt-1 text-sm">
            <span className="text-ink font-semibold">{job.company}</span>
            <span aria-hidden> · </span>
            {job.location}
          </p>
        </div>

        {!lead && matchStamp}
      </div>

      {(isNew || openToPh) && (
        <div className="mt-2.5 flex flex-wrap gap-2 text-[0.7rem]">
          {isNew && <span className="stamp text-stamp">New</span>}
          {openToPh && <span className="stamp text-stamp">Open to PH</span>}
        </div>
      )}

      {job.snippets.length > 0 ? (
        <ul className="border-rule mt-3.5 space-y-1.5 border-t pt-3" aria-label="Where your skills appear">
          {job.snippets.slice(0, strong ? 3 : 2).map((s) => (
            <li key={s.skill} className="text-ink-soft text-sm leading-relaxed">
              {s.before}
              <mark className="text-ink decoration-ballpen bg-transparent font-semibold underline decoration-2 underline-offset-[3px]">
                {s.hit}
              </mark>
              {s.after}
            </li>
          ))}
        </ul>
      ) : (
        job.excerpt && <p className="text-ink-soft border-rule mt-3.5 line-clamp-2 border-t pt-3 text-sm">{job.excerpt}</p>
      )}

      <p className="mt-3 text-xs">
        <span className="caption text-ink-soft mr-1.5">Matched</span>
        <span className="font-medium">{job.matched.join(" · ")}</span>
      </p>

      <div className="border-rule mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs">
        <span className="typed text-ink-soft" title={new Date(job.postedAt).toLocaleString()}>
          Posted {ago(job.postedAt)}
        </span>
        {job.salary && <span className="typed font-bold">{job.salary}</span>}
        <span className="text-ink-soft">
          via{" "}
          {/* Each board's terms ask for a credited, followed link back. */}
          <a href={source?.homepage} target="_blank" rel="noopener" className="text-ink font-semibold underline">
            {source?.name ?? job.source}
          </a>
        </span>
        <a href={job.url} target="_blank" rel="noopener" className="btn ml-auto py-1.5!">
          View posting <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
    </article>
  );
}
