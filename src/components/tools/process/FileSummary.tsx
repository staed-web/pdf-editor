"use client";

import { AlertTriangle, FileText, Lock } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import type { PdfFileSummary } from "@/lib/pdf/process-ux";

export function FileSummary({
  summary,
  extra,
  className,
}: {
  summary: PdfFileSummary | null;
  /** Extra line e.g. "3 files · 12.4 MB total" for multi-file tools */
  extra?: string;
  className?: string;
}) {
  if (!summary && !extra) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {summary && (
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {summary.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {formatBytes(summary.size)}
              {summary.pageCount != null ? ` · ${summary.pageCount} page${summary.pageCount === 1 ? "" : "s"}` : null}
              {summary.encrypted ? (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <Lock className="h-3 w-3" /> Protected
                </span>
              ) : null}
            </p>
          </div>
        </div>
      )}
      {extra && (
        <p className={cn("text-xs text-[var(--muted)]", summary && "mt-2")}>{extra}</p>
      )}
      {summary?.warnings?.length ? (
        <ul className="mt-3 space-y-1.5">
          {summary.warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Multi-file summary without per-file page inspect (fast). */
export function MultiFileSummary({
  count,
  totalBytes,
  warnings,
  className,
}: {
  count: number;
  totalBytes: number;
  warnings?: string[];
  className?: string;
}) {
  if (!count) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <p className="text-sm font-semibold text-foreground">
        {count} file{count === 1 ? "" : "s"} selected
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        {formatBytes(totalBytes)} total
      </p>
      {warnings?.length ? (
        <ul className="mt-3 space-y-1.5">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
