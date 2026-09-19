"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolCard } from "@/components/tools/ToolCard";
import { Input } from "@/components/ui/input";
import { useStandalone } from "@/hooks/useStandalone";
import { haptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";
import {
  TOOLS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type ToolCategory,
} from "@/lib/tools";

const WELL = [
  "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  "bg-orange-500/12 text-orange-700 dark:text-orange-300",
];

export default function ToolsIndexPage() {
  const standalone = useStandalone();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all">("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!query) return true;
      return (
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.short.toLowerCase().includes(query)
      );
    });
  }, [q, cat]);

  return (
    <MarketingShell>
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          standalone ? "max-w-lg py-3" : "max-w-6xl py-10 sm:py-12"
        )}
      >
        {!standalone && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              All PDF tools
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {TOOLS.length} tools · private · processed in your browser
            </p>
          </>
        )}

        {standalone && (
          <p className="mb-3 text-sm text-[var(--muted)]">
            {TOOLS.length} tools · private · on-device
          </p>
        )}

        <div
          className={cn(
            "mt-4 flex flex-col gap-3",
            !standalone && "sm:mt-6 sm:flex-row sm:items-center"
          )}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools…"
              className={cn(
                "h-11 rounded-2xl border-[var(--hairline)] bg-[var(--card)] pl-10 shadow-[var(--shadow-sm)]",
                standalone && "h-12"
              )}
            />
          </div>
          <div
            className={cn(
              "flex gap-1.5",
              standalone
                ? "-mx-4 overflow-x-auto px-4 no-scrollbar"
                : "flex-wrap"
            )}
          >
            <FilterChip
              active={cat === "all"}
              onClick={() => {
                haptic("light");
                setCat("all");
              }}
            >
              All
            </FilterChip>
            {CATEGORY_ORDER.map((c) => (
              <FilterChip
                key={c}
                active={cat === c}
                onClick={() => {
                  haptic("light");
                  setCat(c);
                }}
              >
                {CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>
        </div>

        {standalone ? (
          <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
            {filtered.map((t, i) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.slug}
                  href={t.href}
                  onClick={() => haptic("light")}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 active:bg-black/[0.03] dark:active:bg-white/[0.04]",
                    i > 0 && "border-t border-[var(--hairline)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      WELL[i % WELL.length]
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {t.short}
                    </p>
                  </div>
                  {t.status === "partial" && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Best effort
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        )}

        {!filtered.length && (
          <p className="mt-12 text-center text-sm text-[var(--muted)]">
            No tools match “{q}”.
          </p>
        )}
      </div>
    </MarketingShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors touch-target",
        active
          ? "bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20"
          : "border border-[var(--hairline)] bg-[var(--card)] text-[var(--muted)]"
      )}
    >
      {children}
    </button>
  );
}
