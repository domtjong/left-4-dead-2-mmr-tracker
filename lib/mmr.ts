// L4D2 MMR — team Elo. See PROJECT.md §4.
// Pure functions, no I/O, unit-testable. MMR is always derived from the raw
// match log; never hand-edit a stored rating — recompute instead.

/** Starting rating for every player (and every new guest). */
export const BASE_MMR = 1000;

/** How much rating moves per match. Higher = faster swings. */
export const K_FACTOR = 64;

/** Elo logistic scale. 400 = a 400-point gap ≈ 10:1 expected win odds. */
const ELO_SCALE = 400;

export type Side = "A" | "B";

/** Average current MMR of a team's players. */
export function teamAverage(ratings: number[]): number {
  if (ratings.length === 0) throw new Error("teamAverage: empty team");
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

/**
 * Expected score (0..1) for `ownAvg` against `opponentAvg`.
 * 0.5 = evenly matched; >0.5 = favored.
 */
export function expectedScore(ownAvg: number, opponentAvg: number): number {
  return 1 / (1 + 10 ** ((opponentAvg - ownAvg) / ELO_SCALE));
}

/**
 * MMR delta applied to every player on a side.
 * `won` = did this side win. Same magnitude for all 4 players on the side.
 */
export function ratingDelta(
  ownAvg: number,
  opponentAvg: number,
  won: boolean,
  k: number = K_FACTOR,
): number {
  const actual = won ? 1 : 0;
  return Math.round(k * (actual - expectedScore(ownAvg, opponentAvg)));
}

export type PlayerRating = { id: string; mmr: number };
export type MatchResult = {
  id: string;
  side: Side;
  mmrBefore: number;
  mmrAfter: number;
  delta: number;
};

/**
 * Compute new ratings for one 4v4 match.
 * `teamA` / `teamB` are the players (with current MMR) on each side;
 * `winningSide` says who won. Returns per-player before/after/delta rows
 * ready to persist to `match_players`.
 */
export function applyMatch(
  teamA: PlayerRating[],
  teamB: PlayerRating[],
  winningSide: Side,
  k: number = K_FACTOR,
): MatchResult[] {
  const avgA = teamAverage(teamA.map((p) => p.mmr));
  const avgB = teamAverage(teamB.map((p) => p.mmr));

  const deltaA = ratingDelta(avgA, avgB, winningSide === "A", k);
  const deltaB = ratingDelta(avgB, avgA, winningSide === "B", k);

  const rows = (team: PlayerRating[], side: Side, delta: number) =>
    team.map((p) => ({
      id: p.id,
      side,
      mmrBefore: p.mmr,
      mmrAfter: p.mmr + delta,
      delta,
    }));

  return [...rows(teamA, "A", deltaA), ...rows(teamB, "B", deltaB)];
}
