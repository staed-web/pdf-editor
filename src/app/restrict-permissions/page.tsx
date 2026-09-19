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
import { protectPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("restrict-permissions")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [owner, setOwner] = useState("");
  const [user, setUser] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file || !owner) return;
    setBusy(true);
    try {
      // pdf-lib: owner vs user password — best-effort permissions via encrypt
      setResult(await protectPdf(await file.arrayBuffer(), user || owner, owner));
      toast.success("Encrypted with owner password (pdf-lib limits apply)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Best-effort owner/user password encrypt. Fine-grained print/copy flags are limited in free pdf-lib.</p>
          <div className="space-y-2"><Label>Owner password</Label><Input type="password" value={owner} onChange={(e)=>setOwner(e.target.value)} /></div>
          <div className="space-y-2"><Label>User password (optional)</Label><Input type="password" value={user} onChange={(e)=>setUser(e.target.value)} /></div>
          <Button className="w-full" disabled={!file||!owner||busy} onClick={run}>{busy?"Working…":"Restrict"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="restricted.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"restricted.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
