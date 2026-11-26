import { AppwriteException, ID, Permission, Role } from "appwrite";
import { useCallback, useEffect, useRef, useState } from "react";
import { DATABASE_ID, PHOTOS_BUCKET, PROFILES_TABLE, RESUMES_BUCKET, type ProfileRow, type WorkSetup } from "../../shared/appwrite.ts";
import { storage, tables } from "./appwrite.ts";
import { useAuth } from "./auth.tsx";

export interface Chip {
  name: string;
  on: boolean;
}

export interface Profile {
  title: string;
  location: string;
  yearsExperience: number | null;
  phone: string;
  links: string[];
  education: string;
  photoFileId: string | null;
  workSetup: WorkSetup;
  skills: Chip[];
  roles: Chip[];
  resumeFileId: string | null;
  resumeFileName: string | null;
}

export const emptyProfile: Profile = {
  title: "",
  location: "",
  yearsExperience: null,
  phone: "",
  links: [],
  education: "",
  photoFileId: null,
  workSetup: "any",
  skills: [],
  roles: [],
  resumeFileId: null,
  resumeFileName: null,
};

const chips = (json: string | null): Chip[] => {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((c) => typeof c?.name === "string").map((c) => ({ name: c.name, on: c.on !== false })) : [];
  } catch {
    return [];
  }
};

const strings = (json: string | null): string[] => {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const fromRow = (r: ProfileRow): Profile => ({
  title: r.title ?? "",
  location: r.location ?? "",
  yearsExperience: r.yearsExperience ?? null,
  phone: r.phone ?? "",
  links: strings(r.links),
  education: r.education ?? "",
  photoFileId: r.photoFileId ?? null,
  workSetup: r.workSetup ?? "any",
  skills: chips(r.skills),
  roles: chips(r.roles),
  resumeFileId: r.resumeFileId ?? null,
  resumeFileName: r.resumeFileName ?? null,
});

const toRow = (p: Profile): ProfileRow => ({
  title: p.title.trim().slice(0, 120) || null,
  location: p.location.trim() || null,
  yearsExperience: p.yearsExperience,
  phone: p.phone.trim().slice(0, 40) || null,
  links: JSON.stringify(p.links.map((l) => l.trim()).filter(Boolean).slice(0, 8)),
  education: p.education.trim().slice(0, 255) || null,
  photoFileId: p.photoFileId,
  workSetup: p.workSetup,
  skills: JSON.stringify(p.skills),
  roles: JSON.stringify(p.roles),
  resumeFileId: p.resumeFileId,
  resumeFileName: p.resumeFileName,
});

// Only the owner can see or change their row and file; the admin reads them through the server's key.
const ownerOnly = (userId: string) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

/** Profiles saved by the earlier, account-less version of the app, offered once to the first account. */
function legacyLocalProfile(): Pick<Profile, "skills" | "roles"> | null {
  try {
    const raw = localStorage.getItem("job-scraper:profile");
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { skills: Array.isArray(p.skills) ? p.skills : [], roles: Array.isArray(p.roles) ? p.roles : [] };
  } catch {
    return null;
  }
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** The signed-in user's profile, loaded from Appwrite and saved back (debounced) on every change. */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const userId = user?.$id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoaded(false);
    tables
      .getRow({ databaseId: DATABASE_ID, tableId: PROFILES_TABLE, rowId: userId })
      .then((row) => !cancelled && setProfileState(fromRow(row as unknown as ProfileRow)))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AppwriteException && err.code === 404) {
          const legacy = legacyLocalProfile();
          setProfileState(legacy ? { ...emptyProfile, ...legacy } : emptyProfile);
          try {
            localStorage.removeItem("job-scraper:profile");
          } catch {
            /* ignore */
          }
        } else setError("Couldn't load your profile. Refresh to try again.");
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (p: Profile) => {
      if (!userId) return;
      setSaveState("saving");
      try {
        await tables.upsertRow({
          databaseId: DATABASE_ID,
          tableId: PROFILES_TABLE,
          rowId: userId,
          data: toRow(p) as unknown as Record<string, unknown>,
          permissions: ownerOnly(userId),
        });
        setSaveState("saved");
        setError(null);
      } catch (err) {
        setSaveState("error");
        setError(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save your profile.");
      }
    },
    [userId],
  );

  /** Update locally right away; write to Appwrite once edits pause. */
  const setProfile = useCallback(
    (next: Profile | ((p: Profile) => Profile)) => {
      setProfileState((prev) => {
        const p = typeof next === "function" ? next(prev) : next;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => persist(p), 600);
        return p;
      });
    },
    [persist],
  );

  /** Store the resume file privately, replacing the previous one. */
  const storeResume = useCallback(
    async (file: File) => {
      if (!userId) throw new Error("Sign in first.");
      const created = await storage.createFile({
        bucketId: RESUMES_BUCKET,
        fileId: ID.unique(),
        file,
        permissions: ownerOnly(userId),
      });
      const old = profile.resumeFileId;
      if (old && old !== created.$id) await storage.deleteFile({ bucketId: RESUMES_BUCKET, fileId: old }).catch(() => {});
      return { resumeFileId: created.$id, resumeFileName: file.name };
    },
    [userId, profile.resumeFileId],
  );

  /** Store a (pre-cropped) profile photo privately, replacing the previous one. */
  const storePhoto = useCallback(
    async (file: File) => {
      if (!userId) throw new Error("Sign in first.");
      const created = await storage.createFile({
        bucketId: PHOTOS_BUCKET,
        fileId: ID.unique(),
        file,
        permissions: ownerOnly(userId),
      });
      const old = profile.photoFileId;
      if (old && old !== created.$id) await storage.deleteFile({ bucketId: PHOTOS_BUCKET, fileId: old }).catch(() => {});
      return created.$id;
    },
    [userId, profile.photoFileId],
  );

  const removePhoto = useCallback(async () => {
    const old = profile.photoFileId;
    setProfile((p) => ({ ...p, photoFileId: null }));
    if (old) await storage.deleteFile({ bucketId: PHOTOS_BUCKET, fileId: old }).catch(() => {});
  }, [profile.photoFileId, setProfile]);

  return { profile, setProfile, loaded, saveState, error, storeResume, storePhoto, removePhoto };
}
