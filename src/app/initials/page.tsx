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
import { addInitialsStamp } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("initials")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [initials, setInitials] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file || !initials.trim()) return;
    setBusy(true);
    try {
      setResult(await addInitialsStamp(await file.arrayBuffer(), initials));
      toast.success("Initials stamped on last page");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Initials</Label><Input value={initials} onChange={(e)=>setInitials(e.target.value)} maxLength={4} placeholder="DK" /></div>
          <Button className="w-full" disabled={!file||!initials.trim()||busy} onClick={run}>{busy?"Working…":"Stamp initials"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="initialed.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"initialed.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
