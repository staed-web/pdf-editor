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
import { addBatesNumbers } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("bates-number")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [prefix, setPrefix] = useState("CASE-");
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(6);
  const [position, setPosition] = useState<"top-left"|"top-right"|"bottom-left"|"bottom-right">("bottom-right");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await addBatesNumbers(await file.arrayBuffer(), { prefix, start, digits, position, fontSize: 10 }));
      toast.success("Bates numbers stamped");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Prefix</Label><Input value={prefix} onChange={(e)=>setPrefix(e.target.value)} /></div>
          <div className="space-y-2"><Label>Start</Label><Input type="number" value={start} onChange={(e)=>setStart(Number(e.target.value)||1)} /></div>
          <div className="space-y-2"><Label>Digits</Label><Input type="number" min={1} max={12} value={digits} onChange={(e)=>setDigits(Number(e.target.value)||6)} /></div>
          <div className="space-y-2">
            <Label>Position</Label>
            <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={position} onChange={(e)=>setPosition(e.target.value as typeof position)}>
              {["top-left","top-right","bottom-left","bottom-right"].map((p)=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Stamp Bates"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="bates.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"bates.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
