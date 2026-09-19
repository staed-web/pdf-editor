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
import { addWatermark } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("watermark")!;

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(48);
  const [position, setPosition] = useState<"center"|"diagonal"|"top-left"|"top-right"|"bottom-left"|"bottom-right">("diagonal");
  const [color, setColor] = useState("#000000");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await addWatermark(await file.arrayBuffer(), { text, opacity, fontSize, color, position });
      setResult(bytes);
      toast.success("Watermark applied");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Text</Label><Input value={text} onChange={(e)=>setText(e.target.value)} /></div>
          <div className="space-y-2"><Label>Opacity ({opacity})</Label><input type="range" min={0.05} max={0.9} step={0.05} value={opacity} onChange={(e)=>setOpacity(Number(e.target.value))} className="w-full" /></div>
          <div className="space-y-2"><Label>Font size</Label><Input type="number" value={fontSize} onChange={(e)=>setFontSize(Number(e.target.value)||48)} /></div>
          <div className="space-y-2"><Label>Color</Label><Input type="color" value={color} onChange={(e)=>setColor(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Position</Label>
            <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={position} onChange={(e)=>setPosition(e.target.value as typeof position)}>
              {["diagonal","center","top-left","top-right","bottom-left","bottom-right"].map((p)=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button className="w-full" disabled={!file||busy||!text.trim()} onClick={run}>{busy?"Working…":"Add watermark"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="watermarked.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"watermarked.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
