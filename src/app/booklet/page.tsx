"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { bookletPdf } from "@/lib/pdf/extra-ops";

import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("booklet")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await bookletPdf(await file.arrayBuffer()));
      toast.success("Done");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          
          <p className="text-xs text-zinc-500">Pads to a multiple of 4 and reorders for saddle-stitch fold.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Run"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="booklet.pdf" size={result.byteLength}  onDownload={()=>downloadBytes(result,"booklet.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
