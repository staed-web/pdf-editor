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
import { stampQrOrBarcode } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("barcode")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [value, setValue] = useState("INV-1001");
  const [position, setPosition] = useState<"top-left"|"top-right"|"bottom-left"|"bottom-right">("bottom-left");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await stampQrOrBarcode(await file.arrayBuffer(), { kind: "code128", value, position, size: 140 }));
      toast.success("Barcode stamped");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free visual Code128-style barcode — not guaranteed scannable for all readers.</p>
          <div className="space-y-2"><Label>Value</Label><Input value={value} onChange={(e)=>setValue(e.target.value)} /></div>
          <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={position} onChange={(e)=>setPosition(e.target.value as typeof position)}>
            {["top-left","top-right","bottom-left","bottom-right"].map((p)=><option key={p} value={p}>{p}</option>)}
          </select>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Stamp barcode"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="barcode.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"barcode.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
