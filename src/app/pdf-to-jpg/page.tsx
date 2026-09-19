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
import { renderPdfPages } from "@/lib/pdf/ops";
import { downloadBytes, downloadZip, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-jpg")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parts, setParts] = useState<{name:string;data:Uint8Array}[]|null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true); setProgress(10);
    try {
      const pages = await renderPdfPages(await file.arrayBuffer(), { format: "jpeg", scale, quality: 0.92 });
      setProgress(100);
      setParts(pages.map((p)=>({ name: p.name, data: p.bytes })));
      toast.success(`Rendered ${pages.length} page(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Render failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2">
            <Label>Resolution</Label>
            <div className="flex gap-2">
              {[1.5,2,3].map((s)=>(
                <Button key={s} size="sm" variant={scale===s?"default":"outline"} onClick={()=>setScale(s)}>{s}×</Button>
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Rendering…":"Convert"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setParts(null); }} label={file?file.name:"Drop a PDF"} />
        {busy && <ProgressBar value={progress} label="Rendering pages…" />}
        {parts && (
          <ResultBar
            fileName={parts.length===1?parts[0].name:`pages-jpeg.zip`}
            size={parts.reduce((a,b)=>a+b.data.byteLength,0)}
            meta={`${parts.length} image(s)`}
            onDownload={()=>{
              if (parts.length===1) downloadBytes(parts[0].data, parts[0].name, "image/jpeg");
              else void downloadZip(parts, `pages-jpeg.zip`);
            }}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
