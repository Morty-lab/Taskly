import { useState } from "react";
import type { ResumeDetails } from "../../shared/types.ts";
import { api } from "../api.ts";
import { account } from "./appwrite.ts";
import { useAuth } from "./auth.tsx";
import type { Profile } from "./profile.ts";

/** A value read from the resume that differs from what the profile already has. */
export interface Suggestion {
  key: "name" | "title" | "location" | "yearsExperience" | "phone" | "links" | "education";
  label: string;
  value: string;
  current: string;
}

const LABELS: Record<Suggestion["key"], string> = {
  name: "Name",
  title: "Current title",
  location: "Location",
  yearsExperience: "Years of experience",
  phone: "Phone",
  links: "Links",
  education: "Education",
};

const SUGGESTIONS_KEY = "job-scraper:resume-suggestions";

export function loadSuggestions(): Suggestion[] {
  try {
    return JSON.parse(sessionStorage.getItem(SUGGESTIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function saveSuggestions(s: Suggestion[]) {
  try {
    if (s.length) sessionStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SUGGESTIONS_KEY);
  } catch {
    /* storage blocked: suggestions just won't carry over between pages */
  }
}

/** Write one suggestion into the profile (or the account, for the name). */
export async function applySuggestion(s: Suggestion, setProfile: (fn: (p: Profile) => Profile) => void, reloadUser: () => Promise<void>) {
  if (s.key === "name") {
    await account.updateName({ name: s.value });
    await reloadUser();
    return;
  }
  setProfile((p) => {
    if (s.key === "yearsExperience") return { ...p, yearsExperience: Number(s.value) };
    if (s.key === "links") return { ...p, links: s.value.split("\n") };
    return { ...p, [s.key]: s.value };
  });
}

/**
 * Parse a resume on the server, store the file privately in Appwrite, and update the profile:
 * skills and roles are replaced; details (name, title, location…) fill fields that are empty, and
 * values that differ from what's already there become suggestions the user can apply.
 */
export function useResumeUpload(
  profile: Profile,
  setProfile: (p: Profile | ((p: Profile) => Profile)) => void,
  storeResume: (file: File) => Promise<{ resumeFileId: string; resumeFileName: string }>,
) {
  const { user, reload } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(loadSuggestions);
  const [arrivedAt, setArrivedAt] = useState(0);

  function updateSuggestions(next: Suggestion[]) {
    setSuggestions(next);
    saveSuggestions(next);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const parsed = await api.uploadResume(file);
      const stored = await storeResume(file);
      const { filled, pending, patch } = merge(profile, user?.name ?? "", parsed.details);

      setProfile((p) => ({
        ...p,
        ...stored,
        ...patch,
        skills: parsed.skills.map((name) => ({ name, on: true })),
        roles: parsed.roles.map((name) => ({ name, on: true })),
      }));
      if (filled.includes("Name") && parsed.details.name) {
        await account.updateName({ name: parsed.details.name }).catch(() => {});
        await reload();
      }
      updateSuggestions(pending);
      setArrivedAt(Date.now());

      const parts = [
        `${parsed.skills.length} skill${parsed.skills.length === 1 ? "" : "s"}`,
        filled.length ? `filled in ${filled.join(", ").toLowerCase()}` : null,
        pending.length ? `${pending.length} detail${pending.length === 1 ? "" : "s"} to review` : null,
      ].filter(Boolean);
      setNotice(`Found ${parts.join(" · ")}.`);
      if (!parsed.skills.length) setError("No skills we recognise in that file. Add yours by hand.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, error, notice, arrivedAt, suggestions, setSuggestions: updateSuggestions };
}

function merge(profile: Profile, accountName: string, d: ResumeDetails) {
  const filled: string[] = [];
  const pending: Suggestion[] = [];
  const patch: Partial<Profile> = {};

  const consider = (key: Suggestion["key"], found: string | null, current: string, apply: () => void) => {
    if (!found) return;
    if (!current.trim()) {
      apply();
      filled.push(LABELS[key]);
    } else if (found.trim().toLowerCase() !== current.trim().toLowerCase()) {
      pending.push({ key, label: LABELS[key], value: found, current });
    }
  };

  consider("name", d.name, accountName, () => {});
  consider("title", d.title, profile.title, () => (patch.title = d.title!));
  consider("location", d.location, profile.location, () => (patch.location = d.location!));
  consider(
    "yearsExperience",
    d.yearsExperience != null ? String(d.yearsExperience) : null,
    profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    () => (patch.yearsExperience = d.yearsExperience),
  );
  consider("phone", d.phone, profile.phone, () => (patch.phone = d.phone!));
  consider("education", d.education, profile.education, () => (patch.education = d.education!));
  // Links merge rather than replace: add any the profile doesn't have yet.
  const newLinks = d.links.filter((l) => !profile.links.some((x) => x.toLowerCase() === l.toLowerCase()));
  if (newLinks.length) {
    patch.links = [...profile.links, ...newLinks].slice(0, 8);
    filled.push("Links");
  }
  return { filled, pending, patch };
}
