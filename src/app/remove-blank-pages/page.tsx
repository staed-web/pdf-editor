"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { removeBlankPages } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("remove-blank-pages")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.985);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await removeBlankPages(await file.arrayBuffer(), threshold);
      setResult(out.bytes);
      setMeta(`Removed ${out.removed}, kept ${out.kept}`);
      toast.success(`Removed ${out.removed} blank page(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Renders each page and drops near-white sheets. Adjust sensitivity if needed.</p>
          <div className="space-y-2">
            <Label>Blank sensitivity ({threshold})</Label>
            <input type="range" min={0.9} max={0.999} step={0.001} value={threshold} onChange={(e)=>setThreshold(Number(e.target.value))} className="w-full" />
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Scanning…":"Remove blanks"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="no-blanks.pdf" size={result.byteLength} meta={meta} onDownload={()=>downloadBytes(result,"no-blanks.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
