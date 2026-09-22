"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Pencil,
  Search,
  Shield,
  FileText,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { homeSpotlightTools, TOOLS } from "@/lib/tools";
import { listRecentFiles } from "@/lib/storage/recent";
import type { RecentFileMeta } from "@/store/types";
import { haptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

const WELL_TINTS = [
  "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  "bg-orange-500/12 text-orange-700 dark:text-orange-300",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Installed-PWA app home — large title, bento tools, editor CTA. */
export function MobileHome() {
  const featured = useMemo(() => homeSpotlightTools().slice(0, 9), []);
  const [recent, setRecent] = useState<RecentFileMeta[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void listRecentFiles()
      .then((r) => setRecent(r.slice(0, 4)))
      .catch(() => {});
  }, []);

  const searchHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.short.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [q]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-2">
      <header className="mb-5 pt-1">
        <p className="text-[13px] font-medium text-[var(--muted)]">
          {greeting()}
        </p>
        <h1 className="app-large-title mt-0.5 text-foreground">
          InstantPDF
          <span className="text-amber-600 dark:text-amber-400">Edit</span>
        </h1>
      </header>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools…"
          className="h-12 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--card)] pl-10 pr-4 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-amber-500/50"
          aria-label="Search tools"
        />
      </div>

      {q.trim() ? (
        <section className="mb-6 space-y-1">
          {searchHits.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No tools match “{q}”
            </p>
          ) : (
            searchHits.map((t, i) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.slug}
                  href={t.href}
                  onClick={() => haptic("light")}
                  className="pressable flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] px-3 py-3 shadow-[var(--shadow-sm)]"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      WELL_TINTS[i % WELL_TINTS.length]
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
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                </Link>
              );
            })
          )}
        </section>
      ) : (
        <>
          {/* Editor CTA */}
          <Link
            href="/edit"
            onClick={() => haptic("medium")}
            className="pressable mb-6 flex items-center gap-4 overflow-hidden rounded-[1.35rem] bg-zinc-900 p-4 text-white shadow-[var(--shadow-lg)] dark:bg-[var(--card-elevated)] dark:ring-1 dark:ring-amber-500/20"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30">
              <Pencil className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-tight">
                Open PDF Editor
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Annotate · sign · organize · export
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-amber-400" />
          </Link>

          {/* Featured bento */}
          <div className="mb-2 flex items-center justify-between">
            <p className="app-section-label">Featured</p>
            <Link
              href="/tools"
              className="text-xs font-semibold text-amber-700 dark:text-amber-400"
            >
              See all
            </Link>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-2.5">
            {featured.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.28 }}
                >
                  <Link
                    href={t.href}
                    onClick={() => haptic("light")}
                    className={cn(
                      "pressable flex h-full flex-col gap-3 rounded-[1.2rem] border border-[var(--hairline)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-sm)]",
                      i === 0 && "col-span-1"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        WELL_TINTS[i % WELL_TINTS.length]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold tracking-tight text-foreground">
                        {t.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">
                        {t.short}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Recent */}
          {recent.length > 0 && (
            <section className="mb-6">
              <p className="app-section-label mb-2">Recent</p>
              <div className="overflow-hidden rounded-[1.2rem] border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
                {recent.map((r, idx) => (
                  <Link
                    key={r.id}
                    href="/edit"
                    onClick={() => haptic("light")}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-3 active:bg-black/[0.03] dark:active:bg-white/[0.04]",
                      idx > 0 && "border-t border-[var(--hairline)]"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {r.pageCount ? `${r.pageCount} pages · ` : ""}
                        Open in editor
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Privacy chip */}
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--hairline)] bg-[var(--card)]/60 px-3 py-3 text-[11px] font-medium text-[var(--muted)]">
            <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Private · processed on device
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
        </>
      )}
    </div>
  );
}
