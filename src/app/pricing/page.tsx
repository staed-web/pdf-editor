"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Free forever for client tools
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          InstantPDFEdit’s browser-side suite doesn’t need a subscription. Your
          files stay on your device — we don’t meter uploads because there aren’t any.
        </p>
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Personal
          </p>
          <p className="mt-2 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
            $0
          </p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            {[
              "All organize, convert, and edit tools",
              "Full PDF editor with annotations & signatures",
              "Unlimited local processing",
              "Light & dark themes",
              "No account required",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {x}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link href="/tools">Start using tools</Link>
          </Button>
        </div>
      </div>
    </MarketingShell>
  );
}
