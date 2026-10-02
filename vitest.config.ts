import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "path";

function withTestSchema(url: string | undefined): string {
  if (!url) throw new Error("DATABASE_URL não definida no .env");
  const parsed = new URL(url);
  parsed.searchParams.set("schema", "test");
  return parsed.toString();
}

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./vitest.global-setup.ts",
    env: {
      // Mesma conexão pooled de produção, isolada no schema `test` —
      // ver vitest.global-setup.ts para a criação desse schema.
      DATABASE_URL: withTestSchema(process.env.DATABASE_URL),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
