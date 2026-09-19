"use client";

import { useState } from "react";
import { Download, CheckCircle2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, cn } from "@/lib/utils";
import { shareOrDownload } from "@/lib/share";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "sonner";

export function ResultBar({
  fileName,
  size,
  onDownload,
  blob,
  mime = "application/pdf",
  meta,
  className,
}: {
  fileName: string;
  size?: number;
  onDownload: () => void;
  /** When provided, enables Web Share API for the file */
  blob?: Blob | Uint8Array | ArrayBuffer | null;
  mime?: string;
  meta?: string;
  className?: string;
}) {
  const [sharing, setSharing] = useState(false);
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

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
      </div>
    </div>
  );
}
