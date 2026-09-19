"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { heicToPdf, imagesToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes } from "@/lib/download";
import { PDFDocument } from "pdf-lib";

const tool = getTool("heic-to-pdf")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async () => {
    if (!files.length) return;
    setBusy(true);
    setNote("");
    try {
      const parts: Uint8Array[] = [];
      for (const f of files) {
        try {
          parts.push(await heicToPdf(f));
        } catch (e) {
          console.error(e);
          setNote("heic2any failed in this browser — try Safari or convert HEIC→JPG first.");
          throw e;
        }
      }
      if (parts.length === 1) setResult(parts[0]);
      else {
        const out = await PDFDocument.create();
        for (const p of parts) {
          const src = await PDFDocument.load(p);
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((pg)=>out.addPage(pg));
        }
        setResult(await out.save());
      }
      toast.success("PDF ready");
    } catch {
      toast.error(note || "HEIC conversion failed in this browser");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Uses heic2any in-browser. Support varies by browser; if it fails, convert to JPG first.</p>
          {note && <p className="text-xs text-amber-600">{note}</p>}
          <Button className="w-full" disabled={!files.length||busy} onClick={run}>{busy?"Converting…":"Make PDF"}</Button>
        </>
      }>
        <DropZone accept="image/heic,image/heif,.heic,.heif,image/*" multiple onFiles={(fs)=>{ setFiles(fs); setResult(null); }} label={files.length?`${files.length} file(s)`:"Drop HEIC photos"} />
        {result && <ResultBar fileName="heic.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"heic.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
