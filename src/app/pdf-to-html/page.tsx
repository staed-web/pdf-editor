"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { pdfToHtml } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-html")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const html = await pdfToHtml(await file.arrayBuffer());
      setResult(new TextEncoder().encode(html));
      toast.success("HTML ready (positioned text approx)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free local approximation from pdf.js text positions — not pixel-perfect layout.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Export HTML"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="export.html" size={result.byteLength} onDownload={()=>downloadBytes(result,"export.html","text/html")} />}
      </ToolShell>
    </MarketingShell>
  );
}
