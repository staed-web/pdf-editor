"use client";

import { relatedTools } from "@/lib/tools";
import { ToolCard } from "./ToolCard";

export function RelatedTools({ slug }: { slug: string }) {
  const tools = relatedTools(slug, 4);
  if (!tools.length) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Try related tools
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </section>
  );
}
