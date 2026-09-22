"use client";

import type { ReactNode } from "react";
import { MarketingShell } from "@/components/site/MarketingShell";

export function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 border-b border-[var(--hairline)] pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {subtitle}
            </p>
          )}
        </header>
        <div className="legal-prose space-y-6 text-sm leading-relaxed text-foreground/85 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-amber-700 [&_a]:underline-offset-2 hover:[&_a]:underline dark:[&_a]:text-amber-400 [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
        </div>
      </article>
    </MarketingShell>
  );
}
