"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import PlayerMultiCombobox from "@/components/PlayerMultiCombobox";
import { cn, glassCard } from "@/lib/utils";

type SortKey = "rank" | "name" | "mmr" | "games" | "wins" | "losses" | "winPct";

export type StandingRow = {
  rank: number;
  name: string;
  mmr: number;
  games: number;
  wins: number;
  losses: number;
  winPct: number;
  isGuest: boolean;
};

export default function StandingsTable({ rows }: { rows: StandingRow[] }) {
  // Empty selection = show everyone; pick names (or the 5+ preset) to filter.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const regularNames = useMemo(
    () => rows.filter((r) => r.games >= 5).map((r) => r.name),
    [rows],
  );

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const allRegularsSelected =
    regularNames.length > 0 && regularNames.every((n) => selected.has(n));
  const toggleRegulars = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allRegularsSelected) regularNames.forEach((n) => next.delete(n));
      else regularNames.forEach((n) => next.add(n));
      return next;
    });

  const filtered = selected.size
    ? rows.filter((r) => selected.has(r.name))
    : rows;

  // Click a column to sort by it; numeric columns default high→low, name A→Z.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "mmr",
    dir: "desc",
  });
  const changeSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const c =
        sort.key === "name"
          ? a.name.localeCompare(b.name)
          : (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === "asc" ? c : -c;
    });
    return arr;
  }, [filtered, sort]);

  // Clickable, sort-aware header cell for the desktop table.
  const Th = ({
    label,
    k,
    align = "right",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={cn("px-4 py-2.5 font-semibold", align === "right" ? "text-right" : "text-left")}>
        <button
          type="button"
          onClick={() => changeSort(k)}
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-widest transition hover:text-white",
            align === "right" && "flex-row-reverse",
            active ? "text-white" : "text-white/40",
          )}
        >
          <span>{label}</span>
          <Icon size={12} className={active ? "text-l4d2-purple" : "text-white/30"} />
        </button>
      </th>
    );
  };

  return (
    <Card className={cn(glassCard, "overflow-hidden")}>
      <div className="space-y-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-bold text-white">Standings</div>
          <button
            type="button"
            onClick={toggleRegulars}
            disabled={regularNames.length === 0}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40",
              allRegularsSelected
                ? "border-transparent bg-l4d2-purple text-white"
                : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
            )}
          >
            5+ matches
          </button>
        </div>
        <PlayerMultiCombobox
          options={rows}
          selected={selected}
          onToggle={toggle}
          onClear={() => setSelected(new Set())}
        />
      </div>

      {/* Mobile sort control (cards have no clickable headers) */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 md:hidden">
        <span className="text-xs text-white/40">Sort</span>
        <select
          value={sort.key}
          onChange={(e) =>
            setSort({
              key: e.target.value as SortKey,
              dir: e.target.value === "name" ? "asc" : "desc",
            })
          }
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white outline-none"
        >
          <option value="mmr">MMR</option>
          <option value="winPct">Win %</option>
          <option value="games">GP</option>
          <option value="wins">W</option>
          <option value="losses">L</option>
          <option value="rank">Rank</option>
          <option value="name">Name</option>
        </select>
        <button
          type="button"
          aria-label="Toggle sort direction"
          onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
          className="rounded-md border border-white/15 px-2 py-1 text-white/60 transition hover:text-white"
        >
          {sort.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        </button>
      </div>

      {/* Mobile: one card per player so every stat is visible without scrolling. */}
      <ul className="divide-y divide-white/5 md:hidden">
        {sorted.map((r) => (
          <li key={r.name} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="tabular-nums text-sm text-white/40">{r.rank}</span>
                <span className="truncate font-medium text-white">{r.name}</span>
                {r.isGuest && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                    guest
                  </span>
                )}
              </div>
              <span className="font-display text-lg font-bold tabular-nums text-white">
                {r.mmr}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 pl-[26px] text-xs tabular-nums text-white/50">
              <span>GP {r.games}</span>
              <span className="text-emerald-400">W {r.wins}</span>
              <span className="text-red-400">L {r.losses}</span>
              <span>{r.winPct}%</span>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-white/40">
            No players selected.
          </li>
        )}
      </ul>

      {/* Desktop: full table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs">
              <Th label="#" k="rank" align="left" />
              <Th label="Player" k="name" align="left" />
              <Th label="MMR" k="mmr" />
              <Th label="GP" k="games" />
              <Th label="W" k="wins" />
              <Th label="L" k="losses" />
              <Th label="Win %" k="winPct" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.name}
                className="border-b border-white/5 text-white/80 transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2 tabular-nums text-white/40">{r.rank}</td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-white">
                  {r.name}
                  {r.isGuest && (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                      guest
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-display font-bold tabular-nums text-white">
                  {r.mmr}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.games}</td>
                <td className="px-4 py-2 text-right tabular-nums text-emerald-400">{r.wins}</td>
                <td className="px-4 py-2 text-right tabular-nums text-red-400">{r.losses}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.winPct}%</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-white/40">
                  No players selected.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
