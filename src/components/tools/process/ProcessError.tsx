"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, FileUp, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessErrorInfo } from "@/lib/pdf/process-ux";

const KIND_LINKS: Partial<
  Record<ProcessErrorInfo["kind"], { href: string; label: string }>
> = {
  password: { href: "/unlock", label: "Open Unlock PDF" },
  corrupt: { href: "/repair", label: "Try Repair PDF" },
  oversized: { href: "/compress", label: "Compress first" },
  oom: { href: "/split", label: "Split into smaller parts" },
};

export function ProcessError({
  error,
  onDismiss,
  onRetry,
  onChooseFile,
  showOcrLink,
  className,
}: {
  error: ProcessErrorInfo | null;
  onDismiss?: () => void;
  /** Re-run the last action with the same file */
  onRetry?: () => void;
  /** Clear selection so the user can pick another file */
  onChooseFile?: () => void;
  /** Offer OCR for scanned / empty-text failures */
  showOcrLink?: boolean;
  className?: string;
}) {
  if (!error) return null;
  const link = KIND_LINKS[error.kind];
  const ocrHelpful =
    showOcrLink ||
    error.kind === "empty" ||
    /scan|image-only|no text|ocr/i.test(
      `${error.title} ${error.message} ${error.hint ?? ""}`
    );

  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50/90 p-4 dark:border-red-900/50 dark:bg-red-950/30",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {error.title}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {error.message}
          </p>
          {error.hint && (
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              {error.hint}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <Button
                size="sm"
                className="min-h-11"
                onClick={onRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            )}
            {onChooseFile && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={onChooseFile}
              >
                <FileUp className="h-3.5 w-3.5" />
                Choose a different file
              </Button>
            )}
            {ocrHelpful && (
              <Button asChild size="sm" variant="outline" className="min-h-11">
                <Link href="/ocr">
                  <ScanText className="h-3.5 w-3.5" />
                  Open OCR
                </Link>
              </Button>
            )}
            {link && (
              <Button asChild size="sm" variant="outline" className="min-h-11">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" className="min-h-11" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
