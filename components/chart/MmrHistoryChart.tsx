"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";

export type ChartRow = { idx: number; date: string; [player: string]: number | string };

// Distinct-on-dark palette; cycles if more players are selected than colors.
const PALETTE = [
  "#8438FF", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899",
  "#a3e635", "#f97316", "#3b82f6", "#e879f9", "#14b8a6", "#facc15",
];

export default function MmrHistoryChart({
  rows,
  roster,
}: {
  rows: ChartRow[];
  roster: { name: string; mmr: number; games: number }[];
}) {
  // Everyone who has actually played, most active first.
  const played = useMemo(
    () =>
      [...roster]
        .filter((p) => p.games > 0)
        .sort((a, b) => b.games - a.games || b.mmr - a.mmr),
    [roster],
  );
  const regularNames = useMemo(
    () => played.filter((p) => p.games >= 5).map((p) => p.name),
    [played],
  );

  // Default selection: the 5+ match regulars (fallback to the 12 most active).
  const [selected, setSelected] = useState<Set<string>>(() => {
    const regulars = roster.filter((p) => p.games >= 5).map((p) => p.name);
    const base = regulars.length
      ? regulars
      : [...roster]
          .sort((a, b) => b.games - a.games)
          .slice(0, 12)
          .map((p) => p.name);
    return new Set(base);
  });

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  // "5+ matches" is a bulk toggle for the regulars, living in the same list.
  const allRegularsSelected =
    regularNames.length > 0 && regularNames.every((n) => selected.has(n));
  const toggleRegulars = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allRegularsSelected) regularNames.forEach((n) => next.delete(n));
      else regularNames.forEach((n) => next.add(n));
      return next;
    });

  // Plot the picked players (among those who've played).
  const active = useMemo(
    () => played.filter((p) => selected.has(p.name)),
    [played, selected],
  );
  const colorOf = (name: string) =>
    name === "mevan"
      ? "#000000"
      : PALETTE[active.findIndex((p) => p.name === name) % PALETTE.length];

  // Carry each selected player's MMR forward across matches they sat out, so a
  // hovered point shows everyone's current rating — not just that match's
  // participants. Lines hold flat between games (MMR only moves on a played one).
  const filled = useMemo(() => {
    const last: Record<string, number> = {};
    return rows.map((row) => {
      const out: ChartRow = { idx: row.idx as number, date: row.date as string };
      for (const p of active) {
        const v = row[p.name];
        if (typeof v === "number") last[p.name] = v;
        if (last[p.name] !== undefined) out[p.name] = last[p.name];
      }
      return out;
    });
  }, [rows, active]);

  // Track the chart's rendered width so the tooltip can be pinned just past the
  // card's right edge (overspilling right) instead of covering the lines.
  // Too narrow (phones) → let the tooltip float with the cursor instead.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const wide = width >= 640;

  return (
    <Card className={glassCard}>
      <CardContent className="space-y-5 pt-6">
        {/* Per-player toggles + presets */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleRegulars}
              disabled={regularNames.length === 0}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40",
                allRegularsSelected
                  ? "border-transparent bg-l4d2-purple text-white"
                  : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
              )}
            >
              5+ matches
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              Deselect all
            </button>
            <span className="ml-auto text-xs text-white/40">
              {active.length} of {played.length} shown
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {played.map((p) => {
              const on = selected.has(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => toggle(p.name)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    on
                      ? "border-transparent bg-l4d2-purple text-white"
                      : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={wrapRef} className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filled} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              {/* Starting-MMR baseline. */}
              <ReferenceLine
                y={1000}
                stroke="rgba(255,255,255,0.28)"
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
                label={{
                  value: "base 1000",
                  position: "insideBottomLeft",
                  fill: "rgba(255,255,255,0.4)",
                  fontSize: 10,
                }}
              />
              <XAxis
                dataKey="idx"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                // Keep the 1000 baseline in view even if everyone is above it.
                domain={[
                  (min: number) => Math.min(1000, Math.floor(min) - 40),
                  (max: number) => Math.ceil(max) + 40,
                ]}
                width={48}
              />
              <Tooltip
                // Order the rows by MMR at that match (highest first) so the
                // tooltip matches the lines' top-to-bottom order on the chart.
                itemSorter={(item) => -(item.value as number)}
                // On wide screens, pin the tooltip just past the card's right
                // edge so it overspills to the right instead of covering the
                // lines (no reserved gutter). Phones keep the floating tooltip.
                position={wide ? { x: width + 12, y: 8 } : undefined}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 20 }}
                contentStyle={{
                  background: "rgba(15,15,18,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                labelFormatter={(idx) => {
                  const row = rows.find((r) => r.idx === idx);
                  return row ? `Match ${idx} · ${row.date}` : `Match ${idx}`;
                }}
              />
              {active.map((p) => (
                <Line
                  key={p.name}
                  type="monotone"
                  dataKey={p.name}
                  stroke={colorOf(p.name)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {active.length === 0 && (
          <p className="text-center text-sm text-white/40">
            Select players above to plot their MMR.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
