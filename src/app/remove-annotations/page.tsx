"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { removeAnnotations } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("remove-annotations")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await removeAnnotations(await file.arrayBuffer()));
      toast.success("Annotations stripped (best-effort)");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Removes Annots dictionary entries and form fields when possible.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Remove"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="clean.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"clean.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
