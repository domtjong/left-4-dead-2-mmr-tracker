"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";
import { mapBannerSrc, mapIconSrc } from "@/lib/l4d2";

type SidePlayer = { name: string; delta: number };
export type RecentMatch = {
  id: string;
  date: string;
  map: string;
  winners: SidePlayer[];
  losers: SidePlayer[];
  winnerMmr: number;
  loserMmr: number;
  winnerAvg: number;
  loserAvg: number;
  winnerPct: number;
  loserPct: number;
  winScore: number | null;
  loseScore: number | null;
  note: string | null;
};

function Roster({
  players,
  won,
  total,
  avg,
}: {
  players: SidePlayer[];
  won: boolean;
  total: number;
  avg: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            won ? "text-emerald-400" : "text-red-400",
          )}
        >
          {won ? "Winners" : "Losers"}
        </span>
        <span className="text-[10px] text-white/40">
          {total} · avg {avg}
        </span>
      </div>
      <div className="space-y-0.5">
        {players.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-white/70">{p.name}</span>
            <span className={p.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
              {p.delta >= 0 ? "+" : ""}
              {p.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecentMatches({ matches }: { matches: RecentMatch[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card className={glassCard}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-lg font-bold text-white">Recent matches</CardTitle>
        <Link
          href="/matches"
          className="text-xs font-medium text-l4d2-purple transition hover:text-white"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="divide-y divide-white/5 p-0">
        {matches.length === 0 && (
          <p className="px-6 py-6 text-sm text-white/40">No matches logged yet.</p>
        )}
        {matches.map((m) => {
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="px-6">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="relative flex w-full items-center gap-3 overflow-hidden rounded-lg py-3 pr-2 text-left"
              >
                {/* Faint wide campaign banner behind the row. */}
                <img
                  src={mapBannerSrc(m.map)}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-l4d2-ink via-l4d2-ink/80 to-transparent" />
                {/* Square Steam completion-achievement icon (banner fallback). */}
                <img
                  src={mapIconSrc(m.map)}
                  alt=""
                  aria-hidden
                  className="relative h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                />
                <div className="relative min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{m.map}</div>
                  <div className="text-[11px] text-white/50">{m.date}</div>
                </div>
                <ChevronDown
                  size={16}
                  className={cn("relative text-white/40 transition", isOpen && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="pb-4 pt-1">
                    {/* Summary: score + pre-game win chance + note */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
                      {m.winScore !== null && m.loseScore !== null && (
                        <span className="text-white/60">
                          Score{" "}
                          <span className="font-semibold text-emerald-400">{m.winScore}</span>
                          <span className="text-white/30"> – </span>
                          <span className="font-semibold text-red-400">{m.loseScore}</span>
                        </span>
                      )}
                      <span className="text-white/50">
                        Win chance{" "}
                        <span className="text-emerald-400">{m.winnerPct}%</span>
                        <span className="text-white/30"> / </span>
                        <span className="text-red-400">{m.loserPct}%</span>
                      </span>
                      {m.note && <span className="italic text-white/40">“{m.note}”</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Roster players={m.winners} won total={m.winnerMmr} avg={m.winnerAvg} />
                      <Roster players={m.losers} won={false} total={m.loserMmr} avg={m.loserAvg} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
