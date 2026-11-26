// IDs shared by the browser, the server and the setup script.
export const DATABASE_ID = "jobscraper";
export const PROFILES_TABLE = "profiles";
export const RESUMES_BUCKET = "resumes";
// The free Appwrite plan allows one bucket, so profile photos share it. Each file is still owner-only.
export const PHOTOS_BUCKET = RESUMES_BUCKET;
export const ADMIN_LABEL = "admin";

export const WORK_SETUPS = ["any", "remote", "hybrid", "onsite"] as const;
export type WorkSetup = (typeof WORK_SETUPS)[number];

/** A profile row. Its row id is the user's id, so each user has at most one. */
export interface ProfileRow {
  title: string | null;
  location: string | null;
  yearsExperience: number | null;
  phone: string | null;
  links: string | null; // JSON: string[]
  education: string | null;
  photoFileId: string | null;
  workSetup: WorkSetup;
  skills: string | null; // JSON: { name, on }[]
  roles: string | null; // JSON: { name, on }[]
  resumeFileId: string | null;
  resumeFileName: string | null;
}

/** What the admin pages get for each user. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  accessedAt: string | null;
  enabled: boolean;
  verified: boolean;
  admin: boolean;
  isNew: boolean; // signed up after the admin's previous visit to the users page
  profile: {
    title: string | null;
    location: string | null;
    yearsExperience: number | null;
    skills: number;
    hasResume: boolean;
    photoFileId: string | null;
  } | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  newSinceLastVisit: number;
  newThisWeek: number;
  lastVisit: string | null;
}
