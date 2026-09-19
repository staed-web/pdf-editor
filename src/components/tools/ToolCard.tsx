"use client";

import Link from "next/link";
import type { ToolDef } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolCard({
  tool,
  className,
}: {
  tool: ToolDef;
  className?: string;
}) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:hover:border-amber-500/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
          <Icon className="h-5 w-5" />
        </span>
        {tool.status === "partial" && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Best effort
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400">
          {tool.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}
