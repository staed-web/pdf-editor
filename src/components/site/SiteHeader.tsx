"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Pencil } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  TOOLS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type ToolCategory,
} from "@/lib/tools";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo size="sm" />
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <div
            className="relative"
            onMouseEnter={() => setMega(true)}
            onMouseLeave={() => setMega(false)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-expanded={mega}
            >
              Tools <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {mega && (
              <div className="absolute left-0 top-full z-50 w-[min(90vw,720px)] pt-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {CATEGORY_ORDER.slice(0, 6).map((cat) => (
                      <MegaCol key={cat} cat={cat} />
                    ))}
                  </div>
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <Link
                      href="/tools"
                      className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      View all tools →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Pricing
          </Link>
          <Link
            href="/tools"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            All tools
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/edit">
              <Pencil className="h-3.5 w-3.5" />
              Open editor
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-1">
            <Link href="/tools" className="rounded-lg px-3 py-2 text-sm font-medium" onClick={() => setOpen(false)}>
              All tools
            </Link>
            <Link href="/edit" className="rounded-lg px-3 py-2 text-sm font-medium" onClick={() => setOpen(false)}>
              Editor
            </Link>
            <Link href="/pricing" className="rounded-lg px-3 py-2 text-sm font-medium" onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <div className="mt-2 px-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MegaCol({ cat }: { cat: ToolCategory }) {
  const items = TOOLS.filter((t) => t.category === cat).slice(0, 5);
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {CATEGORY_LABELS[cat]}
      </p>
      <ul className="space-y-1">
        {items.map((t) => (
          <li key={t.slug}>
            <Link
              href={t.href}
              className={cn(
                "block rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-amber-50 hover:text-amber-800 dark:text-zinc-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
              )}
            >
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
