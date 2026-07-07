import MatchHistory, { type HistoryMatch } from "@/components/matches/MatchHistory";
import { createClient } from "@/utils/supabase/server";
import { fetchAllRows, unwrap } from "@/lib/db";
import { expectedScore } from "@/lib/mmr";

export const dynamic = "force-dynamic";

type Mp = {
  match_id: string;
  side: string;
  delta: number;
  mmr_before: number;
  players: { name: string } | null;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default async function MatchHistoryPage() {
  const db = await createClient();
  const [matches, mps] = await Promise.all([
    unwrap<{ id: string; played_at: string; map: string; win_score: number | null; lose_score: number | null; note: string | null }[]>(
      "matches",
      db
        .from("matches")
        .select("id, played_at, map, win_score, lose_score, note")
        // played_at is date-only, so same-day games tie — break by submit time.
        .order("played_at", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
    fetchAllRows<Mp>((from, to) =>
      db
        .from("match_players")
        .select("match_id, side, delta, mmr_before, players(name)")
        .order("id")
        .range(from, to),
    ),
  ]);

  type Row = { name: string; delta: number; before: number };
  const byMatch = new Map<string, { winners: Row[]; losers: Row[] }>();
  for (const mp of mps) {
    // supabase types the joined relation as an array; it's a single row here
    const name = (mp.players as unknown as { name: string } | null)?.name;
    if (!name) continue;
    const rec = byMatch.get(mp.match_id) ?? { winners: [], losers: [] };
    (mp.side === "A" ? rec.winners : rec.losers).push({ name, delta: mp.delta, before: mp.mmr_before });
    byMatch.set(mp.match_id, rec);
  }

  const history: HistoryMatch[] = (matches ?? []).map((m) => {
    const rec = byMatch.get(m.id) ?? { winners: [], losers: [] };
    const wBefore = rec.winners.map((r) => r.before);
    const lBefore = rec.losers.map((r) => r.before);
    // Elo win probability uses team averages; totals are just for display.
    const avgW = wBefore.length ? sum(wBefore) / wBefore.length : 0;
    const avgL = lBefore.length ? sum(lBefore) / lBefore.length : 0;
    const winnerPct = Math.round(expectedScore(avgW, avgL) * 100);
    return {
      id: m.id,
      date: (m.played_at as string).slice(0, 10),
      map: m.map,
      winners: rec.winners.map((r) => ({ name: r.name, delta: r.delta })),
      losers: rec.losers.map((r) => ({ name: r.name, delta: r.delta })),
      // Team MMR going into the match: total (sum) and average.
      winnerMmr: sum(wBefore),
      loserMmr: sum(lBefore),
      winnerAvg: Math.round(avgW),
      loserAvg: Math.round(avgL),
      winnerPct, // pre-game win probability of the team that actually won
      loserPct: 100 - winnerPct,
      winScore: m.win_score ?? null,
      loseScore: m.lose_score ?? null,
      note: m.note ?? null,
    };
  });

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
          Match history
        </p>
        <h1 className="font-sans text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
          All matches
        </h1>
        <p className="mt-1 text-sm text-white/40">{history.length} games · newest first · click to expand</p>
      </header>
      <MatchHistory matches={history} />
    </>
  );
}
