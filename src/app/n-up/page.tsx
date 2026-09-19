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
import { nUpPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("n-up")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [n, setN] = useState<2|4|6|9>(4);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await nUpPdf(await file.arrayBuffer(), n);
      setResult(bytes);
      toast.success(`${n}-up ready`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2">
            <Label>Pages per sheet</Label>
            <div className="flex flex-wrap gap-2">
              {([2,4,6,9] as const).map((v)=>(
                <Button key={v} size="sm" variant={n===v?"default":"outline"} onClick={()=>setN(v)}>{v}-up</Button>
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Create N-up"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="n-up.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"n-up.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
