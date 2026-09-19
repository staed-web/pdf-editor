"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-word")!;

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{name:string;bytes:Uint8Array}|null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      const body = pages.map((p) => `<h2>Page ${p.page}</h2><p>${escapeHtml(p.text)}</p>`).join("\n");
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Export</title></head><body>${body}</body></html>`;
      const bytes = new TextEncoder().encode(html);
      setResult({ name: "export.doc", bytes });
      toast.success("Text exported (layout approximation)");
    } catch {
      toast.error("Extract failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Extracts text into a Word-compatible HTML (.doc). Scanned PDFs need OCR first.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Extracting…":"Export"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName={result.name} size={result.bytes.byteLength} onDownload={()=>downloadBytes(result.bytes, result.name, "application/msword")} />}
      </ToolShell>
    </MarketingShell>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
