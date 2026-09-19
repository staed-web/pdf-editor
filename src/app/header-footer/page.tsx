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
import { addHeaderFooter } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("header-footer")!;

export default function HeaderFooterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [fontSize, setFontSize] = useState(10);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    if (!header && !footer) return toast.error("Enter header or footer text");
    setBusy(true);
    try {
      const bytes = await addHeaderFooter(await file.arrayBuffer(), { header, footer, fontSize });
      setResult(bytes);
      toast.success("Applied");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Header</Label><Input value={header} onChange={(e)=>setHeader(e.target.value)} /></div>
          <div className="space-y-2"><Label>Footer</Label><Input value={footer} onChange={(e)=>setFooter(e.target.value)} /></div>
          <div className="space-y-2"><Label>Font size</Label><Input type="number" value={fontSize} onChange={(e)=>setFontSize(Number(e.target.value)||10)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Apply"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="header-footer.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"header-footer.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
