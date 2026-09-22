"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";

const TITLES: Record<string, string> = {
  "/tools": "Tools",
  "/more": "More",
  "/pricing": "Pricing",
};

/**
 * Edge-to-edge frosted top bar for installed PWA.
 * Background paints under the status bar; content sits below the safe inset
 * (no empty spacer strip).
 */
export function MobileTopBar() {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";
  const isEditor = pathname.startsWith("/edit");
  const title = TITLES[pathname];

  if (isEditor) return null;

  return (
    <header className="mobile-top-bar fixed inset-x-0 top-0 z-40">
      {/* Full-bleed glass that fills status-bar + bar height */}
      <div
        className="absolute inset-0 border-b border-[var(--hairline)]"
        style={{
          background: "var(--glass-strong)",
          backdropFilter: "saturate(180%) blur(24px)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
        }}
        aria-hidden
      />
      <div
        className="relative"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-12 items-center gap-2 px-3.5">
          {isHome || !title ? (
            <Logo size="sm" showWordmark className="min-w-0" />
          ) : (
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle className="origin-right scale-[0.92]" />
            {!isHome && (
              <Link
                href="/edit"
                className="ml-0.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-500 px-3.5 text-xs font-semibold text-zinc-950 shadow-sm shadow-amber-500/25 active:scale-[0.97]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editor
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
