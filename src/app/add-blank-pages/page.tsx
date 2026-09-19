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
import { addBlankPages } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("add-blank-pages")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(1);
  const [position, setPosition] = useState<"start"|"end"|"after">("end");
  const [afterPage, setAfterPage] = useState(1);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await addBlankPages(await file.arrayBuffer(), { count, position, afterPage }));
      toast.success("Blank pages added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Count</Label><Input type="number" min={1} max={50} value={count} onChange={(e)=>setCount(Number(e.target.value)||1)} /></div>
          <div className="flex flex-wrap gap-2">
            {(["start","end","after"] as const).map((p)=>(
              <Button key={p} size="sm" variant={position===p?"default":"outline"} onClick={()=>setPosition(p)} className="capitalize">{p}</Button>
            ))}
          </div>
          {position==="after" && (
            <div className="space-y-2"><Label>After page #</Label><Input type="number" min={1} value={afterPage} onChange={(e)=>setAfterPage(Number(e.target.value)||1)} /></div>
          )}
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Insert blanks"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="with-blanks.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"with-blanks.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
