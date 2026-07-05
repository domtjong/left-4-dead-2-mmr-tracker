import TeamBalancer from "@/components/balance/TeamBalancer";
import { createClient } from "@/utils/supabase/server";
import { unwrap } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const db = await createClient();
  const players = await unwrap<{ name: string; current_mmr: number }[]>(
    "players",
    db.from("players").select("name, current_mmr").order("name", { ascending: true }),
  );

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
      <TeamBalancer players={players.map((p) => ({ name: p.name, mmr: p.current_mmr }))} />
    </>
  );
}
