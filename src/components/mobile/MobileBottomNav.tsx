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

/**
 * Full-bleed bottom dock for installed PWA.
 * Glass fills the home-indicator region; tab icons sit above the safe inset
 * (no empty gap under a floating pill).
 */
export function MobileBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="mobile-bottom-dock fixed inset-x-0 bottom-0 z-50"
      aria-label="Primary"
    >
      {/* Edge-to-edge surface including home indicator */}
      <div
        className="absolute inset-0 border-t border-[var(--hairline)]"
        style={{
          background: "var(--glass-strong)",
          backdropFilter: "saturate(180%) blur(24px)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
        }}
        aria-hidden
      />
      <div
        className="relative"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex h-[3.4rem] max-w-lg items-stretch justify-around px-1">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  onClick={() => haptic("light")}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-tight transition-colors",
                    active
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-[var(--muted)]"
                  )}
                >
                  <span className="relative flex h-8 w-14 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-amber-500/15 dark:bg-amber-400/18"
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 34,
                          mass: 0.7,
                        }}
                      />
                    )}
                    <motion.span
                      animate={
                        active ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 28,
                      }}
                      className="relative"
                    >
                      <Icon
                        className="h-[1.2rem] w-[1.2rem]"
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </motion.span>
                  </span>
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
