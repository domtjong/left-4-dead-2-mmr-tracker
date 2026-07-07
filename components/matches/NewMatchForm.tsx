"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, glassCard } from "@/lib/utils";
import { logMatch, type LogMatchResult } from "@/app/(app)/matches/new/actions";

const SLOTS = [0, 1, 2, 3] as const;

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-l4d2-purple/60 focus:ring-1 focus:ring-l4d2-purple/40";

// Module-level so its identity is stable across renders. Defined inside the
// component, every keystroke re-created it → React remounted the inputs → the
// field lost focus after one character.
function TeamColumn({
  title,
  side,
  names,
  accent,
  players,
  chosen,
  onName,
}: {
  title: string;
  side: "w" | "l";
  names: string[];
  accent: string;
  players: string[];
  chosen: Set<string>;
  onName: (side: "w" | "l", i: number, v: string) => void;
}) {
  return (
    <div className="flex-1 space-y-3">
      <div className={cn("text-xs font-semibold uppercase tracking-widest", accent)}>{title}</div>
      {SLOTS.map((i) => {
        // Everyone taken except this slot's own current pick.
        const taken = new Set(chosen);
        taken.delete(names[i].trim().toLowerCase());
        const options = players.filter((p) => !taken.has(p.toLowerCase()));
        const listId = `player-list-${side}-${i}`;
        return (
          <div key={i}>
            <input
              list={listId}
              value={names[i]}
              onChange={(e) => onName(side, i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              className={inputCls}
              autoComplete="off"
            />
            <datalist id={listId}>
              {options.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        );
      })}
    </div>
  );
}

export default function NewMatchForm({
  players,
  maps,
}: {
  players: string[];
  maps: readonly string[];
}) {
  const router = useRouter();
  const [winners, setWinners] = useState(["", "", "", ""]);
  const [losers, setLosers] = useState(["", "", "", ""]);
  const [map, setMap] = useState("");
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [winScore, setWinScore] = useState("");
  const [loseScore, setLoseScore] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LogMatchResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const setName = (side: "w" | "l", i: number, v: string) => {
    const set = side === "w" ? setWinners : setLosers;
    set((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  };

  const filled = [...winners, ...losers].map((n) => n.trim().toLowerCase()).filter(Boolean);
  const dupes = filled.length !== new Set(filled).size;
  const ready = filled.length === 8 && !dupes && !!map && !!pin.trim();

  async function submit() {
    setPending(true);
    setResult(null);
    const res = await logMatch({
      pin,
      winners,
      losers,
      map,
      playedAt: new Date(playedAt).toISOString(),
      winScore: winScore.trim() ? Number(winScore) : null,
      loseScore: loseScore.trim() ? Number(loseScore) : null,
      note: note.trim() || null,
    });
    setResult(res);
    setPending(false);
    if (res.ok) {
      setWinners(["", "", "", ""]);
      setLosers(["", "", "", ""]);
      setMap("");
      setWinScore("");
      setLoseScore("");
      setNote("");
      setPin("");
      setConfirming(false);
      router.refresh();
    }
  }

  // Names already chosen anywhere in the match, so each slot can drop them from
  // its own suggestion list (like the matchup preview on the home page). Kept as
  // a datalist — not a strict combobox — so a brand-new name still adds a guest.
  const chosen = new Set(
    [...winners, ...losers].map((n) => n.trim().toLowerCase()).filter(Boolean),
  );

  // Score sanity check: in Versus the winner scores higher, so a winner score
  // below the loser score is a strong sign the teams were entered swapped.
  const winN = winScore.trim() ? Number(winScore) : null;
  const loseN = loseScore.trim() ? Number(loseScore) : null;
  const scoreSwapped =
    winN !== null &&
    loseN !== null &&
    !Number.isNaN(winN) &&
    !Number.isNaN(loseN) &&
    winN < loseN;

  return (
    <Card className={cn(glassCard, "mx-auto max-w-2xl")}>
      <CardHeader>
        <CardTitle className="font-display text-xl font-bold text-white">Log a match</CardTitle>
        <p className="text-xs text-white/40">
          4v4 Versus. Type a name to pick an existing player, or a new name to add a guest.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <TeamColumn
            title="Winners"
            side="w"
            names={winners}
            accent="text-emerald-400"
            players={players}
            chosen={chosen}
            onName={setName}
          />
          <div className="hidden w-px self-stretch bg-white/10 sm:block" />
          <TeamColumn
            title="Losers"
            side="l"
            names={losers}
            accent="text-red-400"
            players={players}
            chosen={chosen}
            onName={setName}
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex-1 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Map</span>
            <select value={map} onChange={(e) => setMap(e.target.value)} className={inputCls}>
              <option value="">Select map…</option>
              {maps.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Date</span>
            <input
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className={cn(inputCls, "[color-scheme:dark]")}
            />
          </label>
        </div>

        {/* Scores (optional, display only — not used in MMR) */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex-1 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Winner score
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={winScore}
              onChange={(e) => setWinScore(e.target.value)}
              placeholder="optional"
              className={inputCls}
            />
          </label>
          <label className="flex-1 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400">
              Loser score
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={loseScore}
              onChange={(e) => setLoseScore(e.target.value)}
              placeholder="optional"
              className={inputCls}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Note <span className="text-white/30">(optional)</span>
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. someone left last round"
            className={inputCls}
            maxLength={200}
          />
        </label>

        {dupes && (
          <p className="text-sm text-amber-400">A player can’t appear twice in one match.</p>
        )}

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">PIN</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className={cn(inputCls, "max-w-[10rem]")}
            autoComplete="off"
          />
        </label>

        {/* Score sanity warning — catches teams entered in the wrong column. */}
        {scoreSwapped && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Winner score ({winN}) is below the loser score ({loseN}). Double-check the
            winning team is in the <span className="font-semibold text-emerald-400">Winners</span>{" "}
            column before logging.
          </p>
        )}

        {!confirming ? (
          <Button
            onClick={() => {
              setResult(null);
              if (!scoreSwapped) setConfirming(true);
            }}
            disabled={!ready || pending}
            className="w-full bg-l4d2-purple text-white hover:bg-l4d2-violet"
          >
            Review &amp; log match
          </Button>
        ) : (
          // Confirm step: make who-gains / who-loses explicit before it hits MMR.
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-widest text-white/50">
              Confirm the result — this updates MMR
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                  Winners · gain MMR
                </div>
                <div className="mt-1 text-sm text-white/80">
                  {winners.map((n) => n.trim()).filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="flex-1 rounded-md border border-red-500/25 bg-red-500/5 p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-red-400">
                  Losers · lose MMR
                </div>
                <div className="mt-1 text-sm text-white/80">
                  {losers.map((n) => n.trim()).filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:text-white disabled:opacity-50"
              >
                Back
              </button>
              <Button
                onClick={submit}
                disabled={pending}
                className="flex-1 bg-l4d2-purple text-white hover:bg-l4d2-violet"
              >
                {pending ? "Saving…" : "Confirm & log match"}
              </Button>
            </div>
          </div>
        )}

        {result && !result.ok && (
          <p className="text-sm text-red-400">{result.error}</p>
        )}
        {result && result.ok && (
          <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Match logged
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
              {result.deltas.map((d) => (
                <div key={d.name} className="flex justify-between">
                  <span className="text-white/70">{d.name}</span>
                  <span className={d.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {d.after} ({d.delta >= 0 ? "+" : ""}
                    {d.delta})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
