import { Camera, Check, Download, Plus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { WORK_SETUPS, type WorkSetup } from "../../shared/appwrite.ts";
import { api } from "../api.ts";
import { stampDate } from "../components/JobSlip.tsx";
import { account } from "../lib/appwrite.ts";
import { authMessage, useAuth } from "../lib/auth.tsx";
import { downloadFile, squarePhoto, useFileUrl } from "../lib/files.ts";
import { useProfile } from "../lib/profile.ts";
import { applySuggestion, useResumeUpload, type Suggestion } from "../lib/useResumeUpload.ts";

const SETUP_LABEL: Record<WorkSetup, string> = { any: "Any", remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };

/** A bio-data sheet: the form every Filipino applicant has filled in, typed in Courier. */
export function ProfilePage() {
  const { user, reload, jwt, signOut } = useAuth();
  const { profile, setProfile, loaded, saveState, error, storeResume, storePhoto, removePhoto } = useProfile();
  const upload = useResumeUpload(profile, setProfile, storeResume);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [nameState, setNameState] = useState<string | null>(null);
  useEffect(() => setName(user?.name ?? ""), [user?.name]);

  async function saveName() {
    const next = name.trim();
    if (!next || next === user?.name) return;
    try {
      await account.updateName({ name: next });
      await reload();
      setNameState(null);
    } catch (e) {
      setNameState(authMessage(e));
    }
  }

  if (!loaded) return <div className="slip mx-auto h-[36rem] max-w-3xl animate-pulse opacity-70" aria-label="Loading profile" />;

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const on = profile.skills.filter((s) => s.on);
  const text = (key: "title" | "location" | "phone" | "education") => ({
    value: profile[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setProfile((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {upload.suggestions.length > 0 && (
        <ResumeSuggestions
          items={upload.suggestions}
          onApply={async (picked) => {
            for (const s of picked) await applySuggestion(s, setProfile, reload);
            upload.setSuggestions(upload.suggestions.filter((s) => !picked.includes(s)));
          }}
          onDismiss={() => upload.setSuggestions([])}
        />
      )}

      <article className="slip px-5 py-7 sm:px-10 sm:py-9" aria-labelledby="biodata">
        <header className="border-ink flex items-start justify-between gap-6 border-b-2 pb-4">
          <div>
            <h1 id="biodata" className="text-2xl font-extrabold tracking-tight">
              Bio-data
            </h1>
            <p className="text-ink-soft mt-1 text-sm">
              On file since <span className="typed">{user ? stampDate(user.$createdAt) : ""}</span>
              <span aria-hidden> · </span>
              <SaveNote state={saveState} />
            </p>
          </div>
          <PhotoBox
            initials={initials}
            fileId={profile.photoFileId}
            onUpload={async (file) => {
              const id = await storePhoto(await squarePhoto(file));
              setProfile((p) => ({ ...p, photoFileId: id }));
            }}
            onRemove={removePhoto}
          />
        </header>

        {error && (
          <p role="alert" className="bg-string-soft text-string mt-4 rounded-xs px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Row label="Name" htmlFor="pf-name">
            <input
              id="pf-name"
              className="field"
              value={name}
              maxLength={128}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
            {nameState && <p className="text-string mt-1 text-xs">{nameState}</p>}
          </Row>
          <Row label="Current title" htmlFor="pf-title">
            <input id="pf-title" className="field" placeholder="e.g. Full Stack Developer" maxLength={120} {...text("title")} />
          </Row>
          <Row label="Email">
            <p className="typed border-rule truncate border-b-[1.5px] px-0.5 py-1.5">{user?.email}</p>
          </Row>
          <Row label="Phone" htmlFor="pf-phone">
            <input
              id="pf-phone"
              className="field"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 0917 123 4567"
              maxLength={40}
              {...text("phone")}
            />
          </Row>
          <Row label="Location" htmlFor="pf-loc">
            <input id="pf-loc" className="field" placeholder="e.g. Cebu City" maxLength={120} {...text("location")} />
          </Row>
          <Row label="Years of experience" htmlFor="pf-years">
            <input
              id="pf-years"
              className="field"
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              value={profile.yearsExperience ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : Math.max(0, Math.min(60, Math.round(Number(e.target.value))));
                setProfile((p) => ({ ...p, yearsExperience: Number.isFinite(v) ? v : null }));
              }}
            />
          </Row>
          <div className="sm:col-span-2">
            <Row label="Education" htmlFor="pf-edu">
              <input
                id="pf-edu"
                className="field"
                placeholder="e.g. BS Information Technology — University of San Carlos"
                maxLength={255}
                {...text("education")}
              />
            </Row>
          </div>
        </div>

        <Links links={profile.links} onChange={(links) => setProfile((p) => ({ ...p, links }))} />

        <fieldset className="mt-6">
          <legend className="caption text-ink-soft">Preferred work setup</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {WORK_SETUPS.map((w) => (
              <label key={w} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="workSetup"
                  value={w}
                  checked={profile.workSetup === w}
                  onChange={() => setProfile((p) => ({ ...p, workSetup: w }))}
                  className="accent-ballpen size-4"
                />
                {SETUP_LABEL[w]}
              </label>
            ))}
          </div>
          <p className="text-ink-soft mt-1.5 text-xs">"Remote" turns on the Remote only filter when you open Jobs.</p>
        </fieldset>

        <section className="border-rule mt-8 border-t pt-6" aria-labelledby="pf-resume">
          <h2 id="pf-resume" className="caption text-ink-soft">
            Resume on file
          </h2>
          <p className="text-ink-soft mt-1 text-xs">Uploading one fills in empty fields above and lists anything that differs.</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="typed min-w-0 flex-1 truncate font-bold">{profile.resumeFileName ?? "None yet"}</p>
            {profile.resumeFileId && (
              <button
                type="button"
                className="btn-quiet text-ink"
                onClick={async () => {
                  setDownloadError(null);
                  try {
                    await downloadFile(await jwt(), profile.resumeFileId!, profile.resumeFileName ?? "resume");
                  } catch (e) {
                    setDownloadError((e as Error).message);
                  }
                }}
              >
                <Download className="size-4" aria-hidden /> Download
              </button>
            )}
            <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={upload.busy}>
              <Upload className="size-4" aria-hidden />
              {upload.busy ? "Reading…" : profile.resumeFileId ? "Replace" : "Upload"}
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
          </div>
          {(upload.error || upload.notice || downloadError) && (
            <p
              role={upload.error || downloadError ? "alert" : "status"}
              className={`mt-2 text-sm ${upload.error || downloadError ? "text-string" : "text-ink-soft"}`}
            >
              {downloadError ?? upload.error ?? upload.notice}
            </p>
          )}
          <p className="mt-4 text-sm">
            <span className="caption text-ink-soft mr-2">Skills searched</span>
            <span className="typed">{on.length ? on.map((s) => s.name).join(", ") : "none. Edit them on the Jobs page."}</span>
          </p>
        </section>
      </article>

      <PasswordForm />
      <DeleteAccount
        onDelete={async () => {
          await api.deleteMe(await jwt());
          await signOut();
          navigate("/sign-up", { replace: true });
        }}
      />
    </div>
  );
}

/** The 2x2 photo box: initials until a photo is added; click to add or replace. */
function PhotoBox(props: {
  initials: string;
  fileId: string | null;
  onUpload: (f: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const url = useFileUrl(props.fileId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={props.fileId ? "Replace your photo" : "Add a photo"}
        className={`group relative grid size-24 place-items-center overflow-hidden transition-colors sm:size-28 ${
          props.fileId ? "border-ink border" : "border-ink-soft hover:border-ballpen border border-dashed"
        }`}
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="typed text-3xl font-bold" aria-hidden>
            {busy || (props.fileId && !url) ? "…" : props.initials}
          </span>
        )}
        <span className="bg-ink/75 absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-3" aria-hidden /> {props.fileId ? "Replace" : "Add photo"}
        </span>
      </button>
      <span className="caption text-ink-soft">{props.fileId ? "2x2 photo" : "Add a 2x2 photo"}</span>
      {props.fileId && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await props.onRemove();
            setBusy(false);
          }}
          className="text-string text-xs font-semibold hover:underline"
        >
          Remove photo
        </button>
      )}
      {error && (
        <p role="alert" className="text-string max-w-40 text-center text-xs">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a photo"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            await props.onUpload(f);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function Links({ links, onChange }: { links: string[]; onChange: (l: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  function add() {
    let v = draft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    try {
      if (!new URL(v).hostname.includes(".")) throw new Error();
    } catch {
      setInvalid(true);
      return;
    }
    if (!links.some((l) => l.toLowerCase() === v.toLowerCase())) onChange([...links, v].slice(0, 8));
    setDraft("");
    setInvalid(false);
  }

  return (
    <div className="mt-6">
      <span className="caption text-ink-soft">Links</span>
      {links.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {links.map((l) => (
            <li key={l} className="flex items-center gap-2 text-sm">
              <a href={l} target="_blank" rel="noopener noreferrer" className="typed text-ballpen min-w-0 truncate underline">
                {l.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
              <button
                type="button"
                aria-label={`Remove ${l}`}
                onClick={() => onChange(links.filter((x) => x !== l))}
                className="text-ink-soft hover:text-string shrink-0 rounded-xs p-0.5"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-1 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="pf-link" className="sr-only">
          Add a link
        </label>
        <input
          id="pf-link"
          className="field"
          inputMode="url"
          placeholder="linkedin.com/in/you, github.com/you, portfolio"
          value={draft}
          aria-invalid={invalid}
          aria-describedby={invalid ? "pf-link-err" : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
        />
        <button type="submit" disabled={!draft.trim()} className="btn-quiet text-ink shrink-0 px-2.5! py-1.5!">
          <Plus className="size-4" aria-hidden /> Add
        </button>
      </form>
      {invalid && (
        <p id="pf-link-err" className="text-string mt-1 text-xs">
          That doesn't look like a web address.
        </p>
      )}
    </div>
  );
}

/** Details read from the newly uploaded resume that differ from the profile, each with its own Apply. */
function ResumeSuggestions(props: { items: Suggestion[]; onApply: (s: Suggestion[]) => Promise<void>; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const apply = async (s: Suggestion[]) => {
    setBusy(true);
    await props.onApply(s);
    setBusy(false);
  };
  return (
    <section className="slip relative px-5 pt-6 pb-5 sm:px-8" aria-labelledby="sugg-heading">
      <span className="stamp text-stamp absolute -top-3 right-4 text-[0.7rem]" style={{ rotate: "3deg" }}>
        From your resume
      </span>
      <h2 id="sugg-heading" className="font-bold">
        Your resume says something different
      </h2>
      <p className="text-ink-soft mt-0.5 text-sm">Pick what to keep. Nothing changes until you apply it.</p>
      <ul className="border-rule divide-rule mt-3 divide-y border-y">
        {props.items.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
            <span className="caption text-ink-soft w-36 shrink-0">{s.label}</span>
            <span className="min-w-0 flex-1">
              <span className="typed font-bold break-words">{s.value}</span>
              <span className="text-ink-soft block text-xs">
                now: <span className="typed">{s.current}</span>
              </span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => apply([s])}
              className="text-ballpen inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              <Check className="size-3.5" aria-hidden /> Use this
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} className="btn" onClick={() => apply(props.items)}>
          Use all from resume
        </button>
        <button type="button" disabled={busy} className="btn-quiet text-ink" onClick={props.onDismiss}>
          Keep my profile as is
        </button>
      </div>
    </section>
  );
}

function SaveNote({ state }: { state: string }) {
  const text = { idle: "changes save as you type", saving: "saving…", saved: "saved", error: "not saved" }[state];
  return <span className={`typed ${state === "error" ? "text-string" : ""}`}>{text}</span>;
}

function Row(props: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.htmlFor} className="caption text-ink-soft block">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

function PasswordForm() {
  const [oldPassword, setOld] = useState("");
  const [password, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await account.updatePassword({ password, oldPassword });
      setOld("");
      setNew("");
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: authMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="slip px-5 py-6 sm:px-10" aria-labelledby="pw-heading">
      <h2 id="pw-heading" className="font-bold">
        Change password
      </h2>
      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Row label="Current password" htmlFor="pw-old">
          <input
            id="pw-old"
            type="password"
            className="field"
            autoComplete="current-password"
            required
            value={oldPassword}
            onChange={(e) => setOld(e.target.value)}
          />
        </Row>
        <Row label="New password (8+ characters)" htmlFor="pw-new">
          <input
            id="pw-new"
            type="password"
            className="field"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setNew(e.target.value)}
          />
        </Row>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={busy || !oldPassword || password.length < 8}>
          {busy ? "Changing…" : "Change password"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ink-soft" : "text-string"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

function DeleteAccount({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="border-string/40 rounded-[3px] border-2 border-dashed px-5 py-5 sm:px-10" aria-labelledby="del-heading">
      <h2 id="del-heading" className="text-desk-ink font-bold">
        Delete account
      </h2>
      <p className="text-desk-ink mt-1 text-sm">Removes your account, profile, photo and stored resume for good.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="btn bg-string! hover:bg-[#8f1d17]!"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onDelete();
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button type="button" className="btn-quiet text-desk-ink" onClick={() => setConfirming(false)} disabled={busy}>
              Keep my account
            </button>
          </>
        ) : (
          <button type="button" className="btn-quiet text-string bg-bond/70" onClick={() => setConfirming(true)}>
            Delete my account
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-string mt-2 text-sm font-semibold">
          {error}
        </p>
      )}
    </section>
  );
}
