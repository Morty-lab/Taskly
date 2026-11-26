// Creates everything the app needs in the Appwrite project: the profiles table, the resumes bucket,
// and the admin account. Safe to re-run: existing pieces are updated, never duplicated or wiped.
//
//   npm run setup
//
// Reads VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, ADMIN_EMAIL,
// ADMIN_PASSWORD and ADMIN_NAME from .env.

import { Client, ID, Permission, Query, Role, Storage, TablesDB, Users } from "node-appwrite";
import { ADMIN_LABEL, DATABASE_ID, PROFILES_TABLE, RESUMES_BUCKET, WORK_SETUPS } from "../shared/appwrite.ts";

try {
  process.loadEnvFile();
} catch {
  console.error("No .env file. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const env = (key: string) => {
  const v = process.env[key]?.trim();
  if (!v) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
  return v;
};

const client = new Client()
  .setEndpoint(env("VITE_APPWRITE_ENDPOINT"))
  .setProject(env("VITE_APPWRITE_PROJECT_ID"))
  .setKey(env("APPWRITE_API_KEY"));
const tables = new TablesDB(client);
const storage = new Storage(client);
const users = new Users(client);

const notFound = (err: unknown) => (err as { code?: number })?.code === 404;
const step = (msg: string) => console.log(`\n• ${msg}`);
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Signed-in users may create their own row/file; row- and file-level permissions (set by the
// browser on create) then limit each one to its owner. The server's API key bypasses both.
const ownerCreates = [Permission.create(Role.users())];

async function database() {
  step(`Database "${DATABASE_ID}"`);
  try {
    await tables.get({ databaseId: DATABASE_ID });
    ok("already exists");
  } catch (err) {
    if (!notFound(err)) throw err;
    await tables.create({ databaseId: DATABASE_ID, name: "Job Scraper" });
    ok("created");
  }
}

async function profilesTable() {
  step(`Table "${PROFILES_TABLE}"`);
  const base = { databaseId: DATABASE_ID, tableId: PROFILES_TABLE };
  try {
    await tables.getTable(base);
    await tables.updateTable({ ...base, name: "Profiles", permissions: ownerCreates, rowSecurity: true });
    ok("already exists, permissions updated");
  } catch (err) {
    if (!notFound(err)) throw err;
    await tables.createTable({ ...base, name: "Profiles", permissions: ownerCreates, rowSecurity: true });
    ok("created");
  }

  const { columns } = await tables.listColumns(base);
  const have = new Set(columns.map((c: { key: string }) => c.key));
  const add = async (key: string, make: () => Promise<unknown>) => {
    if (have.has(key)) return ok(`${key} exists`);
    await make();
    ok(`${key} created`);
  };
  const varchar = (key: string, size: number) =>
    add(key, async () => {
      try {
        await tables.createVarcharColumn({ ...base, key, size, required: false });
      } catch (err) {
        if (!notFound(err)) throw err; // older servers only have string columns
        await tables.createStringColumn({ ...base, key, size, required: false });
      }
    });

  await varchar("location", 120);
  await add("yearsExperience", () =>
    tables.createIntegerColumn({ ...base, key: "yearsExperience", required: false, min: 0, max: 60 }),
  );
  await add("workSetup", () =>
    tables.createEnumColumn({ ...base, key: "workSetup", elements: [...WORK_SETUPS], required: false, xdefault: "any" }),
  );
  await add("skills", () => tables.createLongtextColumn({ ...base, key: "skills", required: false }));
  await add("roles", () => tables.createLongtextColumn({ ...base, key: "roles", required: false }));
  await varchar("resumeFileId", 36);
  await varchar("resumeFileName", 255);
  await varchar("title", 120);
  await varchar("phone", 40);
  await add("links", () => tables.createLongtextColumn({ ...base, key: "links", required: false }));
  await varchar("education", 255);
  await varchar("photoFileId", 36);

  for (let i = 0; i < 30; i++) {
    const { columns: now } = await tables.listColumns(base);
    const failed = now.filter((c: { status: string }) => c.status === "failed");
    if (failed.length) throw new Error(`Column(s) failed: ${failed.map((c: { key: string }) => c.key).join(", ")}`);
    if (now.every((c: { status: string }) => c.status === "available")) return ok("all columns ready");
    await sleep(1000);
  }
  throw new Error("Columns still processing after 30s. Re-run the script in a minute.");
}

async function bucket(bucketId: string, name: string, maxBytes: number, allowedFileExtensions: string[]) {
  step(`Bucket "${bucketId}"`);
  const settings = {
    bucketId,
    name,
    permissions: ownerCreates,
    fileSecurity: true,
    enabled: true,
    maximumFileSize: maxBytes,
    allowedFileExtensions,
  };
  try {
    await storage.getBucket({ bucketId });
    await storage.updateBucket(settings);
    ok("already exists, settings updated");
  } catch (err) {
    if (!notFound(err)) throw err;
    await storage.createBucket(settings);
    ok("created");
  }
}

async function adminAccount() {
  const email = env("ADMIN_EMAIL").toLowerCase();
  step(`Admin account ${email}`);
  const { users: found } = await users.list({ queries: [Query.equal("email", email)] });
  let user = found[0];
  if (!user) {
    user = await users.create({
      userId: ID.unique(),
      email,
      password: env("ADMIN_PASSWORD"),
      name: process.env.ADMIN_NAME?.trim() || "Admin",
    });
    ok("created");
  } else ok("already exists (password left unchanged)");

  if (!user.labels.includes(ADMIN_LABEL)) {
    await users.updateLabels({ userId: user.$id, labels: [...user.labels, ADMIN_LABEL] });
    ok(`labelled "${ADMIN_LABEL}"`);
  } else ok(`already labelled "${ADMIN_LABEL}"`);
  if (!user.emailVerification) {
    await users.updateEmailVerification({ userId: user.$id, emailVerification: true });
    ok("email marked verified");
  }
}

try {
  await database();
  await profilesTable();
  // One bucket for resumes and profile photos (the free plan allows a single bucket). Photos are
  // cropped and re-encoded to a small JPEG in the browser before upload.
  await bucket(RESUMES_BUCKET, "Resumes and photos", 10 * 1024 * 1024, ["pdf", "docx", "txt", "md", "jpg", "jpeg", "png", "webp"]);
  await adminAccount();
  console.log("\nDone. Sign in at http://localhost:5173 with the admin email to see /admin.");
} catch (err) {
  const e = err as { code?: number; message?: string; type?: string };
  console.error(`\n✗ ${e.message ?? err}`);
  if (e.code === 401) console.error("  The API key is missing a scope. See README → Appwrite setup.");
  process.exit(1);
}
