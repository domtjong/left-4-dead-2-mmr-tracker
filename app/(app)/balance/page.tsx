import TeamBalancer from "@/components/balance/TeamBalancer";
import MapSuggester from "@/components/balance/MapSuggester";
import { createClient } from "@/utils/supabase/server";
import { unwrap } from "@/lib/db";
import { MAPS, MAP_ACTS } from "@/lib/l4d2";

export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const db = await createClient();
  const [players, matches] = await Promise.all([
    unwrap<{ name: string; current_mmr: number }[]>(
      "players",
      db.from("players").select("name, current_mmr").order("name", { ascending: true }),
    ),
    unwrap<{ map: string; played_at: string }[]>(
      "matches",
      db.from("matches").select("map, played_at").order("played_at", { ascending: false }),
    ),
  ]);

  // Most recent played date per map, and the maps of the last 3 matches (to
  // exclude so a suggestion doesn't repeat what was just played).
  const lastPlayed: Record<string, string> = {};
  for (const m of matches) if (!(m.map in lastPlayed)) lastPlayed[m.map] = m.played_at;
  const recentMaps = matches.slice(0, 3).map((m) => m.map);

  const mapMeta = MAPS.map((name) => ({ name, acts: MAP_ACTS[name] }));

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
          Balancer
        </p>
        <h1 className="font-sans text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
          Balance teams
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Enter 8 players — get the 3 most even 4v4 splits, so you pick the matchup
          instead of the game auto-balancing.
        </p>
      </header>
      <div className="space-y-6">
        <MapSuggester maps={mapMeta} lastPlayed={lastPlayed} recentMaps={recentMaps} />
        <TeamBalancer players={players.map((p) => ({ name: p.name, mmr: p.current_mmr }))} />
      </div>
    </>
  );
}
