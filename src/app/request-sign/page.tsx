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
import { buildSignRequestPack } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("request-sign")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Please review and sign this document.");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [mailto, setMailto] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file || !email) return;
    setBusy(true);
    try {
      const out = await buildSignRequestPack(new Uint8Array(await file.arrayBuffer()), {
        signerEmail: email,
        message,
        requesterName: name || "Requester",
      });
      setResult(out.zipBytes);
      setMailto(out.mailto);
      toast.success("Request pack ready — no DocuSign fees");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free creative path: ZIP with PDF + instructions JSON + mailto link. Not a paid e-sign service.</p>
          <div className="space-y-2"><Label>Your name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Signer email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Message</Label><Input value={message} onChange={(e)=>setMessage(e.target.value)} /></div>
          <Button className="w-full" disabled={!file||!email||busy} onClick={run}>{busy?"Working…":"Build pack"}</Button>
          {mailto && <a className="block text-center text-sm text-amber-700 underline" href={mailto}>Open mailto draft</a>}
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="signature-request.zip" size={result.byteLength} onDownload={()=>downloadBytes(result,"signature-request.zip","application/zip")} />}
      </ToolShell>
    </MarketingShell>
  );
}
