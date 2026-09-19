"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { flattenForms } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("flatten")!;

export default function FlattenPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await flattenForms(await file.arrayBuffer());
      setResult(bytes);
      toast.success("Flattened");
    } catch { toast.error("Flatten failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Flatten"}</Button>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF with forms"} />
        {result && <ResultBar fileName="flattened.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"flattened.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
