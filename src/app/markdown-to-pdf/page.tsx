"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { markdownToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes } from "@/lib/download";

const tool = getTool("markdown-to-pdf")!;

export default function Page() {
  const [md, setMd] = useState("# Hello\n\nPaste **Markdown** here.");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setResult(await markdownToPdf(md));
      toast.success("PDF ready");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free local best-effort Markdown → PDF (headings &amp; lists simplified).</p>
          <Button className="w-full" disabled={!md.trim()||busy} onClick={run}>{busy?"Working…":"Make PDF"}</Button>
        </>
      }>
        <div className="space-y-2">
          <Label>Markdown</Label>
          <textarea className="min-h-[280px] w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950" value={md} onChange={(e)=>setMd(e.target.value)} />
        </div>
        {result && <ResultBar fileName="markdown.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"markdown.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
