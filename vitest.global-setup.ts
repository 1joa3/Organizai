import "dotenv/config";
import { execSync } from "node:child_process";

/**
 * Os testes rodam contra o mesmo projeto Postgres de produção, mas isolados
 * no schema `test` (não o `public`, onde ficam os dados reais) — zero
 * infraestrutura extra, sem risco de tocar nos dados do usuário.
 * `db push` precisa da conexão direta (DIRECT_URL): o pooler em modo
 * transaction não suporta os prepared statements que DDL exige.
 */
function withTestSchema(url: string | undefined): string {
  if (!url) throw new Error("DIRECT_URL não definida no .env");
  const parsed = new URL(url);
  parsed.searchParams.set("schema", "test");
  return parsed.toString();
}

export default async function setup() {
  // db push usa diretamente DIRECT_URL quando ela está configurada no schema —
  // sobrescrevemos as duas para garantir que nada aponte pro schema `public`.
  const testDirectUrl = withTestSchema(process.env.DIRECT_URL);

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: testDirectUrl, DIRECT_URL: testDirectUrl },
    stdio: "inherit",
  });
}
