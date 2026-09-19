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
import { scanEnhance } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("scan-enhance")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"contrast"|"threshold"|"deskew-approx">("contrast");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await scanEnhance(await file.arrayBuffer(), mode));
      toast.success("Enhanced");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Canvas contrast/threshold for OCR prep — free local approximation.</p>
          <div className="flex flex-wrap gap-2">
            {(["contrast","threshold","deskew-approx"] as const).map((m)=>(
              <Button key={m} size="sm" variant={mode===m?"default":"outline"} onClick={()=>setMode(m)}>{m}</Button>
            ))}
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Enhance"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a scanned PDF"} />
        {result && <ResultBar fileName="enhanced.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"enhanced.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
