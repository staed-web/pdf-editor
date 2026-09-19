"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { imagesToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, fileToImageBytes } from "@/lib/download";

const tool = getTool("webp-to-pdf")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const images = [];
      for (const f of files) images.push(await fileToImageBytes(f));
      setResult(await imagesToPdf(images.map(i=>({bytes:i.bytes, type: i.type==="jpg"?"jpg": i.type==="png"?"png":"webp"}))));
      toast.success("PDF ready");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <><Button className="w-full" disabled={!files.length||busy} onClick={run}>{busy?"Working…":"Make PDF"}</Button></>
      }>
        <DropZone accept="image/webp,.webp" multiple onFiles={(fs)=>{ setFiles(fs); setResult(null); }} label={files.length?`${files.length} WebP(s)`:"Drop WebP images"} />
        {result && <ResultBar fileName="webp.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"webp.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
