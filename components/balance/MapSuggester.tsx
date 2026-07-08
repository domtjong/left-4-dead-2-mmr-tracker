"use client";

import { useRef, useState } from "react";
import { Loader2, MapPin, Shuffle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";
import { mapSlug } from "@/lib/l4d2";

type MapMeta = { name: string; acts: number };

// How stale a map is: never-played sorts oldest (0), else its last-played time.
const staleness = (name: string, lastPlayed: Record<string, string>) =>
  lastPlayed[name] ? new Date(lastPlayed[name]).getTime() : 0;

// Consecutive length labels by chapter count so any map reads clearly.
function tier(acts: number) {
  return acts === 2 ? "Short" : acts === 3 ? "Medium" : acts === 4 ? "Medium-Long" : "Long";
}

function agoShort(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function lastPlayedLabel(iso?: string) {
  if (!iso) return "never played";
  return `last played ${iso.slice(0, 10)} · ${agoShort(iso)}`;
}

export default function MapSuggester({
  maps,
  lastPlayed,
  recentMaps,
}: {
  maps: MapMeta[];
  lastPlayed: Record<string, string>;
  recentMaps: string[];
}) {
  // Chapter counts present in the map pool, e.g. [2, 3, 4, 5].
  const allActs = [...new Set(maps.map((m) => m.acts))].sort((a, b) => a - b);

  // Which chapter counts we feel like playing (default: none = any).
  const [acts, setActs] = useState<Set<number>>(() => new Set());
  const [pick, setPick] = useState<MapMeta | null>(null);
  const [rolling, setRolling] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate + diversify: among maps whose chapter count is selected and that
  // weren't in the last 5 games, take the least-recently-played few and pick
  // one at random (avoiding an immediate repeat).
  const pickMap = (want: Set<number>, avoid?: string): MapMeta | null => {
    const allow = want.size ? want : new Set(allActs); // none picked → any
    const eligible = maps
      .filter((m) => allow.has(m.acts) && !recentMaps.includes(m.name))
      .sort((a, b) => staleness(a.name, lastPlayed) - staleness(b.name, lastPlayed));
    if (eligible.length === 0) return null;
    const stalest = eligible.slice(0, Math.min(3, eligible.length));
    const pool = stalest.filter((m) => m.name !== avoid);
    const from = pool.length ? pool : stalest;
    return from[Math.floor(Math.random() * from.length)];
  };

  // Brief spin before revealing, so a reroll feels like an actual roll.
  const suggest = (want: Set<number>, avoid?: string) => {
    const chosen = pickMap(want, avoid);
    if (rollTimer.current) clearTimeout(rollTimer.current);
    if (!chosen) {
      setRolling(false);
      setPick(null);
      return;
    }
    setRolling(true);
    rollTimer.current = setTimeout(() => {
      setPick(chosen);
      setRolling(false);
    }, 450);
  };

  const toggleAct = (n: number) => {
    const next = new Set(acts);
    next.has(n) ? next.delete(n) : next.add(n);
    setActs(next);
    // Clear the current pick so the Roll button returns — feels like a fresh
    // roll every time the length selection changes.
    if (rollTimer.current) clearTimeout(rollTimer.current);
    setRolling(false);
    setPick(null);
  };

  return (
    <Card className={cn(glassCard, "mx-auto max-w-2xl")}>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-l4d2-purple/20 text-l4d2-purple">
          <MapPin size={20} />
        </div>
        <div>
          <CardTitle className="font-display text-lg font-bold text-white">Map suggestion</CardTitle>
          <p className="text-xs text-white/40">
            Rotates in something you haven&apos;t played lately (skips the last 5 games).
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chapter-count selection */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-white/40">
            Chapters
          </span>
          {allActs.map((n) => {
            const on = acts.has(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleAct(n)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  on
                    ? "border-transparent bg-l4d2-purple text-white"
                    : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
                )}
              >
                {n} · {tier(n)}
              </button>
            );
          })}
        </div>

        {/* Result */}
        {rolling ? (
          <div className="flex min-h-[190px] items-center justify-center rounded-xl border border-white/10 bg-black/30">
            <div className="flex flex-col items-center gap-2 text-white/60">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-xs font-medium uppercase tracking-widest">Rolling…</span>
            </div>
          </div>
        ) : pick ? (
          <div className="relative min-h-[190px] overflow-hidden rounded-xl border border-white/10">
            {/* In-game campaign banner — taller so more of it shows. */}
            <img
              src={`/maps/${mapSlug(pick.name)}.jpg`}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <button
              type="button"
              onClick={() => suggest(acts, pick.name)}
              className="absolute right-2 top-2 z-10 flex items-center gap-2 rounded-full border border-white/25 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70"
            >
              <Shuffle size={14} />
              Reroll
            </button>
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="truncate font-display text-xl font-bold text-white drop-shadow">
                {pick.name}
              </div>
              <div className="mt-0.5 text-xs text-white/70 drop-shadow">
                {pick.acts} chapters · {tier(pick.acts)} · {lastPlayedLabel(lastPlayed[pick.name])}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => suggest(acts)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-l4d2-purple/40 bg-l4d2-purple/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-l4d2-purple/25"
          >
            <Shuffle size={16} />
            Roll
          </button>
        )}
      </CardContent>
    </Card>
  );
}
