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

/** Floating frosted pill tab bar — PWA standalone only. */
export function MobileBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="pointer-events-auto mx-auto w-[min(100%-1.25rem,22rem)]">
        <ul
          className="flex h-[3.65rem] items-stretch justify-around rounded-[1.35rem] px-1.5 shadow-[var(--shadow-float)]"
          style={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  onClick={() => haptic("light")}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold tracking-tight transition-colors",
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
