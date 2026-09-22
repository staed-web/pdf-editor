"use client";

import Link from "next/link";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { SoftLimitsNote } from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";

const tool = getTool("sign")!;

export default function SignPage() {
  return (
    <MarketingShell>
      <ToolShell tool={tool}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Draw, type, or upload a signature and place it precisely on any page —
            powered by the InstantPDFEdit editor (signature tool + burn-in export).
            Files stay in your browser; nothing is uploaded.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/edit">Open editor to sign</Link>
          </Button>
          <p className="mt-3 text-xs text-zinc-500">
            Tip: use the Signature tool in the left rail after opening a PDF.
          </p>
        </div>
        <SoftLimitsNote />
      </ToolShell>
    </MarketingShell>
  );
}
