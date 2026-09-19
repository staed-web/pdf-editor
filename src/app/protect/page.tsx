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

const tool = getTool("protect")!;

export default function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    if (password.length < 1) return toast.error("Enter a password");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const bytes = await protectPdf(await file.arrayBuffer(), password);
      setResult(bytes);
      toast.success("PDF encrypted");
    } catch (e) {
      console.error(e);
      toast.error("Encryption failed — try a different PDF or shorter password");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
          <div className="space-y-2"><Label>Confirm</Label><Input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} /></div>
          <p className="text-[11px] text-zinc-500">Uses pdf-lib encryption. Keep your password safe — we cannot recover it.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Encrypting…":"Protect PDF"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="protected.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"protected.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
