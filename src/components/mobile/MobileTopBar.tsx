"use client";

import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { InstallButton } from "@/components/pwa/InstallButton";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export function MobileTopBar() {
  return (
    <header
      className="mobile-top-bar sticky top-0 z-40 border-b border-[var(--border)]/70 bg-[var(--background)]/75 backdrop-blur-2xl md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Logo size="sm" showWordmark className="min-w-0" />
        <div className="ml-auto flex items-center gap-1.5">
          <InstallButton size="sm" variant="ghost" label="Install" className="hidden xs:inline-flex" />
          <ThemeToggle className="scale-90 origin-right" />
          <Link
            href="/edit"
            className="inline-flex h-9 items-center rounded-xl bg-amber-500 px-3 text-xs font-semibold text-zinc-950 shadow-sm active:scale-[0.97]"
          >
            Editor
          </Link>
        </div>
      </div>
    </header>
  );
}
