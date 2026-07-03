"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerCombobox from "@/components/matchup/PlayerCombobox";
import { cn, glassCard } from "@/lib/utils";
import { BASE_MMR, expectedScore, ratingDelta, teamAverage } from "@/lib/mmr";

const SLOTS = [0, 1, 2, 3] as const;

type Player = { name: string; mmr: number; games: number };

// Module-level so its identity is stable across renders — otherwise React
// remounts all 8 Radix Selects on every pick, which is what caused the ~1s lag.
function TeamColumn({
  title,
  team,
  players,
  taken,
  accent,
  total,
  avg,
  winPct,
  win,
  loss,
  onPick,
}: {
  title: string;
  team: string[];
  players: Player[];
  taken: Set<string>;
  accent: string;
  total: number | null;
  avg: number | null;
  winPct?: number;
  win?: number;
  loss?: number;
  onPick: (i: number, value: string) => void;
}) {
  return (
    <div className="flex-1 space-y-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold uppercase tracking-widest", accent)}>{title}</span>
        {total !== null && avg !== null && (
          <span className="text-xs text-white/40">
            total {total} · avg {Math.round(avg)}
          </span>
        )}
      </div>
      {winPct !== undefined && (
        <div className="grid animate-row-expand">
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs">
              <span className="text-white/50">Win chance</span>
              <span className={cn("font-semibold", accent)}>{winPct}%</span>
            </div>
          </div>
        </div>
      )}

      {SLOTS.map((i) => {
        const current = team[i];
        // Show this slot's own pick plus anyone not already taken elsewhere.
        const options = players.filter((p) => p.name === current || !taken.has(p.name));
        return (
          <PlayerCombobox
            key={i}
            value={current}
            options={options}
            onChange={(name) => onPick(i, name)}
            placeholder={`Player ${i + 1}`}
          />
        );
      })}

      {win !== undefined && loss !== undefined && (
        <div className="grid animate-row-expand">
          <div className="min-h-0 overflow-hidden">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">If win</span>
                <span className="font-semibold text-emerald-400">+{win} each</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-white/50">If loss</span>
                <span className="font-semibold text-red-400">{loss} each</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchupPreview({ players }: { players: Player[] }) {
  const [teamA, setTeamA] = useState<string[]>(["", "", "", ""]);
  const [teamB, setTeamB] = useState<string[]>(["", "", "", ""]);

  const mmrByName = useMemo(() => new Map(players.map((p) => [p.name, p.mmr])), [players]);
  const taken = useMemo(
    () => new Set([...teamA, ...teamB].filter(Boolean)),
    [teamA, teamB],
  );

  const ratingsOf = (team: string[]) =>
    team.filter(Boolean).map((n) => mmrByName.get(n) ?? BASE_MMR);
  const rA = ratingsOf(teamA);
  const rB = ratingsOf(teamB);
  const avgA = rA.length ? teamAverage(rA) : null;
  const avgB = rB.length ? teamAverage(rB) : null;
  const totalA = rA.length ? rA.reduce((a, b) => a + b, 0) : null;
  const totalB = rB.length ? rB.reduce((a, b) => a + b, 0) : null;
  const ready = avgA !== null && avgB !== null;

  const preview = ready
    ? {
        aWin: ratingDelta(avgA!, avgB!, true),
        aLoss: ratingDelta(avgA!, avgB!, false),
        bWin: ratingDelta(avgB!, avgA!, true),
        bLoss: ratingDelta(avgB!, avgA!, false),
        aPct: Math.round(expectedScore(avgA!, avgB!) * 100),
        bPct: Math.round(expectedScore(avgB!, avgA!) * 100),
      }
    : null;

  const pick =
    (set: (fn: (prev: string[]) => string[]) => void) => (i: number, value: string) =>
      set((prev) => prev.map((n, idx) => (idx === i ? value : n)));

  const anyFilled = taken.size > 0;
  const clearAll = () => {
    setTeamA(["", "", "", ""]);
    setTeamB(["", "", "", ""]);
  };

  return (
    <Card className={glassCard}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="font-display text-lg font-bold text-white">Matchup preview</CardTitle>
          <p className="text-xs text-white/40">
            What each side gains or loses — before you log the game.
          </p>
        </div>
        {anyFilled && (
          <button
            type="button"
            onClick={clearAll}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X size={13} /> Clear all
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <TeamColumn
            title="Team A"
            team={teamA}
            players={players}
            taken={taken}
            accent="text-l4d2-purple"
            total={totalA}
            avg={avgA}
            winPct={preview?.aPct}
            win={preview?.aWin}
            loss={preview?.aLoss}
            onPick={pick(setTeamA)}
          />
          <div className="self-center py-2 text-xs font-bold uppercase tracking-widest text-white/30">
            vs
          </div>
          <TeamColumn
            title="Team B"
            team={teamB}
            players={players}
            taken={taken}
            accent="text-cyan-400"
            total={totalB}
            avg={avgB}
            winPct={preview?.bPct}
            win={preview?.bWin}
            loss={preview?.bLoss}
            onPick={pick(setTeamB)}
          />
        </div>

        {!ready && (
          <p className="mt-4 text-center text-sm text-white/40">
            Add at least one player to each side to preview MMR swing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
