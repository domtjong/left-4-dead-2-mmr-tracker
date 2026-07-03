import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";

export type Mover = { name: string; delta: number };

export default function TopMovers({ movers, window }: { movers: Mover[]; window: number }) {
  const max = Math.max(1, ...movers.map((m) => Math.abs(m.delta)));

  return (
    <Card className={cn(glassCard, "lg:col-span-2")}>
      <CardHeader className="flex flex-row items-end justify-between space-y-0">
        <div>
          <CardTitle className="font-display text-lg font-bold text-white">Top movers</CardTitle>
          <p className="text-xs text-white/40">Net MMR · last {window} matches</p>
        </div>
      </CardHeader>
      <CardContent>
        {movers.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">No recent matches.</p>
        ) : (
          <ul className="space-y-2.5">
            {movers.map((m) => {
              const up = m.delta >= 0;
              const w = `${(Math.abs(m.delta) / max) * 100}%`;
              return (
                <li key={m.name} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-sm text-white/80">{m.name}</span>
                  {/* Diverging bar: grows right for gains, left for losses. */}
                  <div className="flex flex-1 items-center">
                    <div className="flex w-1/2 justify-end">
                      {!up && (
                        <div
                          className="h-5 rounded-l bg-red-400/70"
                          style={{ width: w }}
                        />
                      )}
                    </div>
                    <div className="flex w-1/2 justify-start">
                      {up && (
                        <div
                          className="h-5 rounded-r bg-emerald-400/70"
                          style={{ width: w }}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "w-12 shrink-0 text-right font-display text-sm font-bold tabular-nums",
                      up ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {up ? "+" : ""}
                    {m.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
