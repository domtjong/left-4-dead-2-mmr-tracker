"use client";

import {
  Home,
  FilePlus2,
  Skull,
  Table,
  LineChart,
  Scale,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

// Order matches the Figma design (top -> bottom below the menu toggle).
const navItems: NavItem[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "New match", icon: FilePlus2, href: "/matches/new" },
  { label: "Balance teams", icon: Scale, href: "/balance" },
  { label: "Match history", icon: Table, href: "/matches" },
  { label: "MMR chart", icon: LineChart, href: "/chart" },
];

function NavButton({
  label,
  icon: Icon,
  href,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative flex items-center justify-center"
    >
      {/* Active indicator bar on the inner edge */}
      <span
        className={`absolute -left-[22px] h-8 w-1 rounded-full bg-l4d2-purple transition-all duration-200 ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        }`}
      />
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition duration-200 ${
          active
            ? "bg-l4d2-purple text-white shadow-lg shadow-l4d2-purple/40"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={26} strokeWidth={2.25} />
      </span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-black/85 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  // Exact match: /matches (history) and /matches/new are distinct nav items.
  const isActive = (href: string) => pathname === href;

  return (
    <aside className="relative hidden w-[88px] shrink-0 flex-col items-center gap-10 border-l border-white/10 bg-black/30 py-6 text-white backdrop-blur-xl md:flex">
      {/* Purple edge glow to tie into the theme */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-l4d2-purple/60 via-l4d2-purple/10 to-transparent" />

      {/* Brand mark */}
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-l4d2-purple/20 text-l4d2-purple ring-1 ring-l4d2-purple/30">
        <Skull size={24} strokeWidth={2.5} />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col items-center gap-4">
        {navItems.map((item) => (
          <NavButton key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* Footer: Gang (coming soon) + settings */}
      <div className="mt-auto flex flex-col items-center gap-4">
        {/* Dimmed to read as an upcoming feature; page itself says "coming soon". */}
        <Link
          href="/gangs"
          aria-label="Gang — coming soon"
          aria-current={isActive("/gangs") ? "page" : undefined}
          className="group relative flex items-center justify-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white/30 transition hover:bg-white/5 hover:text-white/60">
            <Skull size={24} strokeWidth={2.25} />
          </span>
          <span className="pointer-events-none absolute right-full mr-3 flex items-center gap-1.5 whitespace-nowrap rounded-md bg-black/85 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
            Gang
            <span className="rounded bg-l4d2-purple/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-l4d2-purple">
              soon
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Settings size={24} strokeWidth={2.25} />
        </button>
      </div>
    </aside>
  );
}
