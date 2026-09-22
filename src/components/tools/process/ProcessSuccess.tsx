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

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30",
        className
      )}
    >
      {beforeAfter && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-200/80 bg-white/70 p-3 text-sm dark:border-emerald-900/40 dark:bg-zinc-950/40 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Before</p>
            <p className="font-semibold">{formatBytes(beforeAfter.before)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">After</p>
            <p className="font-semibold">{formatBytes(beforeAfter.after)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Saved</p>
            <p className="font-semibold">
              {saved != null && saved > 0 ? formatBytes(saved) : "—"}
              {pct != null && saved != null && saved > 0 ? ` (${pct}%)` : ""}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ratio</p>
            <p className="font-semibold">
              {beforeAfter.before
                ? `${Math.round((beforeAfter.after / beforeAfter.before) * 100)}%`
                : "—"}
            </p>
          </div>
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
