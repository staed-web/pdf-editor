"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, cn } from "@/lib/utils";

export function ResultBar({
  fileName,
  size,
  onDownload,
  meta,
  className,
}: {
  fileName: string;
  size?: number;
  onDownload: () => void;
  meta?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center dark:border-emerald-900/50 dark:bg-emerald-950/30",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Ready: {fileName}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {size != null ? formatBytes(size) : null}
            {size != null && meta ? " · " : null}
            {meta}
          </p>
        </div>
      </div>
      <Button onClick={onDownload} className="shrink-0">
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
