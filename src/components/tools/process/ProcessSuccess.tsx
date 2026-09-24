"use client";

import { useState } from "react";
import { Download, CheckCircle2, Share2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, cn } from "@/lib/utils";
import { shareOrDownload } from "@/lib/share";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "sonner";
import { NextSteps, type NextStepAction } from "./NextSteps";

export function ProcessSuccess({
  fileName,
  size,
  onDownload,
  onProcessAnother,
  blob,
  mime = "application/pdf",
  meta,
  beforeAfter,
  fromTool,
  nextSteps,
  className,
}: {
  fileName: string;
  size?: number;
  onDownload: () => void;
  onProcessAnother?: () => void;
  blob?: Blob | Uint8Array | ArrayBuffer | null;
  mime?: string;
  meta?: string;
  /** Optional before/after sizes (compress) */
  beforeAfter?: { before: number; after: number };
  /** Tool slug that produced this result — enables NextSteps chips */
  fromTool?: string;
  /** Override default next-step chips */
  nextSteps?: NextStepAction[];
  className?: string;
}) {
  const [sharing, setSharing] = useState(false);
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const saved =
    beforeAfter && beforeAfter.before > 0
      ? beforeAfter.before - beforeAfter.after
      : null;
  const pct =
    beforeAfter && beforeAfter.before > 0
      ? Math.round(((beforeAfter.before - beforeAfter.after) / beforeAfter.before) * 100)
      : null;
  const ratioPct =
    beforeAfter && beforeAfter.before > 0
      ? Math.min(100, Math.round((beforeAfter.after / beforeAfter.before) * 100))
      : null;

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30",
        className
      )}
    >
      {beforeAfter && (
        <div className="space-y-2 rounded-xl border border-emerald-200/80 bg-white/70 p-3 text-sm dark:border-emerald-900/40 dark:bg-zinc-950/40">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Before → after
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatBytes(beforeAfter.before)}
                <span className="mx-1.5 text-zinc-400">→</span>
                {formatBytes(beforeAfter.after)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                {saved != null && saved > 0 ? "Saved" : saved != null && saved < 0 ? "Grew" : "Change"}
              </p>
              <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {saved != null && saved !== 0
                  ? `${saved > 0 ? "−" : "+"}${formatBytes(Math.abs(saved))}${
                      pct != null ? ` (${Math.abs(pct)}%)` : ""
                    }`
                  : "Similar size"}
              </p>
            </div>
          </div>
          {ratioPct != null && (
            <div className="space-y-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                  style={{ width: `${Math.max(4, ratioPct)}%` }}
                  title={`Result is ${ratioPct}% of original size`}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Result is {ratioPct}% of the original size
                {saved != null && saved <= 0
                  ? " · text-heavy PDFs often shrink less"
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Ready to download
            </p>
            <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
              Suggested name: <span className="font-medium text-foreground">{fileName}</span>
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {size != null ? formatBytes(size) : null}
              {size != null && meta ? " · " : null}
              {meta}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {blob && canShare && (
            <Button
              variant="outline"
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                haptic("success");
                try {
                  const result = await shareOrDownload(blob, fileName, mime);
                  if (result === "shared") toast.success("Shared");
                } catch (e) {
                  if (!(e instanceof Error && e.name === "AbortError")) {
                    toast.error("Share failed");
                  }
                } finally {
                  setSharing(false);
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
          <Button
            onClick={() => {
              haptic("medium");
              onDownload();
            }}
            className="min-h-11 flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          {onProcessAnother && (
            <Button
              variant="outline"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => {
                haptic("light");
                onProcessAnother();
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Process another
            </Button>
          )}
        </div>
      </div>

      {blob && fromTool && (
        <NextSteps
          fromTool={fromTool}
          fileName={fileName}
          blob={blob}
          mime={mime}
          actions={nextSteps}
        />
      )}
    </div>
  );
}
