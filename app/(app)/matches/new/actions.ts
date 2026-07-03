"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { applyMatch, BASE_MMR, type PlayerRating } from "@/lib/mmr";
import { MAPS } from "@/lib/l4d2";

export type LogMatchInput = {
  winners: string[]; // 4 player names
  losers: string[]; // 4 player names
  map: string;
  playedAt?: string; // ISO date; defaults to now
  winScore?: number | null; // display only, not in MMR
  loseScore?: number | null;
  note?: string | null;
};

export type LogMatchResult =
  | { ok: true; deltas: { name: string; before: number; after: number; delta: number }[] }
  | { ok: false; error: string };

export async function logMatch(input: LogMatchInput): Promise<LogMatchResult> {
  const winners = input.winners.map((n) => n.trim().toLowerCase());
  const losers = input.losers.map((n) => n.trim().toLowerCase());
  const all = [...winners, ...losers];

  // --- validation ---
  if (all.length !== 8 || all.some((n) => !n)) {
    return { ok: false, error: "Need all 8 players filled in." };
  }
  if (new Set(all).size !== 8) {
    return { ok: false, error: "A player can't appear twice in one match." };
  }
  if (!MAPS.includes(input.map as (typeof MAPS)[number])) {
    return { ok: false, error: "Pick a valid map." };
  }

  const db = await createClient();

  // --- resolve players, creating guests at base MMR for unknown names ---
  const { data: existing, error: pErr } = await db
    .from("players")
    .select("id, name, current_mmr")
    .in("name", all);
  if (pErr) return { ok: false, error: pErr.message };

  const byName = new Map(existing?.map((p) => [p.name, p]) ?? []);
  const unknown = all.filter((n) => !byName.has(n));
  if (unknown.length) {
    const { data: created, error: cErr } = await db
      .from("players")
      .insert(unknown.map((name) => ({ name, current_mmr: BASE_MMR, is_guest: true })))
      .select("id, name, current_mmr");
    if (cErr) return { ok: false, error: cErr.message };
    created?.forEach((p) => byName.set(p.name, p));
  }

  const rate = (name: string): PlayerRating => {
    const p = byName.get(name)!;
    return { id: p.id, mmr: p.current_mmr };
  };
  const teamA = winners.map(rate);
  const teamB = losers.map(rate);

  // --- compute Elo (winners = side A) ---
  const results = applyMatch(teamA, teamB, "A");

  // --- persist: match, match_players, updated ratings ---
  const { data: match, error: mErr } = await db
    .from("matches")
    .insert({
      map: input.map,
      winning_side: "A",
      played_at: input.playedAt ?? new Date().toISOString(),
      win_score: input.winScore ?? null,
      lose_score: input.loseScore ?? null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (mErr || !match) return { ok: false, error: mErr?.message ?? "Failed to create match." };

  const { error: mpErr } = await db.from("match_players").insert(
    results.map((r) => ({
      match_id: match.id,
      player_id: r.id,
      side: r.side,
      mmr_before: r.mmrBefore,
      mmr_after: r.mmrAfter,
      delta: r.delta,
    })),
  );
  if (mpErr) return { ok: false, error: mpErr.message };

  const updates = await Promise.all(
    results.map((r) =>
      db.from("players").update({ current_mmr: r.mmrAfter }).eq("id", r.id),
    ),
  );
  const updateErr = updates.find((u) => u.error)?.error;
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/chart");

  const names = [...winners, ...losers];
  return {
    ok: true,
    deltas: results.map((r, i) => ({
      name: names[i],
      before: r.mmrBefore,
      after: r.mmrAfter,
      delta: r.delta,
    })),
  };
}
