"use client";

import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(v)}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
