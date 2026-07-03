/**
 * One-shot importer: seeds players + historical matches into Supabase,
 * recomputing MMR with our team Elo (lib/mmr.ts) in chronological order.
 *
 * Data source: scripts/data/matches.json (cleaned from l4d2csv.xlsx).
 * Names already normalized (lowercased, '1' suffix stripped, vince->vincent,
 * one ambiguous 'jaden/emil' match dropped).
 *
 * Usage:
 *   1. Create tables (supabase/schema.sql) in your Supabase project.
 *   2. Put these in .env.local:
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...        (Settings -> API -> service_role)
 *   3. npx tsx scripts/import-matches.ts
 *      (add RESET=1 to wipe existing rows first: RESET=1 npx tsx scripts/import-matches.ts)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import { applyMatch, BASE_MMR, type PlayerRating, type Side } from "../lib/mmr";

// supabase-js builds a realtime client on createClient(); Node <22 has no global WebSocket.
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

// --- load .env.local (tsx does not auto-load it) ---
function loadEnv() {
  try {
    const raw = readFileSync(join(repoRoot, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on real env */
  }
}
loadEnv();

// DRY_RUN=1 computes MMR and prints standings without touching Supabase.
const DRY = process.env.DRY_RUN === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!url || !key)) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in .env.local (service_role key, not anon), or use DRY_RUN=1 to preview.",
  );
  process.exit(1);
}
const db = DRY ? null : createClient(url!, key!, { auth: { persistSession: false } });

type RawMatch = {
  date: string;
  map: string;
  winners: string[];
  losers: string[];
  winScore: number | null;
  loseScore: number | null;
  note: string | null;
};

async function chunkInsert(table: string, rows: object[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db!.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

async function main() {
  const matches: RawMatch[] = JSON.parse(
    readFileSync(join(repoRoot, "scripts/data/matches.json"), "utf-8"),
  );
  matches.sort((a, b) => a.date.localeCompare(b.date)); // chronological, stable

  // Guard / optional reset
  if (!DRY) {
    const { count } = await db!.from("matches").select("*", { count: "exact", head: true });
    if (count && count > 0) {
      if (process.env.RESET === "1") {
        console.log(`RESET: clearing ${count} existing matches (+ cascades) and players...`);
        const ZERO = "00000000-0000-0000-0000-000000000000";
        await db!.from("match_players").delete().neq("id", ZERO);
        await db!.from("matches").delete().neq("id", ZERO);
        await db!.from("players").delete().neq("id", ZERO);
      } else {
        console.error(`matches table already has ${count} rows. Re-run with RESET=1 to wipe first.`);
        process.exit(1);
      }
    }
  }

  // Assign ids up front so we can bulk-insert without round-trip id mapping.
  const playerId = new Map<string, string>();
  const mmr = new Map<string, number>();
  const ensure = (name: string) => {
    if (!playerId.has(name)) {
      playerId.set(name, randomUUID());
      mmr.set(name, BASE_MMR);
    }
  };

  const matchRows: object[] = [];
  const mpRows: object[] = [];

  for (const m of matches) {
    [...m.winners, ...m.losers].forEach(ensure);
    const teamA: PlayerRating[] = m.winners.map((n) => ({ id: playerId.get(n)!, mmr: mmr.get(n)! }));
    const teamB: PlayerRating[] = m.losers.map((n) => ({ id: playerId.get(n)!, mmr: mmr.get(n)! }));

    const matchId = randomUUID();
    matchRows.push({
      id: matchId,
      map: m.map,
      winning_side: "A" as Side,
      played_at: m.date,
      win_score: m.winScore,
      lose_score: m.loseScore,
      note: m.note,
    });

    // applyMatch returns rows in [teamA..., teamB...] order, i.e. winners then losers.
    const names = [...m.winners, ...m.losers];
    const results = applyMatch(teamA, teamB, "A");
    results.forEach((r, i) => {
      mpRows.push({
        match_id: matchId,
        player_id: r.id,
        side: r.side,
        mmr_before: r.mmrBefore,
        mmr_after: r.mmrAfter,
        delta: r.delta,
      });
      mmr.set(names[i], r.mmrAfter); // advance running MMR
    });
  }

  // Players seeded with their FINAL computed MMR.
  const playerRows = [...playerId].map(([name, id]) => ({
    id,
    name,
    current_mmr: mmr.get(name)!,
    is_guest: name === "slmswolfenstein", // only obvious one-off guest
  }));

  console.log(
    `${DRY ? "DRY RUN — " : ""}${playerRows.length} players, ${matchRows.length} matches, ${mpRows.length} match_players`,
  );
  if (!DRY) {
    await chunkInsert("players", playerRows);
    await chunkInsert("matches", matchRows);
    await chunkInsert("match_players", mpRows);
  }

  const top = [...playerRows].sort((a, b) => b.current_mmr - a.current_mmr);
  console.log(`${DRY ? "Computed" : "Done."} standings (all ${top.length}):`);
  for (const p of top) console.log(`  ${p.name.padEnd(16)} ${p.current_mmr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
