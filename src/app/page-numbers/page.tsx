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
import { addPageNumbers } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("page-numbers")!;

export default function PageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<"header"|"footer">("footer");
  const [format, setFormat] = useState("Page {n} of {total}");
  const [align, setAlign] = useState<"left"|"center"|"right">("center");
  const [fontSize, setFontSize] = useState(10);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await addPageNumbers(await file.arrayBuffer(), { position, format, align, fontSize });
      setResult(bytes);
      toast.success("Page numbers added");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Format</Label><Input value={format} onChange={(e)=>setFormat(e.target.value)} /><p className="text-[11px] text-zinc-500">Use {"{n}"} and {"{total}"}</p></div>
          <div className="flex gap-2">
            <Button size="sm" variant={position==="footer"?"default":"outline"} onClick={()=>setPosition("footer")}>Footer</Button>
            <Button size="sm" variant={position==="header"?"default":"outline"} onClick={()=>setPosition("header")}>Header</Button>
          </div>
          <div className="flex gap-2">
            {(["left","center","right"] as const).map((a)=>(
              <Button key={a} size="sm" variant={align===a?"default":"outline"} onClick={()=>setAlign(a)} className="capitalize">{a}</Button>
            ))}
          </div>
          <div className="space-y-2"><Label>Font size</Label><Input type="number" value={fontSize} onChange={(e)=>setFontSize(Number(e.target.value)||10)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Add numbers"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="numbered.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"numbered.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
