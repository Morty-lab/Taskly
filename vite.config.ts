import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The Express server does the fetching and file parsing; the browser only talks to /api.
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
