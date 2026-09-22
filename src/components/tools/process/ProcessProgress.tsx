"use client";

import { X } from "lucide-react";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProcessProgress({
  value,
  label = "Processing…",
  onCancel,
  className,
}: {
  value: number;
  label?: string;
  onCancel?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <ProgressBar value={value} label={label} />
      {onCancel && (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
