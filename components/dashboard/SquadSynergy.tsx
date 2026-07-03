"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";

export type Combo = { names: string[]; pct: number; g: number; w: number };
export type SquadSize = { size: number; min: number; best: Combo[]; worst: Combo[] };

const LABEL: Record<number, string> = { 2: "Duos", 3: "Trios", 4: "Quads" };

function ComboRow({ c, rank, tone }: { c: Combo; rank: number; tone: "good" | "bad" }) {
  const accent = tone === "good" ? "text-emerald-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-4 shrink-0 text-xs tabular-nums text-white/30">{rank}</span>
      <span className="min-w-0 flex-1 truncate text-white/80">
        {c.names.join(" · ")}
      </span>
      <span className={cn("shrink-0 font-semibold", accent)}>{c.pct}%</span>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/30">
        {c.w}–{c.g - c.w}
      </span>
    </div>
  );
}

function Column({ title, combos, tone }: { title: string; combos: Combo[]; tone: "good" | "bad" }) {
  const accent = tone === "good" ? "text-emerald-400" : "text-red-400";
  return (
    <div>
      <div className={cn("mb-1 text-[10px] font-semibold uppercase tracking-widest", accent)}>
        {title}
      </div>
      {combos.length ? (
        <div className="divide-y divide-white/5">
          {combos.map((c, i) => (
            <ComboRow key={c.names.join("|")} c={c} rank={i + 1} tone={tone} />
          ))}
        </div>
      ) : (
        <div className="py-1.5 text-sm text-white/30">Not enough games yet</div>
      )}
    </div>
  );
}

export default function SquadSynergy({ squads }: { squads: SquadSize[] }) {
  const [size, setSize] = useState(squads[0]?.size ?? 2);
  const cur = squads.find((s) => s.size === size) ?? squads[0];

  return (
    <Card className={glassCard}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Users size={17} className="text-l4d2-purple" /> Squad synergy
          </CardTitle>
          <p className="text-xs text-white/40">
            Best &amp; worst combos by win rate{cur ? ` · min ${cur.min} games` : ""}.
          </p>
        </div>
        {/* Size toggle */}
        <div className="flex shrink-0 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {squads.map((s) => (
            <button
              key={s.size}
              type="button"
              onClick={() => setSize(s.size)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                s.size === size
                  ? "bg-l4d2-purple text-white"
                  : "text-white/50 hover:text-white",
              )}
            >
              {LABEL[s.size]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Column title="Best" combos={cur?.best ?? []} tone="good" />
          <Column title="Worst" combos={cur?.worst ?? []} tone="bad" />
        </div>
      </CardContent>
    </Card>
  );
}
