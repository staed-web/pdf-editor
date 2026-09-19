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
import { splitByMaxBytes } from "@/lib/pdf/extra-ops";
import { downloadZip, isPdfFile } from "@/lib/download";

const tool = getTool("split-by-size")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [mb, setMb] = useState(5);
  const [parts, setParts] = useState<{name:string;bytes:Uint8Array}[]|null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await splitByMaxBytes(await file.arrayBuffer(), mb * 1024 * 1024);
      setParts(out);
      toast.success(`${out.length} part(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Max size (MB)</Label><Input type="number" min={0.5} step={0.5} value={mb} onChange={(e)=>setMb(Number(e.target.value)||5)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Splitting…":"Split"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setParts(null); }} label={file?file.name:"Drop a PDF"} />
        {parts && (
          <ResultBar
            fileName="split-by-size.zip"
            size={parts.reduce((a,p)=>a+p.bytes.byteLength,0)}
            meta={`${parts.length} parts`}
            onDownload={()=>downloadZip(parts.map(p=>({name:p.name,data:p.bytes})),"split-by-size.zip")}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
