import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const dbPath = path.resolve(__dirname, "prisma/test.db");
const databaseUrl = `file:${dbPath}`;

export default async function setup() {
  if (existsSync(dbPath)) rmSync(dbPath);

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  return () => {
    if (existsSync(dbPath)) rmSync(dbPath);
  };
}
