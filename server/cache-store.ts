import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where the job cache lives: a JSON file locally, a Netlify Blob in production. */
export interface CacheStore {
  read(): Promise<string | null>;
  write(data: string): Promise<void>;
}

const CACHE_FILE = path.resolve("data", "cache.json");

const fileStore: CacheStore = {
  async read() {
    try {
      return await readFile(CACHE_FILE, "utf8");
    } catch {
      return null; // first run
    }
  },
  async write(data) {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, data);
  },
};

/** Netlify Blobs store. Only valid inside a Netlify Function (after connectLambda for v1 functions). */
export function blobStore(): CacheStore {
  const store = getStore("job-cache");
  return {
    read: () => store.get("feeds", { type: "text" }),
    write: async (data) => {
      await store.set("feeds", data);
    },
  };
}

let current: CacheStore = fileStore;

export const cacheStore = () => current;
export function useCacheStore(store: CacheStore) {
  current = store;
}
