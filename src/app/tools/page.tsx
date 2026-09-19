"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolCard } from "@/components/tools/ToolCard";
import { Input } from "@/components/ui/input";
import {
  TOOLS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type ToolCategory,
} from "@/lib/tools";

export default function ToolsIndexPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all">("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!query) return true;
      return (
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.short.toLowerCase().includes(query)
      );
    });
  }, [q, cat]);

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          All PDF tools
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {TOOLS.length} tools · private · processed in your browser
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools…"
              className="h-11 rounded-xl border-zinc-200 bg-white pl-10 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
              All
            </FilterChip>
            {CATEGORY_ORDER.map((c) => (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
                {CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
        {!filtered.length && (
          <p className="mt-12 text-center text-sm text-zinc-500">
            No tools match “{q}”.
          </p>
        )}
      </div>
    </MarketingShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950"
          : "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }
    >
      {children}
    </button>
  );
}
