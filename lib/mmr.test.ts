import { describe, it, expect } from "vitest";
import {
  BASE_MMR,
  K_FACTOR,
  teamAverage,
  expectedScore,
  ratingDelta,
  applyMatch,
  type PlayerRating,
} from "./mmr";

const team = (...mmrs: number[]): PlayerRating[] =>
  mmrs.map((mmr, i) => ({ id: `p${i}`, mmr }));

describe("teamAverage", () => {
  it("averages the ratings", () => {
    expect(teamAverage([1000, 1000, 1000, 1000])).toBe(1000);
    expect(teamAverage([900, 1000, 1100, 1200])).toBe(1050);
  });

  it("throws on empty team", () => {
    expect(() => teamAverage([])).toThrow();
  });
});

describe("expectedScore", () => {
  it("is 0.5 for evenly matched teams", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10);
  });

  it("favors the higher-rated side", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it("both sides' expected scores sum to 1", () => {
    expect(expectedScore(1300, 900) + expectedScore(900, 1300)).toBeCloseTo(1, 10);
  });

  it("400-point gap ~= 10:1 odds (≈0.909)", () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 3);
  });
});

describe("ratingDelta", () => {
  it("even match: winner +16, loser -16 at K=32", () => {
    expect(ratingDelta(1000, 1000, true)).toBe(16);
    expect(ratingDelta(1000, 1000, false)).toBe(-16);
  });

  it("beating a stronger team gains more than beating a weaker one", () => {
    const upsetWin = ratingDelta(1000, 1200, true);
    const expectedWin = ratingDelta(1200, 1000, true);
    expect(upsetWin).toBeGreaterThan(expectedWin);
  });

  it("respects a custom K-factor", () => {
    expect(ratingDelta(1000, 1000, true, 16)).toBe(8);
  });
});

describe("applyMatch", () => {
  it("even 4v4: winners +16, losers -16, zero-sum", () => {
    const rows = applyMatch(
      team(1000, 1000, 1000, 1000),
      team(1000, 1000, 1000, 1000),
      "A",
    );
    expect(rows).toHaveLength(8);
    const a = rows.filter((r) => r.side === "A");
    const b = rows.filter((r) => r.side === "B");
    expect(a.every((r) => r.delta === 16)).toBe(true);
    expect(b.every((r) => r.delta === -16)).toBe(true);
    const totalDelta = rows.reduce((s, r) => s + r.delta, 0);
    expect(totalDelta).toBe(0);
  });

  it("sets mmrAfter = mmrBefore + delta per player", () => {
    const rows = applyMatch(team(1000, 1050), team(1000, 950), "A");
    for (const r of rows) {
      expect(r.mmrAfter).toBe(r.mmrBefore + r.delta);
    }
  });

  it("all players on a side share the same delta", () => {
    const rows = applyMatch(team(900, 1100), team(1000, 1000), "B");
    const a = rows.filter((r) => r.side === "A");
    const b = rows.filter((r) => r.side === "B");
    expect(new Set(a.map((r) => r.delta)).size).toBe(1);
    expect(new Set(b.map((r) => r.delta)).size).toBe(1);
  });

  it("winning underdog team gains, favored losers drop by same magnitude", () => {
    const rows = applyMatch(team(900, 900), team(1100, 1100), "A");
    const winDelta = rows.find((r) => r.side === "A")!.delta;
    const loseDelta = rows.find((r) => r.side === "B")!.delta;
    expect(winDelta).toBeGreaterThan(16); // upset → more than the even-match 16
    expect(winDelta).toBe(-loseDelta); // symmetric
  });

  it("uses expected constants", () => {
    expect(BASE_MMR).toBe(1000);
    expect(K_FACTOR).toBe(32);
  });
});
