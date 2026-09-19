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
import { addBackground } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile, fileToImageBytes, isImageFile } from "@/lib/download";

const tool = getTool("background")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [color, setColor] = useState("#fff8e7");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      let imageBytes: Uint8Array | undefined;
      let imageType: "png"|"jpg"|undefined;
      if (imgFile) {
        const img = await fileToImageBytes(imgFile);
        if (img.type === "webp") {
          // convert via canvas path inside imagesToPdf — force png via ops
          toast.message("Using image background");
        }
        imageBytes = img.bytes;
        imageType = img.type === "jpg" ? "jpg" : "png";
      }
      setResult(await addBackground(await file.arrayBuffer(), { color, imageBytes, imageType }));
      toast.success("Background applied");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Color</Label><Input type="color" value={color} onChange={(e)=>setColor(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Or background image</Label>
            <input type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(f&&isImageFile(f)) setImgFile(f); }} />
          </div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Apply"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="background.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"background.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
