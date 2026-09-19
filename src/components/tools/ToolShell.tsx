"use client";

import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import type { ToolDef } from "@/lib/tools";
import { RelatedTools } from "./RelatedTools";
import { cn } from "@/lib/utils";

export function ToolShell({
  tool,
  children,
  options,
  className,
}: {
  tool: ToolDef;
  children: ReactNode;
  options?: ReactNode;
  className?: string;
}) {
  const Icon = tool.icon;
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-10 sm:px-6", className)}>
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Private · in-browser · no upload
        </div>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              {tool.name}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {tool.description}
            </p>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-6", options && "lg:grid-cols-[1fr_280px]")}>
        <div className="min-w-0 space-y-4">{children}</div>
        {options && (
          <aside className="h-fit space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Options
            </h2>
            {options}
          </aside>
        )}
      </div>

      <RelatedTools slug={tool.slug} />
    </div>
  );
}
