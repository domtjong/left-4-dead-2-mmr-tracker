/**
 * Verifies every stored match delta matches the current Elo system (lib/mmr):
 * recomputes each team's delta from the players' stored pre-match MMR and
 * compares to the persisted delta. Prints any mismatches. Read-only.
 *   npx tsx scripts/verify-elo.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import { ratingDelta, teamAverage } from "../lib/mmr";

if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const l of readFileSync(join(repoRoot, ".env.local"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2];
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type Row = { match_id: string; side: string; mmr_before: number; mmr_after: number; delta: number };

async function fetchAll(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("match_players")
      .select("match_id, side, mmr_before, mmr_after, delta")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  const rows = await fetchAll();
  const byMatch = new Map<string, Row[]>();
  for (const r of rows) {
    const a = byMatch.get(r.match_id) ?? [];
    a.push(r);
    byMatch.set(r.match_id, a);
  }

  let bad = 0;
  let afterBad = 0;
  for (const [id, rs] of byMatch) {
    const A = rs.filter((r) => r.side === "A");
    const B = rs.filter((r) => r.side === "B");
    if (A.length === 0 || B.length === 0) continue;
    const avgA = teamAverage(A.map((r) => r.mmr_before));
    const avgB = teamAverage(B.map((r) => r.mmr_before));
    const dA = ratingDelta(avgA, avgB, true); // winners = side A
    const dB = ratingDelta(avgB, avgA, false);
    const okDelta = A.every((r) => r.delta === dA) && B.every((r) => r.delta === dB);
    const okAfter = rs.every((r) => r.mmr_after === r.mmr_before + r.delta);
    if (!okDelta) {
      bad++;
      if (bad <= 5)
        console.log(`Δ mismatch ${id}: expected A${dA}/B${dB}, got A${A[0].delta}/B${B[0].delta}`);
    }
    if (!okAfter) afterBad++;
  }

  console.log(`\nmatches checked: ${byMatch.size}`);
  console.log(`delta mismatches (vs current Elo): ${bad}`);
  console.log(`mmr_after != before+delta: ${afterBad}`);
  console.log(
    bad === 0 && afterBad === 0
      ? "✅ match history reflects the Elo system exactly"
      : "⚠️ discrepancies found",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
