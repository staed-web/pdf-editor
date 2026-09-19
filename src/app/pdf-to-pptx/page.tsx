"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { pdfToPptx } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-pptx")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await pdfToPptx(await file.arrayBuffer()));
      toast.success("PPTX ready (image slides)");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Creative free path: each page → JPEG slide in a real PPTX (OOXML). Not editable text slides.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Building…":"Make PPTX"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {busy && <ProgressBar value={60} label="Rendering slides…" />}
        {result && <ResultBar fileName="slides.pptx" size={result.byteLength} onDownload={()=>downloadBytes(result,"slides.pptx","application/vnd.openxmlformats-officedocument.presentationml.presentation")} />}
      </ToolShell>
    </MarketingShell>
  );
}
