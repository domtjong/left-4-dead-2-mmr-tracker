"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";
import { BASE_MMR, expectedScore, teamAverage } from "@/lib/mmr";

type Player = { name: string; mmr: number };
const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-l4d2-purple/60 focus:ring-1 focus:ring-l4d2-purple/40";

// The 35 unique 4v4 splits of 8 players: fix player 0 on team A, then choose its
// 3 teammates from the remaining 7 (C(7,3) = 35). Fixing player 0 also removes
// the A/B mirror duplicates (70 → 35).
function splitsOfEight(): [number[], number[]][] {
  const out: [number[], number[]][] = [];
  const rest = [1, 2, 3, 4, 5, 6, 7];
  for (let i = 0; i < rest.length; i++)
    for (let j = i + 1; j < rest.length; j++)
      for (let k = j + 1; k < rest.length; k++) {
        const a = [0, rest[i], rest[j], rest[k]];
        const aSet = new Set(a);
        const b = [0, 1, 2, 3, 4, 5, 6, 7].filter((x) => !aSet.has(x));
        out.push([a, b]);
      }
  return out;
}
const SPLITS = splitsOfEight();

// Module-level: stable identity so re-renders don't remount the inputs.
function TeamBox({
  names,
  avg,
  pct,
  accent,
  ring,
}: {
  names: string[];
  avg: number;
  pct: number;
  accent: string;
  ring: string;
}) {
  return (
    <div className={cn("flex-1 rounded-xl border border-white/10 bg-black/20 p-4 ring-1", ring)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className={cn("text-xs font-semibold uppercase tracking-widest", accent)}>Team</span>
        <span className="text-xs text-white/40">
          avg {avg} · {pct}%
        </span>
      </div>
      <ul className="space-y-1 text-sm text-white/80">
        {names.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export default function TeamBalancer({ players }: { players: Player[] }) {
  const [names, setNames] = useState<string[]>(() => Array(8).fill(""));

  const mmrByName = useMemo(
    () => new Map(players.map((p) => [p.name.toLowerCase(), p.mmr])),
    [players],
  );
  const options = useMemo(() => players.map((p) => p.name), [players]);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const clean = names.map((n) => n.trim());
  const lower = clean.filter(Boolean).map((n) => n.toLowerCase());
  const dupes = lower.length !== new Set(lower).size;
  const ready = lower.length === 8 && !dupes;
  const chosen = new Set(lower);

  const results = useMemo(() => {
    if (!ready) return [];
    const ratings = clean.map((n) => mmrByName.get(n.toLowerCase()) ?? BASE_MMR);
    return SPLITS.map(([a, b]) => {
      const avgA = teamAverage(a.map((i) => ratings[i]));
      const avgB = teamAverage(b.map((i) => ratings[i]));
      const pA = expectedScore(avgA, avgB);
      const teamA = { names: a.map((i) => clean[i]), avg: Math.round(avgA), pct: Math.round(pA * 100) };
      const teamB = { names: b.map((i) => clean[i]), avg: Math.round(avgB), pct: Math.round((1 - pA) * 100) };
      // Sides are symmetric; randomise which shows on the left so the
      // first-entered player isn't always anchored to Team A.
      const swap = Math.random() < 0.5;
      return {
        left: swap ? teamB : teamA,
        right: swap ? teamA : teamB,
        gap: Math.abs(Math.round(avgA - avgB)),
        skew: Math.abs(pA - 0.5), // distance from a coin flip; lower = fairer
      };
    })
      .sort((x, y) => x.skew - y.skew)
      .slice(0, 3);
    // clean is derived from names each render; names is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, names, mmrByName]);

  // Which option the dice picked. Reset whenever the split set changes.
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [results]);

  return (
    <div className="space-y-6">
      <Card className={cn(glassCard, "mx-auto max-w-2xl")}>
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold text-white">Enter 8 players</CardTitle>
          <p className="text-xs text-white/40">
            Type a name to pick a player. An unknown name is treated as a guest at base{" "}
            {BASE_MMR} MMR.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SLOTS.map((i) => {
              // Everyone taken except this slot's own current pick.
              const taken = new Set(chosen);
              taken.delete(clean[i].toLowerCase());
              const opts = options.filter((p) => !taken.has(p.toLowerCase()));
              const listId = `bal-${i}`;
              return (
                <div key={i}>
                  <input
                    list={listId}
                    value={names[i]}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className={inputCls}
                    autoComplete="off"
                  />
                  <datalist id={listId}>
                    {opts.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{lower.length}/8 entered</span>
            {dupes && <span className="font-medium text-red-400">Duplicate names</span>}
            {clean.some(Boolean) && (
              <button
                type="button"
                onClick={() => setNames(Array(8).fill(""))}
                className="text-white/50 transition hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-between gap-3 sm:flex-row">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-l4d2-purple">
              3 most balanced splits
            </h2>
            <button
              type="button"
              onClick={() => setPicked(Math.floor(Math.random() * results.length))}
              className="flex items-center gap-2 rounded-full border border-l4d2-purple/40 bg-l4d2-purple/15 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-l4d2-purple/25"
            >
              <Dices size={15} />
              Pick one for us
            </button>
          </div>
          {results.map((r, i) => {
            const isPick = picked === i;
            const dimmed = picked !== null && !isPick;
            return (
              <Card
                key={i}
                className={cn(
                  glassCard,
                  "mx-auto max-w-2xl transition",
                  isPick && "ring-2 ring-l4d2-purple",
                  dimmed && "opacity-50",
                )}
              >
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold uppercase tracking-widest text-white/50">
                      Option {i + 1}
                      {isPick && (
                        <span className="rounded-full bg-l4d2-purple px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          Selected
                        </span>
                      )}
                    </span>
                    <span className="text-white/40">
                      MMR gap {r.gap} · {r.left.pct}% / {r.right.pct}% win
                    </span>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                    <TeamBox
                      names={r.left.names}
                      avg={r.left.avg}
                      pct={r.left.pct}
                      accent="text-l4d2-purple"
                      ring="ring-l4d2-purple/30"
                    />
                    <div className="self-center text-xs font-bold uppercase tracking-widest text-white/30">
                      vs
                    </div>
                    <TeamBox
                      names={r.right.names}
                      avg={r.right.avg}
                      pct={r.right.pct}
                      accent="text-cyan-400"
                      ring="ring-cyan-400/30"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
