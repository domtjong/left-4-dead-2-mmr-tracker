/**
 * Runs supabase/schema.sql against the database over a direct Postgres
 * connection. Needs SUPABASE_DB_URL (or SUPABASE_DB_PASSWORD) in .env.local.
 *   npx tsx scripts/run-schema.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    for (const line of readFileSync(join(repoRoot, ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv();

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error("Set SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const sql = readFileSync(join(repoRoot, "supabase/schema.sql"), "utf-8");

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
const run = async () => {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  console.log("public tables:", rows.map((r) => r.table_name).join(", "));
  await client.end();
};
run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
