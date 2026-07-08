"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";

export type Combo = { names: string[]; pct: number; g: number; w: number };
export type SquadSize = { size: number; min: number; best: Combo[]; worst: Combo[] };

const LABEL: Record<number, string> = { 2: "Duos", 3: "Trios", 4: "Quads" };
const SINGULAR: Record<number, string> = { 2: "duo", 3: "trio", 4: "quad" };

function ComboRow({
  label,
  rank,
  pct,
  record,
  tone,
}: {
  label: string;
  rank: number;
  pct: number;
  record: string;
  tone: "good" | "bad";
}) {
  const accent = tone === "good" ? "text-emerald-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-4 shrink-0 text-xs tabular-nums text-white/30">{rank}</span>
      <span className="min-w-0 flex-1 truncate text-white/80">{label}</span>
      <span className={cn("shrink-0 font-semibold", accent)}>{pct}%</span>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/30">{record}</span>
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
            <ComboRow
              key={c.names.join("|")}
              label={c.names.join(" · ")}
              rank={i + 1}
              pct={c.pct}
              record={`${c.w}–${c.g - c.w}`}
              tone={tone}
            />
          ))}
        </div>
      ) : (
        <div className="py-1.5 text-sm text-white/30">Not enough games yet</div>
      )}
    </div>
  );
}

type Partner = { label: string; pct: number; g: number; w: number };
type PGroup = { pct: number; g: number; w: number; members: string[] };

// Collapse partners that share the exact record (same wins/games) into one row.
// `list` must already be sorted — same-record items are then contiguous, so the
// group order matches the sort order.
function groupByRecord(list: Partner[]): PGroup[] {
  const out: PGroup[] = [];
  const idx = new Map<string, PGroup>();
  for (const p of list) {
    const k = `${p.w}-${p.g}`;
    let grp = idx.get(k);
    if (!grp) {
      grp = { pct: p.pct, g: p.g, w: p.w, members: [] };
      idx.set(k, grp);
      out.push(grp);
    }
    grp.members.push(p.label);
  }
  return out;
}

// A player's partner column: single partners render as a row; ties on the same
// record collapse into an expandable "N partners" row to keep the card short.
function PartnerColumn({
  title,
  groups,
  tone,
}: {
  title: string;
  groups: PGroup[];
  tone: "good" | "bad";
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const accent = tone === "good" ? "text-emerald-400" : "text-red-400";
  const toggle = (k: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  return (
    <div>
      <div className={cn("mb-1 text-[10px] font-semibold uppercase tracking-widest", accent)}>
        {title}
      </div>
      {groups.length === 0 ? (
        <div className="py-1.5 text-sm text-white/30">None</div>
      ) : (
        <div className="divide-y divide-white/5">
          {groups.map((grp, i) => {
            const k = `${grp.w}-${grp.g}`;
            const record = `${grp.w}–${grp.g - grp.w}`;
            if (grp.members.length === 1) {
              return (
                <ComboRow
                  key={k}
                  label={grp.members[0]}
                  rank={i + 1}
                  pct={grp.pct}
                  record={record}
                  tone={tone}
                />
              );
            }
            const isOpen = open.has(k);
            return (
              <div key={k}>
                <button
                  type="button"
                  onClick={() => toggle(k)}
                  className="flex w-full items-center gap-2 py-1.5 text-left text-sm"
                >
                  <span className="w-4 shrink-0 text-xs tabular-nums text-white/30">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">
                    {grp.members.length} partners
                  </span>
                  <ChevronDown
                    size={13}
                    className={cn("shrink-0 text-white/30 transition", isOpen && "rotate-180")}
                  />
                  <span className={cn("shrink-0 font-semibold", accent)}>{grp.pct}%</span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/30">
                    {record}
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-1 pl-6">
                    {grp.members.map((m) => (
                      <div key={m} className="truncate py-0.5 text-xs text-white/60">
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SquadSynergy({
  squads,
  combos,
  players,
}: {
  squads: SquadSize[];
  combos: Record<number, Combo[]>;
  players: string[];
}) {
  const [size, setSize] = useState(squads[0]?.size ?? 2);
  const [view, setView] = useState<"overall" | string>("overall");
  const cur = squads.find((s) => s.size === size) ?? squads[0];

  // For a selected player: their win% in each combo of the chosen size that
  // includes them (duos/trios/quads), best first. Label is the teammates.
  const partners = useMemo(() => {
    if (view === "overall") return [];
    return (combos[size] ?? [])
      .filter((c) => c.names.includes(view))
      .map((c) => ({
        label: c.names.filter((n) => n !== view).join(" · "),
        pct: c.pct,
        g: c.g,
        w: c.w,
      }))
      .sort((a, b) => b.pct - a.pct || b.g - a.g);
  }, [view, size, combos]);

  // Best column: highest win% first. Worst column: lowest win% first, and on a
  // tie MORE games together = worse synergy (so 0–5 ranks above 0–1). Same-record
  // partners are grouped into one expandable row.
  const goodGroups = useMemo(
    () =>
      groupByRecord(
        partners.filter((p) => p.pct >= 50).sort((a, b) => b.pct - a.pct || b.g - a.g),
      ),
    [partners],
  );
  const badGroups = useMemo(
    () =>
      groupByRecord(
        partners.filter((p) => p.pct < 50).sort((a, b) => a.pct - b.pct || b.g - a.g),
      ),
    [partners],
  );

  return (
    <Card className={glassCard}>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Users size={17} className="text-l4d2-purple" /> Squad synergy
          </CardTitle>
          <p className="text-xs text-white/40">
            {view === "overall"
              ? `Best & worst combos by win rate${cur ? ` · min ${cur.min} games` : ""}.`
              : `${view}'s win rate with ${SINGULAR[size]} partners.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Overall vs a specific player */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-white outline-none transition focus:border-l4d2-purple/60"
          >
            <option value="overall">Overall</option>
            {players.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {/* Size toggle: duos / trios / quads — applies to both views. */}
          <div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5">
            {squads.map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setSize(s.size)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  s.size === size ? "bg-l4d2-purple text-white" : "text-white/50 hover:text-white",
                )}
              >
                {LABEL[s.size]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === "overall" ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Column title="Best" combos={cur?.best ?? []} tone="good" />
            <Column title="Worst" combos={cur?.worst ?? []} tone="bad" />
          </div>
        ) : partners.length === 0 ? (
          <div className="py-4 text-sm text-white/30">No games with a partner yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <PartnerColumn title="Best partners" groups={goodGroups} tone="good" />
            <PartnerColumn title="Worst partners" groups={badGroups} tone="bad" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
