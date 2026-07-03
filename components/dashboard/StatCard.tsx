import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, glassCard, glassCardHover } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  hint?: string;
};

export default function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  icon: Icon,
  hint,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-white/60";
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className={cn(glassCard, glassCardHover)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <span className="text-xs font-medium uppercase tracking-widest text-white/50">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-l4d2-purple/15 text-l4d2-purple">
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-bold tracking-tight text-white">
          {value}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {delta && (
            <span
              className={cn("flex items-center gap-0.5 font-semibold", trendColor)}
            >
              {trend !== "flat" && <TrendIcon size={14} strokeWidth={2.5} />}
              {delta}
            </span>
          )}
          {hint && <span className="text-white/40">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
