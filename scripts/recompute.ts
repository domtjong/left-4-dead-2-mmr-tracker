/**
 * Rebuild the entire MMR history from the raw match log, in the exact order the
 * delete action uses: (played_at asc, created_at asc, id asc). Persists the
 * recomputed match_players before/after/delta and every player's current_mmr.
 *
 * Run once to make stored data canonical so deleting a match never reshuffles
 * unrelated same-day games. Idempotent.
 *
 *   npx tsx scripts/recompute.ts
 */
import { WebSocket } from "ws";
// @ts-expect-error node global
globalThis.WebSocket = WebSocket;
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { applyMatch, BASE_MMR, type PlayerRating, type Side } from "../lib/mmr";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(repoRoot, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const { data: matches, error: mErr } = await db
    .from("matches")
    .select("id, winning_side, played_at, created_at")
    .order("played_at", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (mErr) throw mErr;

  let mps: { match_id: string; player_id: string; side: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("match_players")
      .select("match_id, player_id, side")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    mps = mps.concat(data ?? []);
    if (!data || data.length < 1000) break;
  }

  const { data: players, error: pErr } = await db.from("players").select("id");
  if (pErr) throw pErr;

  const roster = new Map<string, { A: string[]; B: string[] }>();
  for (const p of mps) {
    const r = roster.get(p.match_id) ?? { A: [], B: [] };
    (p.side === "A" ? r.A : r.B).push(p.player_id);
    roster.set(p.match_id, r);
  }

  const rating = new Map<string, number>((players ?? []).map((p) => [p.id, BASE_MMR]));
  const rows: {
    match_id: string;
    player_id: string;
    side: Side;
    mmr_before: number;
    mmr_after: number;
    delta: number;
  }[] = [];

  for (const m of matches ?? []) {
    const r = roster.get(m.id);
    if (!r || !r.A.length || !r.B.length) continue;
    const toR = (pid: string): PlayerRating => ({ id: pid, mmr: rating.get(pid) ?? BASE_MMR });
    const results = applyMatch(r.A.map(toR), r.B.map(toR), m.winning_side as Side);
    for (const res of results) {
      rating.set(res.id, res.mmrAfter);
      rows.push({
        match_id: m.id,
        player_id: res.id,
        side: res.side,
        mmr_before: res.mmrBefore,
        mmr_after: res.mmrAfter,
        delta: res.delta,
      });
    }
  }

  const { error: wipeErr } = await db.from("match_players").delete().not("id", "is", null);
  if (wipeErr) throw wipeErr;
  for (let j = 0; j < rows.length; j += 500) {
    const { error } = await db.from("match_players").insert(rows.slice(j, j + 500));
    if (error) throw error;
  }
  for (const [pid, mmr] of rating) {
    const { error } = await db.from("players").update({ current_mmr: mmr }).eq("id", pid);
    if (error) throw error;
  }

  console.log(`recomputed ${matches?.length ?? 0} matches, ${rows.length} rows, ${rating.size} players`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
