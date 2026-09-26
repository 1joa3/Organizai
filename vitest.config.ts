import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./vitest.global-setup.ts",
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, "prisma/test.db")}`,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
