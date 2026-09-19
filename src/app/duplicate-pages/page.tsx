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
import { duplicatePages } from "@/lib/pdf/extra-ops";
import { getPageCount } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("duplicate-pages")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState("");
  const [times, setTimes] = useState(1);
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
    setCount(await getPageCount(await f.arrayBuffer()));
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const indices = pages.split(/[,\s]+/).filter(Boolean).map((s)=>Number(s)-1);
      if (!indices.length || indices.some((n)=>Number.isNaN(n)||n<0)) throw new Error("Enter page numbers like 1,3");
      setResult(await duplicatePages(await file.arrayBuffer(), indices, times));
      toast.success("Duplicated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Pages to duplicate</Label><Input value={pages} onChange={(e)=>setPages(e.target.value)} placeholder="e.g. 1,2" /><p className="text-[11px] text-zinc-500">{count?`${count} pages`:"Load a PDF"}</p></div>
          <div className="space-y-2"><Label>Copies</Label><Input type="number" min={1} max={20} value={times} onChange={(e)=>setTimes(Number(e.target.value)||1)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Duplicate"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="duplicated.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"duplicated.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
