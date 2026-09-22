"use client";

import { useState, type ReactNode } from "react";
import { Shield, SlidersHorizontal, X } from "lucide-react";
import type { ToolDef } from "@/lib/tools";
import { AdBanner } from "@/components/ads/AdBanner";
import { RelatedTools } from "./RelatedTools";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";
import { useStandalone } from "@/hooks/useStandalone";

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
  /** Sticky action bar (above tab bar in PWA) */
  actionBar?: ReactNode;
  className?: string;
}) {
  const Icon = tool.icon;
  const [sheetOpen, setSheetOpen] = useState(false);
  const standalone = useStandalone();

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-3 pt-5 sm:px-6 sm:pt-10 md:px-6",
        standalone ? "pb-28" : "pb-10 sm:pb-10",
        className
      )}
    >
      <div className="mb-5 sm:mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium text-foreground/70 shadow-[var(--shadow-sm)]">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Private · in-browser · no upload
        </div>
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 shadow-[var(--shadow-sm)] ring-1 ring-amber-500/20 dark:text-amber-300 sm:h-12 sm:w-12">
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
                  className="touch-target inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--hairline)] bg-[var(--card)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] lg:hidden"
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
          <aside className="hidden h-fit space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-5 shadow-[var(--shadow)] lg:block">
            <h2 className="text-sm font-semibold text-foreground">Options</h2>
            {options}
          </aside>
        )}
      </div>

      {!standalone && (
        <div className="mt-8 mb-2">
          <AdBanner variant="infeed" className="w-full max-w-none" />
        </div>
      )}

      <RelatedTools slug={tool.slug} />

      {actionBar && (
        <div
          className={cn(
            "z-40 border-t border-[var(--hairline)] px-3 py-2.5 backdrop-blur-xl",
            standalone
              ? "fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] bg-[var(--glass)]"
              : "sticky bottom-0 mt-4 rounded-2xl border bg-[var(--card)]/95 md:static md:mt-4 md:rounded-2xl md:border md:px-4 md:py-3"
          )}
          style={
            standalone
              ? {
                  background: "var(--glass)",
                  backdropFilter: "saturate(180%) blur(16px)",
                  WebkitBackdropFilter: "saturate(180%) blur(16px)",
                }
              : undefined
          }
        >
          {actionBar}
        </div>
      )}

      {sheetOpen && options && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="animate-sheet max-h-[78dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--hairline)] bg-[var(--card)] p-5 shadow-2xl safe-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
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
