"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wrench, Pencil, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/tools",
    label: "Tools",
    icon: Wrench,
    match: (p: string) =>
      p === "/tools" ||
      (p !== "/" &&
        p !== "/edit" &&
        p !== "/pricing" &&
        p !== "/more" &&
        !p.startsWith("/edit")),
  },
  {
    href: "/edit",
    label: "Editor",
    icon: Pencil,
    match: (p: string) => p.startsWith("/edit"),
  },
  {
    href: "/more",
    label: "More",
    icon: MoreHorizontal,
    match: (p: string) => p === "/more" || p === "/pricing",
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)]/80 bg-[var(--card)]/90 backdrop-blur-2xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex flex-1">
              <Link
                href={tab.href}
                onClick={() => haptic("light")}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-[var(--muted)]"
                )}
              >
                <span className="relative flex h-8 w-12 items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-amber-500/15 dark:bg-amber-400/15"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-[1.15rem] w-[1.15rem]",
                      active && "scale-105"
                    )}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
