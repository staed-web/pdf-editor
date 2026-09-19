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
import { splitByBookmarksOrEveryN } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("split-by-bookmarks")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [everyN, setEveryN] = useState(10);
  const [result, setResult] = useState<{bytes:Uint8Array;name:string;note:string}|null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await splitByBookmarksOrEveryN(await file.arrayBuffer(), everyN);
      setResult(out);
      toast.success(out.note);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Uses outline/bookmarks when readable; otherwise splits every N pages.</p>
          <div className="space-y-2"><Label>Fallback every N pages</Label><Input type="number" min={1} value={everyN} onChange={(e)=>setEveryN(Number(e.target.value)||10)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Split"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName={result.name} size={result.bytes.byteLength} meta={result.note} onDownload={()=>downloadBytes(result.bytes, result.name, "application/zip")} />}
      </ToolShell>
    </MarketingShell>
  );
}
