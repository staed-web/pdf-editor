"use client";

import { Info } from "lucide-react";
import { softLimitsCopy } from "@/lib/pdf/process-ux";
import { cn } from "@/lib/utils";

export function SoftLimitsNote({
  kind = "tool",
  className,
}: {
  kind?: "tool" | "batch";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--panel)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--muted)]",
        className
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
      <span>{softLimitsCopy(kind)}</span>
    </p>
  );
}
