"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { name: string; mmr: number; games: number };

// Searchable multi-select: type to filter, click to toggle, picks show as
// removable chips. Same in-flow (no-portal) approach as PlayerCombobox so it
// stays instant and themes cleanly on the dark glass.
export default function PlayerMultiCombobox({
  options,
  selected,
  onToggle,
  onClear,
  placeholder = "Search players…",
}: {
  options: Option[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const chosen = options.filter((o) => selected.has(o.name));

  const pick = (name: string) => {
    onToggle(name);
    setQuery("");
    setHi(0);
    inputRef.current?.focus();
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
      if (open && filtered[hi]) pick(filtered[hi].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && chosen.length) {
      onToggle(chosen[chosen.length - 1].name);
    }
  };

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border bg-black/30 px-2 py-1.5 transition",
          open
            ? "border-l4d2-purple/60 ring-1 ring-l4d2-purple/30"
            : "border-white/10",
        )}
      >
        {chosen.map((o) => (
          <span
            key={o.name}
            className="flex items-center gap-1 rounded-md bg-l4d2-purple/25 py-0.5 pl-2 pr-1 text-xs text-white"
          >
            {o.name}
            <button
              type="button"
              aria-label={`Remove ${o.name}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onToggle(o.name);
              }}
              className="text-white/60 transition hover:text-white"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={query}
          placeholder={chosen.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => {
            setOpen(true);
            setHi(0);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className="min-w-[90px] flex-1 bg-transparent px-1 py-0.5 text-sm text-white placeholder:text-white/40 outline-none"
          autoComplete="off"
        />

        {chosen.length > 0 && onClear ? (
          <button
            type="button"
            aria-label="Clear all"
            onMouseDown={(e) => {
              e.preventDefault();
              onClear();
            }}
            className="px-1 text-white/40 transition hover:text-white"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="mr-1 text-white/30" />
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
          {filtered.map((o, idx) => {
            const on = selected.has(o.name);
            return (
              <li key={o.name}>
                <button
                  type="button"
                  onMouseEnter={() => setHi(idx)}
                  onClick={() => pick(o.name)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition",
                    idx === hi
                      ? "bg-l4d2-purple/25 text-white"
                      : "text-white/80 hover:bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on
                        ? "border-l4d2-purple bg-l4d2-purple text-white"
                        : "border-white/25",
                    )}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-white/40">
                    {o.games}g · {o.mmr}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
