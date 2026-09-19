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

const tool = getTool("pdf-to-text")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      const t = pages.map((p)=>`----- Page ${p.page} -----\n${p.text}`).join("\n\n");
      setText(t);
      setResult(new TextEncoder().encode(t));
      toast.success(t.trim() ? "Text extracted" : "Little text — try OCR");
    } catch (e) {
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Extracting…":"Extract text"}</Button>
          {text && (
            <Button className="w-full" variant="outline" onClick={()=>{ navigator.clipboard.writeText(text); toast.success("Copied"); }}>Copy all</Button>
          )}
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setText(""); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {text && <pre className="max-h-96 overflow-auto rounded-2xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900 whitespace-pre-wrap">{text}</pre>}
        {result && <ResultBar fileName="extracted.txt" size={result.byteLength} onDownload={()=>downloadBytes(result,"extracted.txt","text/plain")} />}
      </ToolShell>
    </MarketingShell>
  );
}
