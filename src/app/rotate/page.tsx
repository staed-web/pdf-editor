"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getTool } from "@/lib/tools";
import { rotatePages, getPageCount } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("rotate")!;

export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
    setPages(await getPageCount(await f.arrayBuffer()));
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      let indices: number[] | undefined;
      if (selected.trim()) {
        indices = selected.split(/[,\s]+/).filter(Boolean).map((s) => Number(s) - 1);
        if (indices.some((n) => Number.isNaN(n) || n < 0)) throw new Error("Invalid page numbers");
      }
      const bytes = await rotatePages(await file.arrayBuffer(), rotation, indices);
      setResult(bytes);
      toast.success("Rotated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2">
            <Label>Rotation</Label>
            <div className="flex flex-wrap gap-2">
              {([90,180,270] as const).map((d) => (
                <Button key={d} size="sm" variant={rotation===d?"default":"outline"} onClick={() => setRotation(d)}>{d}°</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pages (optional)</Label>
            <Input value={selected} onChange={(e)=>setSelected(e.target.value)} placeholder="All pages, or e.g. 1,3,5" />
            <p className="text-[11px] text-zinc-500">{pages?`${pages} pages`:"Load a PDF"}</p>
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Rotate"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="rotated.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"rotated.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
