import StatCard from "@/components/dashboard/StatCard";
import SquadSynergy from "@/components/dashboard/SquadSynergy";
import MapCarousel from "@/components/dashboard/MapCarousel";
import TopMovers from "@/components/dashboard/TopMovers";
import RecentMatches from "@/components/dashboard/RecentMatches";
import MatchupPreview from "@/components/matchup/MatchupPreview";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, glassCard } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { fetchAllRows, unwrap } from "@/lib/db";
import { expectedScore } from "@/lib/mmr";
import { Gauge, Target, Swords } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Index() {
  const db = await createClient();
  const [players, matches, mps] = await Promise.all([
    unwrap<{ name: string; current_mmr: number }[]>(
      "players",
      db.from("players").select("name, current_mmr"),
    ),
    unwrap<{ id: string; map: string; played_at: string; win_score: number | null; lose_score: number | null; note: string | null }[]>(
      "matches",
      db.from("matches").select("id, map, played_at, win_score, lose_score, note"),
    ),
    fetchAllRows<{
      match_id: string;
      side: string;
      delta: number;
      mmr_before: number;
      players: { name: string } | null;
    }>((from, to) =>
      db
        .from("match_players")
        .select("match_id, side, delta, mmr_before, players(name)")
        .order("id")
        .range(from, to),
    ),
  ]);

  const matchOf = new Map((matches ?? []).map((m) => [m.id, m]));
  const mapOf = new Map((matches ?? []).map((m) => [m.id, m.map]));

  // Tally overall and per-map W/L per player (winners are side A).
  type WL = { g: number; w: number };
  const overall = new Map<string, WL>();
  const perMap = new Map<string, Map<string, WL>>();
  const bump = (m: Map<string, WL>, name: string, won: boolean) => {
    const r = m.get(name) ?? { g: 0, w: 0 };
    r.g++;
    if (won) r.w++;
    m.set(name, r);
  };
  // Also group each match's roster (with deltas + pre-match MMR) for the
  // Recent matches card.
  type SidePlayer = { name: string; delta: number; before: number };
  const rosterByMatch = new Map<string, { winners: SidePlayer[]; losers: SidePlayer[] }>();
  for (const mp of mps) {
    const name = (mp.players as unknown as { name: string } | null)?.name;
    if (!name) continue;
    const won = mp.side === "A";
    bump(overall, name, won);
    const map = mapOf.get(mp.match_id);
    if (map) {
      if (!perMap.has(map)) perMap.set(map, new Map());
      bump(perMap.get(map)!, name, won);
    }
    const rec = rosterByMatch.get(mp.match_id) ?? { winners: [], losers: [] };
    (won ? rec.winners : rec.losers).push({ name, delta: mp.delta, before: mp.mmr_before });
    rosterByMatch.set(mp.match_id, rec);
  }

  const games = new Map([...overall].map(([n, r]) => [n, r.g]));
  // Roster for the matchup preview, ordered most-active first.
  const roster = (players ?? [])
    .map((p) => ({ name: p.name, mmr: p.current_mmr, games: games.get(p.name) ?? 0 }))
    .sort((a, b) => b.games - a.games || b.mmr - a.mmr);

  const totalMatches = matches?.length ?? 0;

  // Best / worst performing combos (duos, trios, quads): groups of players who
  // played the same side. A combo "wins" when all its members are on the
  // winning team. Needs a minimum sample per size (bigger stacks repeat less).
  const kCombos = (arr: string[], k: number): string[][] => {
    const out: string[][] = [];
    const rec = (start: number, acc: string[]) => {
      if (acc.length === k) return void out.push(acc);
      for (let i = start; i < arr.length; i++) rec(i + 1, [...acc, arr[i]]);
    };
    rec(0, []);
    return out;
  };
  const SIZES = [2, 3, 4] as const;
  const MIN_BY_SIZE: Record<number, number> = { 2: 6, 3: 4, 4: 3 };
  const comboStats: Record<number, Map<string, WL>> = { 2: new Map(), 3: new Map(), 4: new Map() };
  for (const rec of rosterByMatch.values()) {
    const sides: [string[], boolean][] = [
      [rec.winners.map((p) => p.name), true],
      [rec.losers.map((p) => p.name), false],
    ];
    for (const [names, won] of sides) {
      for (const k of SIZES) {
        if (names.length < k) continue;
        for (const combo of kCombos(names, k)) {
          const key = [...combo].sort().join(" ");
          const r = comboStats[k].get(key) ?? { g: 0, w: 0 };
          r.g++;
          if (won) r.w++;
          comboStats[k].set(key, r);
        }
      }
    }
  }
  const squads = SIZES.map((k) => {
    const min = MIN_BY_SIZE[k];
    const list = [...comboStats[k]]
      .filter(([, r]) => r.g >= min)
      .map(([key, r]) => ({
        names: key.split(" "),
        g: r.g,
        w: r.w,
        pct: Math.round((r.w / r.g) * 100),
      }))
      .sort((a, b) => b.pct - a.pct || b.g - a.g);
    const best = list.slice(0, 3);
    const bestKeys = new Set(best.map((c) => c.names.join(" ")));
    const worst = [...list]
      .reverse()
      .filter((c) => !bestKeys.has(c.names.join(" ")))
      .slice(0, 3);
    return { size: k, min, best, worst };
  });

  // Highest win rate among players with a meaningful sample.
  const MIN_OVERALL = 20;
  const pct = (r: WL) => Math.round((r.w / r.g) * 100);
  const topWinRate = [...overall]
    .filter(([, r]) => r.g >= MIN_OVERALL)
    .map(([name, r]) => ({ name, pct: pct(r), games: r.g }))
    .sort((a, b) => b.pct - a.pct)[0];

  // Per-map best/worst win rate (min games on that map), busiest maps first.
  const MIN_MAP = 5;
  const mapSlides = [...perMap]
    .map(([map, tbl]) => {
      const ranked = [...tbl]
        .filter(([, r]) => r.g >= MIN_MAP)
        .map(([name, r]) => ({ name, pct: pct(r), games: r.g }))
        .sort((a, b) => b.pct - a.pct);
      const total = [...tbl.values()].reduce((s, r) => s + r.g, 0);
      return { map, total, best: ranked[0] ?? null, worst: ranked[ranked.length - 1] ?? null };
    })
    .filter((s) => s.best)
    .sort((a, b) => b.total - a.total)
    .map(({ map, best, worst }) => ({ map, best, worst }));

  const byDateDesc = [...(matches ?? [])].sort((a, b) =>
    (b.played_at as string).localeCompare(a.played_at as string),
  );

  // Six most recent matches, with full detail, for the Recent matches card.
  const sumArr = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const recent = byDateDesc.slice(0, 6).map((m) => {
    const rec = rosterByMatch.get(m.id) ?? { winners: [], losers: [] };
    const info = matchOf.get(m.id);
    const wB = rec.winners.map((r) => r.before);
    const lB = rec.losers.map((r) => r.before);
    const avgW = wB.length ? sumArr(wB) / wB.length : 0;
    const avgL = lB.length ? sumArr(lB) / lB.length : 0;
    const winnerPct = Math.round(expectedScore(avgW, avgL) * 100);
    return {
      id: m.id,
      date: (m.played_at as string).slice(0, 10),
      map: m.map,
      winners: rec.winners.map((r) => ({ name: r.name, delta: r.delta })),
      losers: rec.losers.map((r) => ({ name: r.name, delta: r.delta })),
      winnerMmr: sumArr(wB),
      loserMmr: sumArr(lB),
      winnerAvg: Math.round(avgW),
      loserAvg: Math.round(avgL),
      winnerPct,
      loserPct: 100 - winnerPct,
      winScore: (info?.win_score as number | null) ?? null,
      loseScore: (info?.lose_score as number | null) ?? null,
      note: (info?.note as string | null) ?? null,
    };
  });

  // Top movers: net MMR change per player over the last N matches.
  const MOVER_WINDOW = 15;
  const recentIds = new Set(byDateDesc.slice(0, MOVER_WINDOW).map((m) => m.id));
  const net = new Map<string, number>();
  for (const mp of mps) {
    if (!recentIds.has(mp.match_id)) continue;
    const name = (mp.players as unknown as { name: string } | null)?.name;
    if (name) net.set(name, (net.get(name) ?? 0) + mp.delta);
  }
  const movers = [...net]
    .map(([name, delta]) => ({ name, delta }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => b.delta - a.delta);
  const topMovers = [...movers.slice(0, 5), ...movers.slice(-5).filter((m) => m.delta < 0)]
    // dedupe if overlap (few players)
    .filter((m, i, arr) => arr.findIndex((x) => x.name === m.name) === i);

  return (
    <>
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
            Left 4 Dead 2
          </p>
          <h1 className="font-sans text-2xl font-bold uppercase leading-tight tracking-[0.18em] text-white md:text-4xl">
            Welcome to your
            <br />
            unique dashboard
          </h1>
        </div>

        <Card className={cn(glassCard, "flex flex-row items-center gap-3 px-4 py-2.5")}>
          <Avatar className="h-11 w-11 border-2 border-white/70">
            <AvatarFallback className="bg-gradient-to-br from-l4d2-purple to-l4d2-violet text-sm font-bold text-white">
              SV
            </AvatarFallback>
          </Avatar>
          <div className="pr-1">
            <div className="text-sm font-semibold text-white">Survivor</div>
            <div className="text-xs text-l4d2-purple">Nightmare III</div>
          </div>
        </Card>
      </header>

      {/* Stat cards */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Kept mock until player login lands. */}
        <StatCard
          label="Current MMR"
          value="2,420"
          delta="+130"
          trend="up"
          hint="this week"
          icon={Gauge}
        />
        <StatCard
          label="Total matches"
          value={totalMatches.toLocaleString()}
          hint="all-time, this gang"
          icon={Swords}
        />
        <StatCard
          label="Highest overall win rate"
          value={topWinRate ? `${topWinRate.pct}%` : "—"}
          hint={topWinRate ? `${topWinRate.name} · ${topWinRate.games}g` : `min ${20} games`}
          icon={Target}
        />
        {/* Content-rich: full width on phone (2 cols) so names don't clip. */}
        <div className="col-span-2 lg:col-span-1">
          <MapCarousel slides={mapSlides} />
        </div>
      </section>

      {/* Squad synergy: best/worst duos, trios, quads */}
      <section className="mt-6">
        <SquadSynergy squads={squads} />
      </section>

      {/* Matchup preview: MMR at stake before logging */}
      <section className="mt-6">
        <MatchupPreview players={roster} />
      </section>

      {/* Chart + recent matches */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TopMovers movers={topMovers} window={MOVER_WINDOW} />

        <div className="lg:col-span-1">
          <RecentMatches matches={recent} />
        </div>
      </section>
    </>
  );
}
