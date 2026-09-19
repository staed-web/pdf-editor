"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { repairPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("repair")!;

export default function RepairPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await repairPdf(await file.arrayBuffer());
      setResult(bytes);
      toast.success("Re-saved PDF structure");
    } catch {
      toast.error("Could not repair this file");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Repairing…":"Repair / re-save"}</Button>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a damaged or quirky PDF"} />
        {result && <ResultBar fileName="repaired.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"repaired.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
