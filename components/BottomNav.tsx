"use client";

import { Home, Table, FilePlus2, LineChart, Scale, Skull, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { label: string; icon: LucideIcon; href: string; center?: boolean; soon?: boolean };

// Instagram-style: add-a-game centered + raised, Gang on the far right.
// Gang is dimmed — an upcoming feature (its page reads "coming soon").
const items: Item[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "History", icon: Table, href: "/matches" },
  { label: "New match", icon: FilePlus2, href: "/matches/new", center: true },
  { label: "Balance", icon: Scale, href: "/balance" },
  { label: "Chart", icon: LineChart, href: "/chart" },
  { label: "Gang", icon: Skull, href: "/gangs", soon: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/70 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {items.map(({ label, icon: Icon, href, center, soon }) => {
          const active = isActive(href);

          if (center) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="relative -mt-5 flex flex-col items-center"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-l4d2-purple/40 ring-4 ring-l4d2-ink transition",
                    active
                      ? "bg-l4d2-violet text-white"
                      : "bg-l4d2-purple text-white hover:bg-l4d2-violet",
                  )}
                >
                  <Icon size={26} strokeWidth={2.5} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition",
                soon
                  ? "text-white/30 hover:text-white/50"
                  : active
                    ? "text-l4d2-purple"
                    : "text-white/50 hover:text-white",
              )}
            >
              <Icon size={22} strokeWidth={2.25} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
