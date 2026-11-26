export type SourceId = "remotive" | "remoteok" | "arbeitnow" | "jobicy";

export interface Job {
  id: string; // `${source}:${sourceId}`
  source: SourceId;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string; // the original posting; every "apply" link goes here
  tags: string[];
  salary: string | null;
  postedAt: string; // ISO timestamp
  excerpt: string; // plain text, first ~300 chars of the description
}

/** A passage from the description where one of the user's skills appears. */
export interface Snippet {
  skill: string;
  before: string;
  hit: string;
  after: string;
}

export interface ScoredJob extends Job {
  score: number;
  matched: string[]; // the user's skills this job mentions, strongest first
  snippets: Snippet[];
}

export interface SourceStatus {
  id: SourceId;
  name: string;
  homepage: string;
  count: number;
  fetchedAt: string | null;
  error: string | null;
}

/** Profile details read from a resume. Every field is a best guess and may be null/empty. */
export interface ResumeDetails {
  name: string | null;
  title: string | null;
  location: string | null;
  yearsExperience: number | null;
  phone: string | null;
  links: string[];
  education: string | null;
}

export interface ResumeResult {
  fileName: string;
  skills: string[];
  roles: string[];
  details: ResumeDetails;
  characters: number;
}

export interface SearchRequest {
  skills: string[];
  roles: string[];
}

export interface SearchResponse {
  jobs: ScoredJob[];
  total: number; // jobs scanned across all sources
  sources: SourceStatus[];
}
