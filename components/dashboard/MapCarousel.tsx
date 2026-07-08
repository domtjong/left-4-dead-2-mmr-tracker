"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, glassCard, glassCardHover } from "@/lib/utils";
import { mapBannerSrc } from "@/lib/l4d2";

export type MapSlide = {
  map: string;
  best: { name: string; pct: number; games: number } | null;
  worst: { name: string; pct: number; games: number } | null;
};

export default function MapCarousel({ slides }: { slides: MapSlide[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1); // 1 = advanced forward, -1 = went back

  if (slides.length === 0) {
    return (
      <Card className={cn(glassCard, "flex items-center justify-center")}>
        <CardContent className="py-6 text-center text-xs text-white/40">
          Not enough map data yet.
        </CardContent>
      </Card>
    );
  }

  const n = slides.length;
  const go = (d: number) => {
    setDir(d);
    setI((prev) => (prev + d + n) % n); // infinite wrap
  };
  const s = slides[i];
  const anim = dir === 1 ? "animate-slide-right" : "animate-slide-left";

  return (
    <Card className={cn(glassCard, glassCardHover, "relative overflow-hidden")}>
      {/* Current map's banner, fading in behind the card on each slide. */}
      <div key={`bg-${i}`} className="animate-fade-in pointer-events-none absolute inset-0">
        <img
          src={mapBannerSrc(s.map)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-l4d2-ink/92 via-l4d2-ink/88 to-l4d2-ink/70" />
      </div>
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
        <span className="text-xs font-medium uppercase tracking-widest text-white/50">
          Map spotlight
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-l4d2-purple/15 text-l4d2-purple">
          <MapIcon size={18} strokeWidth={2.25} />
        </span>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous map"
            onClick={() => go(-1)}
            className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <div key={i} className={cn(anim, "min-w-0 flex-1 text-center")}>
            <div className="font-display text-base font-bold leading-tight tracking-tight text-balance text-white sm:text-lg">
              {s.map}
            </div>
          </div>
          <button
            type="button"
            aria-label="Next map"
            onClick={() => go(1)}
            className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div key={`stats-${i}`} className={cn(anim, "mt-2 space-y-1 text-xs")}>
          {s.best && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/50">Best</span>
              <span className="text-right font-medium text-emerald-400">
                {s.best.name} {s.best.pct}%{" "}
                <span className="text-white/30">({s.best.games}g)</span>
              </span>
            </div>
          )}
          {s.worst && s.worst.name !== s.best?.name && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/50">Worst</span>
              <span className="text-right font-medium text-red-400">
                {s.worst.name} {s.worst.pct}%{" "}
                <span className="text-white/30">({s.worst.games}g)</span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
          {i + 1} / {n} maps
        </div>
      </CardContent>
    </Card>
  );
}
