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
import { cropPages } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("crop")!;

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [m, setM] = useState({ top: 36, right: 36, bottom: 36, left: 36 });
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await cropPages(await file.arrayBuffer(), m);
      setResult(bytes);
      toast.success("Cropped");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Margins in PDF points (72pt ≈ 1 inch).</p>
          {(["top","right","bottom","left"] as const).map((k)=>(
            <div key={k} className="space-y-1">
              <Label className="capitalize">{k}</Label>
              <Input type="number" value={m[k]} onChange={(e)=>setM({...m,[k]:Number(e.target.value)||0})} />
            </div>
          ))}
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Crop"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="cropped.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"cropped.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
