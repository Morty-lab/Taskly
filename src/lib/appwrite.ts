import { Account, Client, Storage, TablesDB } from "appwrite";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "../../shared/appwrite.ts";

// Public identifiers, safe in the bundle. The API key lives only on the Express server.
const endpoint = (import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined) || APPWRITE_ENDPOINT;
const projectId = (import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined) || APPWRITE_PROJECT_ID;

export const appwriteReady = Boolean(endpoint && projectId);
if (!appwriteReady) console.error("Appwrite isn't configured: set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in .env.");

export const client = new Client()
  .setEndpoint(endpoint || "https://sgp.cloud.appwrite.io/v1")
  .setProject(projectId || "unset");

export const account = new Account(client);
export const tables = new TablesDB(client);
export const storage = new Storage(client);

// Runs once when the app loads, so a wrong project ID or a missing "localhost" web platform shows
// up immediately in the console instead of as a confusing sign-in failure.
if (appwriteReady) {
  client
    .ping()
    .then(() => console.info(`Appwrite connected: project ${projectId}`))
    .catch((err: Error) =>
      console.error(`Appwrite ping failed (${err.message}). Is this hostname added as a Web platform in the console?`),
    );
}
