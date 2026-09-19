"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { compressPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { formatBytes } from "@/lib/utils";

const tool = getTool("compress")!;

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<"low"|"medium"|"high">("medium");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{bytes:Uint8Array;originalSize:number;newSize:number}|null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true); setProgress(15); setResult(null);
    try {
      // Yield so UI updates
      await new Promise((r)=>setTimeout(r,50));
      setProgress(40);
      const out = await compressPdf(await file.arrayBuffer(), quality);
      setProgress(100);
      setResult(out);
      const saved = out.originalSize - out.newSize;
      toast.success(saved > 0 ? `Saved ${formatBytes(saved)}` : "Rebuilt (size similar — text-heavy PDFs compress less)");
    } catch (e) {
      console.error(e);
      toast.error("Compress failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Re-renders pages as JPEG. Great for scanned/image PDFs; text-only files may not shrink much.
          </p>
          <div className="space-y-2">
            <Label>Quality</Label>
            <div className="flex flex-wrap gap-2">
              {(["low","medium","high"] as const).map((q)=>(
                <Button key={q} size="sm" variant={quality===q?"default":"outline"} onClick={()=>setQuality(q)} className="capitalize">{q}</Button>
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Compressing…":"Compress"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF to compress"} />
        {busy && <ProgressBar value={progress} label="Compressing pages…" />}
        {result && (
          <ResultBar
            fileName="compressed.pdf"
            size={result.newSize}
            meta={`was ${formatBytes(result.originalSize)}`}
            onDownload={()=>downloadBytes(result.bytes,"compressed.pdf")}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
