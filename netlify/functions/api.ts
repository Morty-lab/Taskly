// The whole /api/* surface as one Netlify Function: the same Express app the local server runs.
// netlify.toml rewrites /api/* here.
import { connectLambda } from "@netlify/blobs";
import type { Handler, HandlerResponse } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp, onError } from "../../server/app.ts";
import { blobStore, useCacheStore } from "../../server/cache-store.ts";
import { setFetchTimeout } from "../../server/sources.ts";

// The function has 10 s per request; leave room for parsing and the response.
setFetchTimeout(8_000);

const app = createApp();
app.use(onError);

const run = serverless(app, {
  // Photos and resume downloads are binary and must go back base64-encoded.
  binary: ["image/*", "application/octet-stream"],
});

export const handler: Handler = async (event, context) => {
  // Lambda-style functions have to hand their Blobs credentials over explicitly.
  connectLambda(event as unknown as Parameters<typeof connectLambda>[0]);
  useCacheStore(blobStore());
  return (await run(event, context)) as HandlerResponse;
};
