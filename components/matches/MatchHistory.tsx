"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";
import { mapNameBannerSrc } from "@/lib/l4d2";
import { deleteMatch } from "@/app/(app)/matches/actions";

export type HistoryPlayer = { name: string; delta: number };
export type HistoryMatch = {
  id: string;
  date: string;
  map: string;
  winners: HistoryPlayer[];
  losers: HistoryPlayer[];
  winnerMmr: number; // team total MMR going in
  loserMmr: number;
  winnerAvg: number; // team average MMR going in
  loserAvg: number;
  winnerPct: number; // pre-game win probability of the winning team
  loserPct: number;
  winScore: number | null;
  loseScore: number | null;
  note: string | null;
};

const isHit = (name: string, q?: string) => !!q && name.toLowerCase().includes(q);

function Team({
  players,
  won,
  highlight,
}: {
  players: HistoryPlayer[];
  won: boolean;
  highlight?: string;
}) {
  return (
    <span className={cn("truncate", won ? "text-emerald-400" : "text-red-400")}>
      {players.map((p, i) => (
        <span key={p.name}>
          {i > 0 && ", "}
          <span className={isHit(p.name, highlight) ? "rounded bg-white/20 px-1 font-bold text-white" : undefined}>
            {p.name}
          </span>
        </span>
      ))}
    </span>
  );
}

function DeltaRows({ players, highlight }: { players: HistoryPlayer[]; highlight?: string }) {
  return (
    <div className="space-y-1">
      {players.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-sm">
          <span
            className={cn(
              "text-white/70",
              isHit(p.name, highlight) && "rounded bg-white/20 px-1 font-semibold text-white",
            )}
          >
            {p.name}
          </span>
          <span className={p.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
            {p.delta >= 0 ? "+" : ""}
            {p.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * One history row. Owns its own open/closing phase so the expanded panel is
 * only in the DOM while open — keeps the long scroll list cheap to lay out and
 * the animation smooth (only the open row's grid row animates).
 */
function MatchRow({
  m,
  onRequestDelete,
  highlight,
}: {
  m: HistoryMatch;
  onRequestDelete: (id: string) => void;
  highlight?: string;
}) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const mounted = phase !== "closed";
  const isOpen = phase === "open";

  return (
    <div>
      <button
        type="button"
        onClick={() => setPhase((p) => (p === "closed" ? "open" : "closing"))}
        className="grid w-full grid-cols-[92px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-xs tabular-nums text-white/40">{m.date}</span>
        <span className="flex items-center gap-2 truncate text-sm">
          <Team players={m.winners} won highlight={highlight} />
          <span className="text-white/25">vs</span>
          <Team players={m.losers} won={false} highlight={highlight} />
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-xs uppercase tracking-wide text-white/40 sm:inline">
            {m.map}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-white/40 transition", isOpen && "rotate-180")}
          />
        </span>
      </button>

      {mounted && (
        <div
          className={cn(
            "grid",
            phase === "closing" ? "animate-row-collapse" : "animate-row-expand",
          )}
          onAnimationEnd={(e) => {
            if (e.currentTarget === e.target && phase === "closing") setPhase("closed");
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="relative overflow-hidden bg-black/20">
              {/* Titled campaign banner as the panel background. */}
              <img
                src={mapNameBannerSrc(m.map)}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-l4d2-ink/92 via-l4d2-ink/85 to-l4d2-ink/70" />
              <div className="relative px-4 py-4">
              {/* Match summary: score + pre-game win chance of each side */}
              <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
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

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                      Winners
                    </span>
                    <span className="text-xs text-white/40">
                      total {m.winnerMmr} · avg {m.winnerAvg}
                    </span>
                  </div>
                  <DeltaRows players={m.winners} highlight={highlight} />
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-red-400">
                      Losers
                    </span>
                    <span className="text-xs text-white/40">
                      total {m.loserMmr} · avg {m.loserAvg}
                    </span>
                  </div>
                  <DeltaRows players={m.losers} highlight={highlight} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-white/30 sm:hidden">Map: {m.map}</span>
                <button
                  type="button"
                  onClick={() => onRequestDelete(m.id)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={13} /> Delete match
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchHistory({ matches }: { matches: HistoryMatch[] }) {
  const router = useRouter();
  const [player, setPlayer] = useState("");
  const [map, setMap] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmMatch = matches.find((m) => m.id === confirmId) ?? null;

  const onConfirmDelete = () => {
    if (!confirmId) return;
    setErr(null);
    startTransition(async () => {
      const res = await deleteMatch(confirmId, pin);
      if (res.ok) {
        setConfirmId(null);
        setPin("");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  };

  const allPlayers = useMemo(() => {
    const s = new Set<string>();
    for (const m of matches) for (const p of [...m.winners, ...m.losers]) s.add(p.name);
    return [...s].sort();
  }, [matches]);
  const allMaps = useMemo(
    () => [...new Set(matches.map((m) => m.map))].sort(),
    [matches],
  );

  const q = player.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        const inPlayer =
          !q || [...m.winners, ...m.losers].some((p) => p.name.toLowerCase().includes(q));
        const inMap = !map || m.map === map;
        return inPlayer && inMap;
      }),
    [matches, q, map],
  );

  const clear = () => {
    setPlayer("");
    setMap("");
  };
  const active = q || map;

  const inputCls =
    "rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-l4d2-purple/60";

  return (
    <>
    <Card className={cn(glassCard, "flex max-h-[72vh] flex-col overflow-hidden")}>
      {/* Filter bar (fixed) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            list="history-players"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Filter by player…"
            className={cn(inputCls, "w-52 pl-8")}
            autoComplete="off"
          />
          <datalist id="history-players">
            {allPlayers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <select value={map} onChange={(e) => setMap(e.target.value)} className={inputCls}>
          <option value="">All maps</option>
          {allMaps.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {active && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X size={13} /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-white/40">
          {filtered.length} of {matches.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="divide-y divide-white/5 overflow-y-auto">
        {filtered.map((m) => (
          <MatchRow
            key={m.id}
            m={m}
            onRequestDelete={(id) => {
              setErr(null);
              setPin("");
              setConfirmId(id);
            }}
            highlight={q}
          />
        ))}

        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-white/40">
            No matches for this filter.
          </div>
        )}
      </div>
    </Card>

    {/* Delete confirmation modal */}
    {confirmMatch && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => !pending && setConfirmId(null)}
        />
        <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-l4d2-ink p-5 shadow-2xl">
          <h3 className="font-display text-base font-bold text-white">Delete this match?</h3>
          <p className="mt-1.5 text-sm text-white/50">
            Are you sure you want to delete this match? This permanently removes it and recomputes
            everyone’s MMR. This can’t be undone.
          </p>
          <div className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-xs">
            <div className="text-white/40">
              {confirmMatch.date} · {confirmMatch.map}
            </div>
            <div className="mt-1 truncate">
              <span className="text-emerald-400">
                {confirmMatch.winners.map((p) => p.name).join(", ")}
              </span>
              <span className="text-white/25"> vs </span>
              <span className="text-red-400">
                {confirmMatch.losers.map((p) => p.name).join(", ")}
              </span>
            </div>
          </div>
          <label className="mt-3 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoComplete="off"
              className="w-full max-w-[10rem] rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-l4d2-purple/60"
            />
          </label>

          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmId(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !pin.trim()}
              onClick={onConfirmDelete}
              className="rounded-lg bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete match"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
