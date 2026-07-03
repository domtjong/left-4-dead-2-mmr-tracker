import NewMatchForm from "@/components/matches/NewMatchForm";
import { createClient } from "@/utils/supabase/server";
import { MAPS } from "@/lib/l4d2";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const db = await createClient();
  const { data: players } = await db
    .from("players")
    .select("name")
    .order("name", { ascending: true });

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
          New match
        </p>
        <h1 className="font-sans text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
          Log a game
        </h1>
      </header>
      <NewMatchForm players={(players ?? []).map((p) => p.name)} maps={MAPS} />
    </>
  );
}
