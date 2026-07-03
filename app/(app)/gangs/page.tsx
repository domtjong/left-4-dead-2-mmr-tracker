import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, glassCard } from "@/lib/utils";
import { Skull } from "lucide-react";

export default function GangsPage() {
  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-l4d2-purple">
          Gang
        </p>
        <h1 className="font-sans text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
          Create or join a gang
        </h1>
      </header>

      <Card className={cn(glassCard, "mx-auto max-w-xl")}>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-l4d2-purple/20 text-l4d2-purple">
            <Skull size={22} />
          </div>
          <CardTitle className="font-display text-lg font-bold text-white">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/60">
          <p>
            Gangs (groups) will let separate crews keep their own rosters, matches, and MMR
            leaderboards. Right now everything lives in a single shared gang.
          </p>
          <p className="text-white/40">
            Needs auth + a gang data model first — tracked as post-MVP work.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
