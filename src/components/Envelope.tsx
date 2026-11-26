import { ChevronDown, FileText, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "react-router";
import type { Chip, Profile } from "../lib/profile.ts";
import { Clasp } from "./Clasp.tsx";

interface Props {
  profile: Profile;
  setProfile: (p: Profile | ((p: Profile) => Profile)) => void;
  dictionary: { skills: string[]; roles: string[] };
  upload: {
    upload: (f: File | undefined) => void;
    busy: boolean;
    error: string | null;
    notice: string | null;
    arrivedAt: number;
    suggestions: { key: string }[];
  };
}

/** The applicant's long brown envelope: the resume slip tucked in, skills and roles as typed tabs. */
export function Envelope({ profile, setProfile, dictionary, upload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const tabsId = useId();
  const hasTabs = profile.skills.length + profile.roles.length > 0;

  return (
    <section aria-labelledby="envelope-heading" className="relative">
      <h2 id="envelope-heading" className="sr-only">
        Your resume and skills
      </h2>

      {/* The resume slip, sticking out of the envelope's mouth. Doubles as the drop target. */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload.upload(e.dataTransfer.files[0]);
        }}
        disabled={upload.busy}
        key={upload.arrivedAt}
        className={`slip relative z-0 mx-4 block w-[calc(100%-2rem)] px-4 pt-3.5 pb-12 text-left transition-transform hover:-translate-y-1 disabled:cursor-wait ${
          upload.arrivedAt ? "into-envelope" : ""
        } ${dragging ? "-translate-y-2 outline-2 outline-dashed outline-ballpen" : ""}`}
      >
        <span className="caption text-ink-soft">Resume</span>
        {upload.busy ? (
          <span className="typed mt-1 block text-sm">Reading it…</span>
        ) : profile.resumeFileName ? (
          <span className="mt-1 flex items-center gap-2">
            <FileText className="text-ballpen size-4 shrink-0" aria-hidden />
            <span className="typed truncate text-sm font-bold">{profile.resumeFileName}</span>
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <Upload className="text-ballpen size-4 shrink-0" aria-hidden />
            Drop your resume here
          </span>
        )}
        <span className="text-ink-soft mt-0.5 block text-xs">
          {profile.resumeFileName ? "Drop or click to replace" : "or click to choose · PDF, DOCX or TXT"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose resume file"
        onChange={(e) => {
          upload.upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* The envelope body. */}
      <div className="bg-envelope relative z-10 -mt-9 rounded-[3px] px-4 pt-13 pb-5 shadow-[0_10px_24px_-10px_rgb(46_29_12/0.6)]">
        {/* printed border, as on a real long brown envelope */}
        <div className="border-band/45 pointer-events-none absolute inset-2 rounded-xs border" aria-hidden />
        {/* the flap's seams, meeting at the clasp */}
        <svg
          className="text-envelope-deep pointer-events-none absolute inset-x-0 top-0 h-6 w-full"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline points="0,0 50,22 100,0" fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <Clasp className="absolute top-0.5 left-1/2 h-11 w-30 -translate-x-1/2" />

        {(upload.error || upload.notice) && (
          <p
            role={upload.error ? "alert" : "status"}
            className={`slip mb-4 px-3 py-2 text-xs ${upload.error ? "text-string" : "text-ink"}`}
          >
            {upload.error ?? upload.notice}
            {!upload.error && upload.suggestions.length > 0 && (
              <>
                {" "}
                <Link to="/profile" className="text-ballpen font-semibold underline">
                  Review on your profile
                </Link>
              </>
            )}
          </p>
        )}

        {/* On phones the tabs fold away once there are some, so the jobs stay in the first screen. */}
        {hasTabs && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${tabsId}-tabs`}
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left text-sm font-bold text-envelope-ink lg:hidden"
          >
            <span>
              Skills and roles{" "}
              <span className="font-normal tabular-nums">
                ({profile.skills.filter((s) => s.on).length}/{profile.skills.length} on)
              </span>
            </span>
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
        <div id={`${tabsId}-tabs`} className={hasTabs && !open ? "hidden lg:block" : hasTabs ? "mt-4 lg:mt-0" : ""}>
          <TabGroup
            label="Skills"
            hint="Tap a tab to leave it out of the search."
            items={profile.skills}
            suggestions={dictionary.skills}
            onChange={(skills) => setProfile((p) => ({ ...p, skills }))}
          />
          <div className="mt-5">
            <TabGroup
              label="Roles"
              hint="Jobs with these in the title rank higher."
              items={profile.roles}
              suggestions={dictionary.roles}
              onChange={(roles) => setProfile((p) => ({ ...p, roles }))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface TabGroupProps {
  label: string;
  hint: string;
  items: Chip[];
  suggestions: string[];
  onChange: (items: Chip[]) => void;
}

function TabGroup({ label, hint, items, suggestions, onChange }: TabGroupProps) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const have = new Set(items.map((i) => i.name.toLowerCase()));
  const on = items.filter((i) => i.on).length;

  function add() {
    const name = draft.trim();
    if (name && !have.has(name.toLowerCase())) {
      const known = suggestions.find((s) => s.toLowerCase() === name.toLowerCase());
      onChange([...items, { name: known ?? name, on: true }]);
    }
    setDraft("");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-envelope-ink">{label}</h3>
        <span className="text-xs text-envelope-ink tabular-nums">
          {on}/{items.length} on
        </span>
      </div>
      <p className="mt-0.5 text-xs text-envelope-ink">{hint}</p>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i.name} className="flex">
              <button
                type="button"
                aria-pressed={i.on}
                onClick={() => onChange(items.map((x) => (x.name === i.name ? { ...x, on: !x.on } : x)))}
                className={`typed rounded-l-xs py-1 pr-1.5 pl-2 text-[0.8rem] transition-colors ${
                  i.on
                    ? "bg-bond text-ink shadow-[0_1px_1px_rgb(46_29_12/0.3)]"
                    : "border-envelope-ink/60 border border-r-0 border-dashed text-envelope-ink line-through grayscale"
                }`}
              >
                {i.name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${i.name}`}
                onClick={() => onChange(items.filter((x) => x.name !== i.name))}
                className={`rounded-r-xs px-1.5 text-xs transition-colors hover:text-string ${
                  i.on
                    ? "bg-bond text-ink-soft border-rule border-l shadow-[0_1px_1px_rgb(46_29_12/0.3)]"
                    : "border-envelope-ink/60 border border-dashed text-envelope-ink"
                }`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor={`${id}-in`} className="sr-only">
          Add {label.toLowerCase()}
        </label>
        <input
          id={`${id}-in`}
          list={`${id}-list`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add a ${label.toLowerCase().replace(/s$/, "")}`}
          className="typed bg-bond/90 placeholder:text-ink-soft min-w-0 flex-1 rounded-xs px-2.5 py-1.5 text-sm"
        />
        <datalist id={`${id}-list`}>
          {suggestions
            .filter((s) => !have.has(s.toLowerCase()))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-xs border-[1.5px] border-envelope-ink px-3 text-sm font-semibold text-envelope-ink hover:bg-black/5 disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </div>
  );
}
