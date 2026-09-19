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
import { overlayPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("overlay-pdf")!;

export default function Page() {
  const [base, setBase] = useState<File | null>(null);
  const [stamp, setStamp] = useState<File | null>(null);
  const [everyPage, setEveryPage] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (fs: File[]) => {
    const pdfs = fs.filter(isPdfFile);
    if (!pdfs.length) return toast.error("PDF only");
    if (!base) { setBase(pdfs[0]); if (pdfs[1]) setStamp(pdfs[1]); }
    else if (!stamp) setStamp(pdfs[0]);
    else { setBase(pdfs[0]); setStamp(pdfs[1]||null); }
    setResult(null);
  };

  const run = async () => {
    if (!base || !stamp) return toast.error("Need base + overlay PDFs");
    setBusy(true);
    try {
      setResult(await overlayPdf(await base.arrayBuffer(), await stamp.arrayBuffer(), { everyPage, opacity }));
      toast.success("Overlay applied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs">Base: {base?.name||"—"}</p>
          <p className="text-xs">Overlay: {stamp?.name||"—"}</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={everyPage} onChange={(e)=>setEveryPage(e.target.checked)} /> Every page</label>
          <div className="space-y-2"><Label>Opacity ({opacity})</Label><input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e)=>setOpacity(Number(e.target.value))} className="w-full" /></div>
          <Button className="w-full" disabled={!base||!stamp||busy} onClick={run}>{busy?"Working…":"Overlay"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" multiple onFiles={onFiles} label="Drop base PDF, then overlay PDF" />
        {result && <ResultBar fileName="overlay.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"overlay.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
