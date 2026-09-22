"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { SoftLimitsNote } from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { peekHandoffMeta } from "@/lib/storage/handoff";

const tool = getTool("sign")!;

export default function SignPage() {
  const router = useRouter();

  // If a prior tool already stored a handoff aimed at /edit, follow it.
  // Also accept handoffs mistargeted at /sign and forward to the editor.
  useEffect(() => {
    const meta = peekHandoffMeta();
    if (!meta) return;
    if (meta.toHref === "/edit" || meta.toHref === "/sign") {
      if (meta.toHref === "/sign") {
        // rewrite pointer target without re-reading bytes
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
            After Merge / Compress / OCR you can tap <strong>Sign</strong> on the
            success chips to carry the result here automatically.
          </p>
        </div>
        <SoftLimitsNote />
      </ToolShell>
    </MarketingShell>
  );
}
