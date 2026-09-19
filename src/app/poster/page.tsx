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
import { posterTile } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("poster")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await posterTile(await file.arrayBuffer(), cols, rows));
      toast.success("Poster tiles ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Tiles page 1 across a grid of sheets for large-format printing.</p>
          <div className="space-y-2"><Label>Columns</Label><Input type="number" min={1} max={6} value={cols} onChange={(e)=>setCols(Number(e.target.value)||2)} /></div>
          <div className="space-y-2"><Label>Rows</Label><Input type="number" min={1} max={6} value={rows} onChange={(e)=>setRows(Number(e.target.value)||2)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Tiling…":"Make poster"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="poster.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"poster.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
