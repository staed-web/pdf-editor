"use client";
import { useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { imagesToPdf } from "@/lib/pdf/ops";
import { downloadBytes } from "@/lib/download";

const tool = getTool("ppt-to-pdf")!;

export default function PptToPdfPage() {
  const [name, setName] = useState<string | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !/\.pptx$/i.test(f.name)) return toast.error("Drop a .pptx file");
    setName(f.name); setResult(null); setBusy(true); setNote("");
    try {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const media = Object.keys(zip.files)
        .filter((p) => p.startsWith("ppt/media/") && /\.(png|jpe?g)$/i.test(p))
        .sort();
      if (!media.length) {
        setNote("No embedded slide images found. PPTX without raster media can’t be fully rendered client-side — try exporting slides as images, then use Images to PDF.");
        toast.message("Limited PPTX support");
        return;
      }
      const imgs = [];
      for (const path of media) {
        const bytes = new Uint8Array(await zip.files[path].async("uint8array"));
        const type = /\.png$/i.test(path) ? "png" as const : "jpg" as const;
        imgs.push({ bytes, type });
      }
      setResult(await imagesToPdf(imgs, { pageSize: "auto" }));
      toast.success(`Built PDF from ${imgs.length} media image(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Could not process PPTX");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <p className="text-xs text-zinc-500">Best-effort: extracts embedded images from PPTX. Complex slides may need Images→PDF.</p>
      }>
        <DropZone accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" onFiles={onFiles} label={busy?"Processing…":(name||"Drop a .pptx file")} disabled={busy} />
        {note && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">{note}</p>}
        {result && <ResultBar fileName="presentation.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"presentation.pdf")} />}
        <Button asChild variant="outline"><a href="/images-to-pdf">Or use Images to PDF</a></Button>
      </ToolShell>
    </MarketingShell>
  );
}
