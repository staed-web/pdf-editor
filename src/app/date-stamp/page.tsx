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
import { addDateStamp } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("date-stamp")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [position, setPosition] = useState<"top-left"|"top-right"|"bottom-left"|"bottom-right">("bottom-right");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await addDateStamp(await file.arrayBuffer(), { date, position }));
      toast.success("Date stamped");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Date text</Label><Input value={date} onChange={(e)=>setDate(e.target.value)} /></div>
          <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={position} onChange={(e)=>setPosition(e.target.value as typeof position)}>
            {["top-left","top-right","bottom-left","bottom-right"].map((p)=><option key={p} value={p}>{p}</option>)}
          </select>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Stamp date"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="dated.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"dated.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
