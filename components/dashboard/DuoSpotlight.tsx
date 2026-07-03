import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";

export type Duo = { a: string; b: string; pct: number; g: number; w: number };

function Row({ label, duo, tone }: { label: string; duo: Duo | null; tone: "good" | "bad" }) {
  const accent = tone === "good" ? "text-emerald-400" : "text-red-400";
  return (
    <div>
      <div className={cn("text-[10px] font-semibold uppercase tracking-widest", accent)}>
        {label}
      </div>
      {duo ? (
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">
            {duo.a} <span className="text-white/30">+</span> {duo.b}
          </span>
          <span className="shrink-0 text-xs text-white/50">
            <span className={accent}>{duo.pct}%</span>{" "}
            <span className="text-white/30">
              {duo.w}–{duo.g - duo.w}
            </span>
          </span>
        </div>
      ) : (
        <div className="mt-0.5 text-sm text-white/30">—</div>
      )}
    </div>
  );
}

export default function DuoSpotlight({
  best,
  worst,
  minGames,
}: {
  best: Duo | null;
  worst: Duo | null;
  minGames: number;
}) {
  return (
    <Card className={cn(glassCard, "flex flex-col justify-between p-4")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Duos</span>
        <Users size={16} className="text-l4d2-purple" />
      </div>
      <div className="space-y-2.5">
        <Row label="Best duo" duo={best} tone="good" />
        <div className="h-px bg-white/10" />
        <Row label="Worst duo" duo={worst} tone="bad" />
      </div>
      <div className="mt-2 text-[10px] text-white/30">min {minGames} games together</div>
    </Card>
  );
}
