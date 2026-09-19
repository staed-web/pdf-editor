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
import { addVisualSeal } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("certificate-seal")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file || !name.trim()) return;
    setBusy(true);
    try {
      setResult(await addVisualSeal(await file.arrayBuffer(), { name, org }));
      toast.success("Visual seal added (not PKI)");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-amber-700 dark:text-amber-400">Honest: this is a <strong>visual seal only</strong> — not cryptographic certificate signing / PKI.</p>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Organization</Label><Input value={org} onChange={(e)=>setOrg(e.target.value)} /></div>
          <Button className="w-full" disabled={!file||!name.trim()||busy} onClick={run}>{busy?"Working…":"Add visual seal"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="sealed.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"sealed.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
