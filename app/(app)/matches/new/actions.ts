"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { applyMatch, BASE_MMR, type PlayerRating } from "@/lib/mmr";
import { MAPS } from "@/lib/l4d2";
import { logEvent, logError } from "@/lib/log";
import { isValidPin } from "@/lib/pin";

export type LogMatchInput = {
  pin: string;
  winners: string[]; // 4 player names
  losers: string[]; // 4 player names
  map: string;
  enteredBy: string; // who signed off on the entry (for auditing)
  playedAt?: string; // ISO date; defaults to now
  winScore?: number | null; // display only, not in MMR
  loseScore?: number | null;
  note?: string | null;
};

export type LogMatchResult =
  | { ok: true; deltas: { name: string; before: number; after: number; delta: number }[] }
  | { ok: false; error: string };

/** Check the daily PIN without submitting — used to gate the confirm step. */
export async function verifyPin(pin: string): Promise<boolean> {
  return isValidPin(pin);
}

export async function logMatch(input: LogMatchInput): Promise<LogMatchResult> {
  const winners = input.winners.map((n) => n.trim().toLowerCase());
  const losers = input.losers.map((n) => n.trim().toLowerCase());
  const all = [...winners, ...losers];
  const enteredBy = input.enteredBy?.trim() || "";

  logEvent("match.new.request", {
    map: input.map,
    enteredBy,
    playedAt: input.playedAt ?? null,
    winners,
    losers,
    winScore: input.winScore ?? null,
    loseScore: input.loseScore ?? null,
    note: input.note?.trim() || null,
  });

  if (!isValidPin(input.pin)) {
    logEvent("match.new.rejected", { reason: "invalid_pin" });
    return { ok: false, error: "Wrong PIN." };
  }

  // --- validation ---
  if (all.length !== 8 || all.some((n) => !n)) {
    logEvent("match.new.rejected", { reason: "missing_players" });
    return { ok: false, error: "Need all 8 players filled in." };
  }
  if (new Set(all).size !== 8) {
    logEvent("match.new.rejected", { reason: "duplicate_player", all });
    return { ok: false, error: "A player can't appear twice in one match." };
  }
  if (!MAPS.includes(input.map as (typeof MAPS)[number])) {
    logEvent("match.new.rejected", { reason: "invalid_map", map: input.map });
    return { ok: false, error: "Pick a valid map." };
  }
  if (!enteredBy) {
    logEvent("match.new.rejected", { reason: "missing_entered_by" });
    return { ok: false, error: "Sign your name to confirm the match." };
  }
  // Scores are display-only but still validated server-side — the form's
  // score-swap warning is client-only and bypassable.
  const ws = input.winScore ?? null;
  const ls = input.loseScore ?? null;
  for (const [label, v] of [["winScore", ws], ["loseScore", ls]] as const) {
    if (v !== null && (!Number.isInteger(v) || v < 0)) {
      logEvent("match.new.rejected", { reason: "bad_score", label, value: v });
      return { ok: false, error: "Scores must be whole, non-negative numbers." };
    }
  }
  if (ws !== null && ls !== null && ws < ls) {
    logEvent("match.new.rejected", { reason: "score_swapped", ws, ls });
    return { ok: false, error: "Winner score is below loser score — teams may be swapped." };
  }
  if (input.playedAt !== undefined && Number.isNaN(Date.parse(input.playedAt))) {
    logEvent("match.new.rejected", { reason: "bad_played_at", playedAt: input.playedAt });
    return { ok: false, error: "Invalid match date." };
  }

  const db = createAdminClient();

  // --- resolve players, creating guests at base MMR for unknown names ---
  const { data: existing, error: pErr } = await db
    .from("players")
    .select("id, name, current_mmr")
    .in("name", all);
  if (pErr) {
    logError("match.new", pErr, { step: "load_players" });
    return { ok: false, error: pErr.message };
  }

  const byName = new Map(existing?.map((p) => [p.name, p]) ?? []);
  const unknown = all.filter((n) => !byName.has(n));
  if (unknown.length) {
    const { data: created, error: cErr } = await db
      .from("players")
      .insert(unknown.map((name) => ({ name, current_mmr: BASE_MMR, is_guest: true })))
      .select("id, name, current_mmr");
    if (cErr) {
      logError("match.new", cErr, { step: "create_guests", names: unknown });
      return { ok: false, error: cErr.message };
    }
    created?.forEach((p) => byName.set(p.name, p));
    logEvent("player.guest.created", { names: unknown });
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
      entered_by: enteredBy,
      win_score: input.winScore ?? null,
      lose_score: input.loseScore ?? null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (mErr || !match) {
    logError("match.new", mErr ?? "insert returned no row", { step: "insert_match" });
    return { ok: false, error: mErr?.message ?? "Failed to create match." };
  }

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
  if (mpErr) {
    logError("match.new", mpErr, { step: "insert_match_players", matchId: match.id });
    return { ok: false, error: mpErr.message };
  }

  const updates = await Promise.all(
    results.map((r) =>
      db.from("players").update({ current_mmr: r.mmrAfter }).eq("id", r.id),
    ),
  );
  const updateErr = updates.find((u) => u.error)?.error;
  if (updateErr) {
    logError("match.new", updateErr, { step: "update_ratings", matchId: match.id });
    return { ok: false, error: updateErr.message };
  }

  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/chart");

  const names = [...winners, ...losers];
  logEvent("match.new.created", {
    matchId: match.id,
    map: input.map,
    enteredBy,
    winners,
    losers,
    winScore: input.winScore ?? null,
    loseScore: input.loseScore ?? null,
    note: input.note?.trim() || null,
    deltas: results.map((r, i) => ({ name: names[i], side: r.side, delta: r.delta, after: r.mmrAfter })),
  });
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
