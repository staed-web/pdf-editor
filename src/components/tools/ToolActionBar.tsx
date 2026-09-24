"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Primary sticky actions for ToolShell `actionBar`.
 * Buttons should use min-h-11 (~44px) for comfortable touch targets.
 */
export function ToolActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 sm:items-center",
        className
      )}
    >
      {children}
    </div>
  );
}
