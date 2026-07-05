"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { applyMatch, BASE_MMR, type PlayerRating, type Side } from "@/lib/mmr";
import { fetchAllRows } from "@/lib/db";
import { logEvent, logError } from "@/lib/log";
import { isValidPin } from "@/lib/pin";

export type DeleteMatchResult = { ok: true } | { ok: false; error: string };

/**
 * Delete a match and rebuild MMR from scratch.
 *
 * MMR is a sequential replay of the whole match log, so removing a game in the
 * middle invalidates every rating recorded after it. Rather than patch, we drop
 * the match (match_players cascades) and recompute the entire history in date
 * order, rewriting match_players before/after/delta and every player's
 * current_mmr. Correct and simple; the log is small (a few hundred matches).
 */
export async function deleteMatch(id: string, pin: string): Promise<DeleteMatchResult> {
  if (!isValidPin(pin)) {
    logEvent("match.delete.rejected", { id, reason: "invalid_pin" });
    return { ok: false, error: "Wrong PIN." };
  }

  const db = await createClient();

  // Capture what we're deleting so the log shows the match, not just an id.
  const { data: doomed } = await db
    .from("matches")
    .select("id, map, played_at, win_score, lose_score, note, match_players(side, players(name))")
    .eq("id", id)
    .single();
  const roster = (doomed?.match_players ?? []) as unknown as {
    side: string;
    players: { name: string } | null;
  }[];
  logEvent("match.delete.request", {
    id,
    map: doomed?.map ?? null,
    playedAt: doomed?.played_at ?? null,
    winScore: doomed?.win_score ?? null,
    loseScore: doomed?.lose_score ?? null,
    note: doomed?.note ?? null,
    winners: roster.filter((r) => r.side === "A").map((r) => r.players?.name),
    losers: roster.filter((r) => r.side === "B").map((r) => r.players?.name),
  });

  // 1. Remove the match. match_players rows cascade via FK.
  const { error: delErr } = await db.from("matches").delete().eq("id", id);
  if (delErr) {
    logError("match.delete", delErr, { id, step: "delete_match" });
    return { ok: false, error: delErr.message };
  }

  // 2. Load everything needed to replay the remaining log.
  const [matchesRes, mps, playersRes] = await Promise.all([
    db
      .from("matches")
      .select("id, winning_side, played_at, created_at")
      .order("played_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    fetchAllRows<{ match_id: string; player_id: string; side: string }>((from, to) =>
      db.from("match_players").select("match_id, player_id, side").order("id").range(from, to),
    ),
    db.from("players").select("id"),
  ]);
  if (matchesRes.error) return { ok: false, error: matchesRes.error.message };
  if (playersRes.error) return { ok: false, error: playersRes.error.message };

  const matches = matchesRes.data ?? [];
  const players = playersRes.data ?? [];

  // Roster (player ids per side) for each remaining match.
  const rosterOf = new Map<string, { A: string[]; B: string[] }>();
  for (const mp of mps) {
    const rec = rosterOf.get(mp.match_id) ?? { A: [], B: [] };
    (mp.side === "A" ? rec.A : rec.B).push(mp.player_id);
    rosterOf.set(mp.match_id, rec);
  }

  // 3. Replay. Seed every player at base so orphaned players reset cleanly.
  const rating = new Map<string, number>(players.map((p) => [p.id, BASE_MMR]));
  const newRows: {
    match_id: string;
    player_id: string;
    side: Side;
    mmr_before: number;
    mmr_after: number;
    delta: number;
  }[] = [];

  for (const m of matches) {
    const roster = rosterOf.get(m.id);
    if (!roster || roster.A.length === 0 || roster.B.length === 0) continue;
    const toRating = (pid: string): PlayerRating => ({ id: pid, mmr: rating.get(pid) ?? BASE_MMR });
    const teamA = roster.A.map(toRating);
    const teamB = roster.B.map(toRating);
    const results = applyMatch(teamA, teamB, m.winning_side as Side);
    for (const r of results) {
      rating.set(r.id, r.mmrAfter);
      newRows.push({
        match_id: m.id,
        player_id: r.id,
        side: r.side,
        mmr_before: r.mmrBefore,
        mmr_after: r.mmrAfter,
        delta: r.delta,
      });
    }
  }

  // 4. Replace all match_players with the recomputed rows.
  const { error: wipeErr } = await db.from("match_players").delete().not("id", "is", null);
  if (wipeErr) {
    logError("match.delete", wipeErr, { id, step: "wipe_match_players" });
    return { ok: false, error: wipeErr.message };
  }

  for (let j = 0; j < newRows.length; j += 500) {
    const { error: insErr } = await db.from("match_players").insert(newRows.slice(j, j + 500));
    if (insErr) {
      logError("match.delete", insErr, { id, step: "reinsert_match_players" });
      return { ok: false, error: insErr.message };
    }
  }

  // 5. Write back every player's final rating (resets orphans to base).
  const updates = await Promise.all(
    [...rating].map(([pid, mmr]) => db.from("players").update({ current_mmr: mmr }).eq("id", pid)),
  );
  const upErr = updates.find((u) => u.error)?.error;
  if (upErr) {
    logError("match.delete", upErr, { id, step: "update_ratings" });
    return { ok: false, error: upErr.message };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/chart");
  logEvent("match.delete.done", {
    id,
    matchesReplayed: matches.length,
    rowsWritten: newRows.length,
    playersUpdated: rating.size,
  });
  return { ok: true };
}
