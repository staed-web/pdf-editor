"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { underlayPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("underlay-pdf")!;

export default function Page() {
  const [base, setBase] = useState<File | null>(null);
  const [under, setUnder] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (fs: File[]) => {
    const pdfs = fs.filter(isPdfFile);
    if (!pdfs.length) return toast.error("PDF only");
    if (!base) { setBase(pdfs[0]); if (pdfs[1]) setUnder(pdfs[1]); }
    else if (!under) setUnder(pdfs[0]);
    else { setBase(pdfs[0]); setUnder(pdfs[1]||null); }
    setResult(null);
  };

  const run = async () => {
    if (!base || !under) return toast.error("Need base + underlay");
    setBusy(true);
    try {
      setResult(await underlayPdf(await base.arrayBuffer(), await under.arrayBuffer()));
      toast.success("Underlay applied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs">Base: {base?.name||"—"}</p>
          <p className="text-xs">Underlay: {under?.name||"—"}</p>
          <Button className="w-full" disabled={!base||!under||busy} onClick={run}>{busy?"Working…":"Underlay"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" multiple onFiles={onFiles} label="Drop base, then letterhead/underlay PDF" />
        {result && <ResultBar fileName="underlay.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"underlay.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
