import MmrHistoryChart, { type ChartRow } from "@/components/chart/MmrHistoryChart";
import StandingsTable, { type StandingRow } from "@/components/chart/StandingsTable";
import { createClient } from "@/utils/supabase/server";
import { fetchAllRows, unwrap } from "@/lib/db";
import { BASE_MMR } from "@/lib/mmr";

export const dynamic = "force-dynamic";

type Mp = { match_id: string; side: string; mmr_after: number; players: { name: string } | null };

export default async function ChartPage() {
  const db = await createClient();

  const [matches, mps, players] = await Promise.all([
    unwrap<{ id: string; played_at: string }[]>(
      "matches",
      db.from("matches").select("id, played_at").order("played_at", { ascending: true }),
    ),
    fetchAllRows<Mp>((from, to) =>
      db.from("match_players").select("match_id, side, mmr_after, players(name)").order("id").range(from, to),
    ),
    unwrap<{ name: string; current_mmr: number; is_guest: boolean }[]>(
      "players",
      db.from("players").select("name, current_mmr, is_guest").order("current_mmr", { ascending: false }),
    ),
  ]);

  // Sequential timeline: one row per match, each participant's post-match MMR
  // recorded under their name. connectNulls bridges matches a player sat out.
  const order = new Map((matches ?? []).map((m, i) => [m.id, i]));
  const rows: ChartRow[] = (matches ?? []).map((m, i) => ({
    idx: i + 1,
    date: (m.played_at as string).slice(0, 10),
  }));
  const games = new Map<string, number>();
  const wins = new Map<string, number>();
  for (const mp of mps) {
    const i = order.get(mp.match_id);
    // supabase types the joined relation as an array; it's a single row here
    const name = (mp.players as unknown as { name: string } | null)?.name;
    if (i === undefined || !name) continue;
    rows[i][name] = mp.mmr_after;
    games.set(name, (games.get(name) ?? 0) + 1);
    if (mp.side === "A") wins.set(name, (wins.get(name) ?? 0) + 1); // winners are side A
  }

  // Sorted by MMR for the chip list; each carries games so the chart can
  // default-select the most active players.
  const roster = (players ?? []).map((p) => ({
    name: p.name,
    mmr: p.current_mmr,
    games: games.get(p.name) ?? 0,
  }));

  // Only rank players who have actually played — a player left with zero games
  // (e.g. an orphan from a deleted match) should not show in the standings.
  const standings: StandingRow[] = (players ?? [])
    .filter((p) => (games.get(p.name) ?? 0) > 0)
    .map((p, i) => {
      const gp = games.get(p.name) ?? 0;
      const w = wins.get(p.name) ?? 0;
      return {
        rank: i + 1,
        name: p.name,
        mmr: p.current_mmr,
        isGuest: p.is_guest,
        games: gp,
        wins: w,
        losses: gp - w,
        winPct: gp ? Math.round((w / gp) * 100) : 0,
      };
    });

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
          MMR chart
        </p>
        <h1 className="font-sans text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
          Gang MMR history
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Every player from inception. {rows.length} matches · base {BASE_MMR}.
        </p>
      </header>
      <div className="space-y-6">
        <MmrHistoryChart rows={rows} roster={roster} />
        <StandingsTable rows={standings} />
      </div>
    </>
  );
}
