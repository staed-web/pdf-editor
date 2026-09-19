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
import { businessCardSheet } from "@/lib/pdf/extra-ops";
import { downloadBytes, fileToImageBytes, isImageFile } from "@/lib/download";

const tool = getTool("business-card")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await fileToImageBytes(file);
      setResult(await businessCardSheet(img.bytes, img.type === "webp" ? "png" : img.type === "jpg" ? "jpg" : "png", { cols: 2, rows: 5 }));
      toast.success("Sheet ready");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed — try PNG/JPG");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Tiles your card image 2×5 on A4 for print &amp; cut.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Make sheet"}</Button>
        </>
      }>
        <DropZone accept="image/*,.jpg,.jpeg,.png,.webp" onFiles={(fs)=>{ const f=fs.find(isImageFile); if(!f) return toast.error("Image only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a card image"} />
        {result && <ResultBar fileName="business-cards.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"business-cards.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
