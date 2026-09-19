"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { dpiResamplePdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("dpi-resample")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [dpi, setDpi] = useState<72|100|150|200|300>(150);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await dpiResamplePdf(await file.arrayBuffer(), dpi));
      toast.success(`Resampled at ${dpi} DPI`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Re-renders pages at a target DPI (stronger compress than text-only rewrite).</p>
          <div className="flex flex-wrap gap-2">
            {([72,100,150,200,300] as const).map((d)=>(
              <Button key={d} size="sm" variant={dpi===d?"default":"outline"} onClick={()=>setDpi(d)}>{d}</Button>
            ))}
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Resample"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="resampled.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"resampled.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
