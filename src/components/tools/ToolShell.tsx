"use client";

import { useState, type ReactNode } from "react";
import { Shield, SlidersHorizontal, X } from "lucide-react";
import type { ToolDef } from "@/lib/tools";
import { RelatedTools } from "./RelatedTools";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";

export function ToolShell({
  tool,
  children,
  options,
  actionBar,
  className,
}: {
  tool: ToolDef;
  children: ReactNode;
  options?: ReactNode;
  /** Sticky mobile action bar (above bottom nav) */
  actionBar?: ReactNode;
  className?: string;
}) {
  const Icon = tool.icon;
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-3 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-10 md:px-6",
        className
      )}
    >
      <div className="mb-5 sm:mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium text-foreground/70 shadow-sm">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Private · in-browser · no upload
        </div>
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {tool.name}
              </h1>
              {options && (
                <button
                  type="button"
                  className="touch-target inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium lg:hidden"
                  onClick={() => {
                    haptic("light");
                    setSheetOpen(true);
                  }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Options
                </button>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              {tool.description}
            </p>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-6", options && "lg:grid-cols-[1fr_280px]")}>
        <div className="min-w-0 space-y-4">{children}</div>
        {options && (
          <aside className="hidden h-fit space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm lg:block">
            <h2 className="text-sm font-semibold text-foreground">Options</h2>
            {options}
          </aside>
        )}
      </div>

      <RelatedTools slug={tool.slug} />

      {/* Sticky action bar above bottom nav (mobile) */}
      {actionBar && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-[var(--border)]/80 bg-[var(--card)]/95 px-3 py-2.5 backdrop-blur-xl md:static md:mt-4 md:rounded-2xl md:border md:px-4 md:py-3">
          {actionBar}
        </div>
      )}

      {/* Bottom sheet options (mobile) */}
      {sheetOpen && options && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="max-h-[78dvh] w-full animate-in overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl safe-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Options</h2>
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 pb-2">{options}</div>
          </div>
        </div>
      )}
    </div>
  );
}
