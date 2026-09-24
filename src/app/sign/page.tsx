"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenTool, Layers, Download } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { SoftLimitsNote } from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { peekHandoffMeta } from "@/lib/storage/handoff";

const tool = getTool("sign")!;

export default function SignPage() {
  const router = useRouter();

  useEffect(() => {
    const meta = peekHandoffMeta();
    if (!meta) return;
    if (meta.toHref === "/edit" || meta.toHref === "/sign") {
      if (meta.toHref === "/sign") {
        try {
          sessionStorage.setItem(
            "ipe:handoff",
            JSON.stringify({ ...meta, toHref: "/edit", intent: "sign" })
          );
        } catch {
          /* */
        }
      }
      router.replace("/edit");
    }
  }, [router]);

  return (
    <MarketingShell>
      <ToolShell tool={tool}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
            Draw, type, or upload a signature and place it on any page — powered
            by the InstantPDFEdit editor. Files stay in your browser.
          </p>
          <Button asChild size="lg" className="mx-auto mt-6 flex min-h-12 w-full max-w-sm">
            <Link href="/edit">1. Open editor to sign</Link>
          </Button>

          <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              Contracts: sign → flatten → download
            </p>
            <ol className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  <PenTool className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Sign</strong> in the editor (enable “Flatten forms on
                  export” in Settings if the PDF has fillable fields).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Flatten</strong> signatures & forms so they can&apos;t be
                  edited — use{" "}
                  <Link href="/flatten" className="font-medium text-amber-700 underline dark:text-amber-400">
                    Flatten PDF
                  </Link>{" "}
                  (or the Flatten chip after export).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  <Download className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Download</strong> the locked PDF — ready to send.
                </span>
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/fill-form">Fill form first</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/flatten">Go to Flatten</Link>
              </Button>
            </div>
          </div>
        </div>
        <SoftLimitsNote />
      </ToolShell>
    </MarketingShell>
  );
}
