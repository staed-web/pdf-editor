"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { FileQueue } from "@/components/tools/FileQueue";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
import { ProcessSuccess, SoftLimitsNote } from "@/components/tools/process";
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

  const resetAll = () => {
    clear();
    setResult(null);
  };

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
      <ToolShell tool={tool} actionBar={
          <ToolActionBar>
            <Button className="min-h-11 w-full flex-1" disabled={!files.length||busy} onClick={run}>{busy?"Building…":"Create PDF"}</Button>
          </ToolActionBar>
        } options={
        <>
          <div className="space-y-2">
            <Label>Page size</Label>
            <div className="flex flex-wrap gap-2">
              {(["auto","a4","letter"] as const).map((s)=>(
                <Button key={s} size="sm" variant={pageSize===s?"default":"outline"} onClick={()=>setPageSize(s)} className="capitalize">{s}</Button>
              ))}
            </div>
          </div>
          <SoftLimitsNote />
        </>
      }>
        <DropZone accept="image/*,.jpg,.jpeg,.png,.webp" multiple capture="environment" onFiles={(fs)=>{ const imgs=fs.filter(isImageFile); if(!imgs.length) return toast.error("Images only"); addFiles(imgs); setResult(null); }} label="Drop images (JPG, PNG, WebP)" pickerLabel="Choose images" />
        <FileQueue files={files} onRemove={remove} onReorder={reorder} />
        {result && (
          <ProcessSuccess
            fileName="images.pdf"
            size={result.byteLength}
            blob={result}
            fromTool="images-to-pdf"
            onDownload={() => downloadBytes(result, "images.pdf")}
            onProcessAnother={resetAll}
          />
        )}
        {files.length>0 && <Button variant="outline" className="min-h-11" onClick={resetAll}>Clear</Button>}
      </ToolShell>
    </MarketingShell>
  );
}
