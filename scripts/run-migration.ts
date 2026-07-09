/**
 * Runs a migration SQL file against the DB via the Supabase session pooler.
 * The direct db.<ref>.supabase.co host has no DNS record for this project,
 * so we discover the pooler region by trying each until one authenticates.
 *
 *   npx tsx scripts/run-migration.ts supabase/002_scores_notes.sql
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

const file = process.argv[2] ?? "supabase/002_scores_notes.sql";
const sql = readFileSync(join(repoRoot, file), "utf-8");

const direct = process.env.SUPABASE_DB_URL ?? "";
const refMatch = direct.match(/db\.([a-z0-9]+)\.supabase\.co/);
const ref = refMatch?.[1] ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\./)?.[1];
const pwMatch = direct.match(/postgresql:\/\/[^:]+:([^@]+)@/);
const password = pwMatch ? decodeURIComponent(pwMatch[1]) : process.env.SUPABASE_DB_PASSWORD;

if (!ref || !password) {
  console.error("Could not derive project ref or password from .env.local");
  process.exit(1);
}

const REGIONS = [
  "ap-southeast-2", "ap-southeast-1", "ap-south-1", "ap-northeast-1", "ap-northeast-2",
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1", "eu-central-2",
  "sa-east-1", "ca-central-1",
];
const PREFIXES = ["aws-0", "aws-1"];

async function tryConnect(host: string): Promise<Client | null> {
  const client = new Client({
    host,
    port: 5432, // session pooler
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    // Verify TLS — this connection carries the DB password.
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    return client;
  } catch (e) {
    await client.end().catch(() => {});
    const msg = (e as Error).message;
    // Wrong region / tenant not found → keep scanning. Auth fail → stop.
    if (/password authentication failed/i.test(msg)) throw e;
    return null;
  }
}

async function main() {
  let client: Client | null = null;
  let host = "";
  outer: for (const p of PREFIXES) {
    for (const r of REGIONS) {
      host = `${p}-${r}.pooler.supabase.com`;
      process.stdout.write(`try ${host} … `);
      try {
        client = await tryConnect(host);
      } catch (e) {
        console.log("AUTH FAILED (right region, wrong password?)");
        throw e;
      }
      if (client) {
        console.log("OK");
        break outer;
      }
      console.log("no");
    }
  }
  if (!client) {
    console.error("No pooler region accepted the connection.");
    process.exit(1);
  }

  console.log(`\nRunning ${file} on ${host} …`);
  await client.query(sql);

  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name='matches'
     order by ordinal_position`,
  );
  console.log("matches columns:", rows.map((r) => `${r.column_name}:${r.data_type}`).join(", "));
  await client.end();
  console.log("Migration done.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
