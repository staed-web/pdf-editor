"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { FileQueue } from "@/components/tools/FileQueue";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { useToolFiles } from "@/hooks/useToolFiles";
import { imagesToPdf } from "@/lib/pdf/ops";
import { downloadBytes, fileToImageBytes, isImageFile } from "@/lib/download";

const tool = getTool("images-to-pdf")!;

export default function Page() {
  const { files, addFiles, remove, reorder, clear } = useToolFiles();
  const [pageSize, setPageSize] = useState<"auto"|"a4"|"letter">("auto");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!files.length) return toast.error("Add images");
    setBusy(true);
    try {
      const imgs = [];
      for (const f of files) imgs.push(await fileToImageBytes(f.file));
      const bytes = await imagesToPdf(imgs, { pageSize });
      setResult(bytes);
      toast.success("PDF created");
    } catch (e) {
      console.error(e);
      toast.error("Conversion failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2">
            <Label>Page size</Label>
            <div className="flex flex-wrap gap-2">
              {(["auto","a4","letter"] as const).map((s)=>(
                <Button key={s} size="sm" variant={pageSize===s?"default":"outline"} onClick={()=>setPageSize(s)} className="capitalize">{s}</Button>
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={!files.length||busy} onClick={run}>{busy?"Building…":"Create PDF"}</Button>
        </>
      }>
        <DropZone accept="image/*,.jpg,.jpeg,.png,.webp" multiple onFiles={(fs)=>{ const imgs=fs.filter(isImageFile); if(!imgs.length) return toast.error("Images only"); addFiles(imgs); setResult(null); }} label="Drop images (JPG, PNG, WebP)" />
        <FileQueue files={files} onRemove={remove} onReorder={reorder} />
        {result && <ResultBar fileName="images.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"images.pdf")} />}
        {files.length>0 && <Button variant="outline" onClick={()=>{clear();setResult(null);}}>Clear</Button>}
      </ToolShell>
    </MarketingShell>
  );
}
