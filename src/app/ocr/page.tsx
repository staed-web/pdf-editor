"use client";
import { useState } from "react";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { renderPdfPages } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("ocr")!;

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true); setProgress(5); setText(""); setResult(null);
    try {
      const pages = await renderPdfPages(await file.arrayBuffer(), { format: "png", scale: 2 });
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(10 + Math.round(m.progress * 80));
          }
        },
      });
      const chunks: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        setProgress(10 + Math.round((i / pages.length) * 80));
        const { data } = await worker.recognize(pages[i].blob);
        chunks.push(`--- Page ${i + 1} ---\n${data.text}`);
      }
      await worker.terminate();
      const full = chunks.join("\n\n");
      setText(full);
      setResult(new TextEncoder().encode(full));
      setProgress(100);
      toast.success("OCR complete");
    } catch (e) {
      console.error(e);
      toast.error("OCR failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Runs Tesseract.js entirely in your browser. Large scans take time.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Recognizing…":"Run OCR"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setText(""); setResult(null); }} label={file?file.name:"Drop a scanned PDF"} />
        {busy && <ProgressBar value={progress} label="OCR in progress…" />}
        {text && (
          <textarea className="min-h-48 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900" readOnly value={text} />
        )}
        {result && <ResultBar fileName="ocr.txt" size={result.byteLength} onDownload={()=>downloadBytes(result,"ocr.txt","text/plain")} />}
      </ToolShell>
    </MarketingShell>
  );
}
