// Keeps the job cache fresh so searches never wait on a job site. Runs every hour, but each feed is
// only refetched once it is 6 hours old (Remotive asks for at most ~4 fetches a day). Scheduled
// functions only run on the published production deploy, not on previews or branch deploys.
import type { Config } from "@netlify/functions";
import { blobStore, useCacheStore } from "../../server/cache-store.ts";
import { refresh, statuses } from "../../server/jobs.ts";
import { setFetchTimeout } from "../../server/sources.ts";

setFetchTimeout(25_000);

export default async () => {
  useCacheStore(blobStore());
  await refresh();
  const summary = statuses()
    .map((s) => `${s.id}=${s.count}${s.error ? ` (error: ${s.error})` : ""}`)
    .join(", ");
  console.log(`job cache: ${summary}`);
  return new Response(summary);
};

export const config: Config = { schedule: "@hourly" };
