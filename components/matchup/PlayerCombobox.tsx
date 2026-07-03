"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { name: string; mmr: number; games: number };

// Lightweight combobox: styled input + in-flow filtered list. No portal /
// scroll-lock / animation, so it stays instant even with 8 on a heavy page,
// while supporting type-to-filter and keyboard nav.
export default function PlayerCombobox({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: Option[];
  onChange: (name: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const commit = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[hi]) commit(filtered[hi].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center rounded-lg border bg-black/30 transition",
          open ? "border-l4d2-purple/60 ring-1 ring-l4d2-purple/30" : "border-white/10",
        )}
      >
        <input
          value={open ? query : value}
          placeholder={value || placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setHi(0);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear"
            onMouseDown={(e) => {
              e.preventDefault();
              commit("");
            }}
            className="px-2 text-white/40 transition hover:text-white"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="mr-2 text-white/30" />
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-l4d2-ink/95 py-1 shadow-xl shadow-black/50 backdrop-blur"
          // keep list open while clicking an item
          onMouseDown={(e) => {
            e.preventDefault();
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {filtered.map((o, idx) => (
            <li key={o.name}>
              <button
                type="button"
                onMouseEnter={() => setHi(idx)}
                onClick={() => commit(o.name)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition",
                  idx === hi ? "bg-l4d2-purple/25 text-white" : "text-white/80 hover:bg-white/5",
                )}
              >
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 tabular-nums text-xs text-white/40">
                  {o.games}g · {o.mmr}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
