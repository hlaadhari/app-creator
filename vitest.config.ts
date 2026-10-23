import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15000,
    env: {
      VITE_SUPABASE_URL: process.env["VITE_SUPABASE_URL"] || "https://placeholder.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "placeholder-publishable-key",
      SUPABASE_URL: process.env["SUPABASE_URL"] || "https://placeholder.supabase.co",
      SUPABASE_PUBLISHABLE_KEY:
        process.env["SUPABASE_PUBLISHABLE_KEY"] || "placeholder-publishable-key",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
