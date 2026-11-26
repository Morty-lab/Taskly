// Imported first by server/index.ts so .env is loaded before any module reads process.env.
try {
  process.loadEnvFile();
} catch {
  console.warn("No .env file found: sign-in and admin features are off until you create one (see README).");
}
