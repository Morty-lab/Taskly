import { Ban, CircleCheck, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminUser, AdminUsersResponse } from "../../shared/appwrite.ts";
import { api } from "../api.ts";
import { ago, stampDate } from "../components/JobSlip.tsx";
import { useAuth } from "../lib/auth.tsx";
import { useFileUrl } from "../lib/files.ts";

/** Sign-ups, kept like a received-applications logbook. */
export function AdminPage() {
  const { jwt, user } = useAuth();
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markedSeen = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await jwt();
      setData(await api.admin.users(token, search.trim(), offset));
      // Record this visit once, after the "new" stamps for this visit have been computed.
      if (!markedSeen.current) {
        markedSeen.current = true;
        api.admin.markSeen(token).catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [jwt, search, offset]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function act(fn: (token: string) => Promise<void>) {
    setError(null);
    try {
      await fn(await jwt());
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-desk-ink">Users</h1>
          {data && (
            <p className="mt-1 text-sm font-medium tabular-nums text-desk-ink">
              {data.total} total · {data.newThisWeek} this week ·{" "}
              {data.lastVisit ? (
                <>
                  {data.newSinceLastVisit} new since you last looked ({ago(data.lastVisit)})
                </>
              ) : (
                "first visit"
              )}
            </p>
          )}
        </div>
        {data && data.newSinceLastVisit > 0 && data.lastVisit && (
          <span className="stamp stamp-press text-stamp text-lg" style={{ rotate: "-3deg", "--tilt": "-3deg" } as React.CSSProperties}>
            {data.newSinceLastVisit} new
          </span>
        )}
      </div>

      <div className="slip overflow-hidden">
        <div className="border-rule flex items-center gap-3 border-b px-4 py-3 sm:px-5">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Search users by name or email</span>
            <Search className="text-ink-soft absolute top-2.5 left-0 size-4" aria-hidden />
            <input
              type="search"
              className="field pl-6!"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </label>
          {loading && (
            <span className="typed text-ink-soft text-xs" role="status">
              loading…
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="bg-string-soft text-string px-5 py-3 text-sm">
            {error}
          </p>
        )}

        {/* Wide screens: the logbook table. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="caption text-ink-soft border-ink border-b-2">
                <th scope="col" className="px-5 py-2.5 font-semibold">Applicant</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Received</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Last active</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Profile</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className={`border-rule border-b align-top last:border-0 ${u.enabled ? "" : "text-ink-soft grayscale"}`}>
                  <td className="px-5 py-3">
                    <Identity u={u} self={u.id === user?.$id} />
                  </td>
                  <td className="px-3 py-3">
                    <Received iso={u.createdAt} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{u.accessedAt ? ago(u.accessedAt) : "never"}</td>
                  <td className="px-3 py-3 text-xs">
                    <ProfileSummary u={u} />
                  </td>
                  <td className="px-3 py-3">
                    <Status u={u} />
                  </td>
                  <td className="px-5 py-3">
                    <Actions u={u} self={u.id === user?.$id} act={act} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phones: one stacked entry per user, so status and actions are never off-screen. */}
        <ul className="md:hidden">
          {data?.users.map((u) => (
            <li key={u.id} className={`border-rule space-y-2.5 border-b px-4 py-4 last:border-0 ${u.enabled ? "" : "text-ink-soft grayscale"}`}>
              <div className="flex items-start justify-between gap-3">
                <Identity u={u} self={u.id === user?.$id} />
                <Received iso={u.createdAt} />
              </div>
              <Status u={u} />
              <p className="text-ink-soft text-xs">
                Last active {u.accessedAt ? ago(u.accessedAt) : "never"} · <ProfileSummary u={u} />
              </p>
              <Actions u={u} self={u.id === user?.$id} act={act} />
            </li>
          ))}
        </ul>

        {data && !data.users.length && (
          <p className="text-ink-soft px-5 py-8 text-center text-sm">
            {search ? `No users match "${search}".` : "No one has signed up yet."}
          </p>
        )}

        {data && data.total > 50 && (
          <div className="border-rule flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="text-ink-soft tabular-nums">
              {offset + 1}–{Math.min(offset + 50, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <button className="btn-quiet text-ink" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 50))}>
                Previous
              </button>
              <button className="btn-quiet text-ink" disabled={offset + 50 >= data.total} onClick={() => setOffset((o) => o + 50)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Act = (fn: (t: string) => Promise<void>) => Promise<void>;

function Identity({ u, self }: { u: AdminUser; self: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar u={u} />
      <div className="min-w-0">
        <div className="font-semibold">
          {u.name || <span className="text-ink-soft italic">no name</span>}
          {self && <span className="text-ink-soft font-normal"> (you)</span>}
        </div>
        {u.profile?.title && <div className="text-ink-soft text-xs">{u.profile.title}</div>}
        <div className="typed text-ink-soft truncate text-xs">{u.email}</div>
      </div>
    </div>
  );
}

/** The applicant's 2x2 photo, or their initials in its place. */
function Avatar({ u }: { u: AdminUser }) {
  const url = useFileUrl(u.profile?.photoFileId);
  const initials = (u.name || u.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="border-rule grid size-10 shrink-0 place-items-center overflow-hidden border" aria-hidden>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <span className="typed text-ink-soft text-sm font-bold">{initials}</span>}
    </span>
  );
}

/** The date an application came in, as a violet received-stamp. */
function Received({ iso }: { iso: string }) {
  return (
    <span className="stamp text-stamp shrink-0 flex-col gap-0! text-[0.6rem]" title={new Date(iso).toLocaleString()}>
      <span className="tracking-[0.14em]">Received</span>
      <span className="typed text-[0.75rem] font-bold tracking-normal whitespace-nowrap">{stampDate(iso)}</span>
    </span>
  );
}

function ProfileSummary({ u }: { u: AdminUser }) {
  if (!u.profile) return <span className="text-ink-soft">profile not filled in</span>;
  return (
    <span className="tabular-nums">
      {[
        u.profile.location,
        u.profile.yearsExperience != null && `${u.profile.yearsExperience} yrs`,
        `${u.profile.skills} skills`,
        u.profile.hasResume ? "resume" : "no resume",
      ]
        .filter(Boolean)
        .join(" · ")}
    </span>
  );
}

function Status({ u }: { u: AdminUser }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem]">
      {u.isNew && <span className="stamp text-stamp">New</span>}
      {u.admin && <span className="stamp text-stamp">Admin</span>}
      {!u.enabled && <span className="stamp text-ink-soft">Disabled</span>}
      {!u.verified && <span className="text-ink-soft text-xs">unverified email</span>}
    </div>
  );
}

function Actions({ u, self, act }: { u: AdminUser; self: boolean; act: Act }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: (t: string) => Promise<void>) => {
    setBusy(true);
    await act(fn);
    setBusy(false);
  };

  if (self) return <p className="text-ink-soft text-xs md:text-right">Manage your own account on Profile</p>;
  if (confirmDelete)
    return (
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button className="btn bg-string! px-2.5! py-1! text-xs!" disabled={busy} onClick={() => run((t) => api.admin.remove(t, u.id))}>
          {busy ? "Deleting…" : "Delete user and data"}
        </button>
        <button className="btn-quiet text-ink px-2.5! py-1! text-xs!" onClick={() => setConfirmDelete(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    );
  return (
    <div className="-mx-2 flex flex-wrap gap-1 md:mx-0 md:flex-nowrap md:justify-end">
      <IconAction
        label={u.enabled ? "Disable" : "Enable"}
        disabled={busy}
        onClick={() => run((t) => api.admin.update(t, u.id, { enabled: !u.enabled }))}
      >
        {u.enabled ? <Ban className="size-4" /> : <CircleCheck className="size-4" />}
      </IconAction>
      <IconAction
        label={u.admin ? "Remove admin" : "Make admin"}
        disabled={busy}
        onClick={() => run((t) => api.admin.update(t, u.id, { admin: !u.admin }))}
      >
        {u.admin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
      </IconAction>
      <IconAction label="Delete" danger disabled={busy} onClick={() => setConfirmDelete(true)}>
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );
}

function IconAction(props: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      className={`inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-40 ${
        props.danger ? "text-string hover:bg-string-soft" : "text-ballpen hover:bg-ballpen-soft"
      }`}
    >
      <span aria-hidden>{props.children}</span>
      {props.label}
    </button>
  );
}
