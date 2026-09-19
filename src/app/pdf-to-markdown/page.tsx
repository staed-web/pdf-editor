"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { pdfToMarkdown } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-markdown")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const md = await pdfToMarkdown(await file.arrayBuffer());
      setPreview(md);
      setResult(new TextEncoder().encode(md));
      toast.success("Markdown ready");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <><Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Export MD"}</Button></>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); setPreview(""); }} label={file?file.name:"Drop a PDF"} />
        {preview && <pre className="max-h-64 overflow-auto rounded-xl border p-3 text-xs whitespace-pre-wrap">{preview.slice(0,4000)}</pre>}
        {result && <ResultBar fileName="export.md" size={result.byteLength} onDownload={()=>downloadBytes(result,"export.md","text/markdown")} />}
      </ToolShell>
    </MarketingShell>
  );
}
