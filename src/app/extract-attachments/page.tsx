"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { extractAttachments } from "@/lib/pdf/extra-ops";
import { downloadZip, isPdfFile } from "@/lib/download";

const tool = getTool("extract-attachments")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<{name:string;bytes:Uint8Array}[]|null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await extractAttachments(await file.arrayBuffer());
      setFiles(out);
      toast.success(`${out.length} item(s)`);
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Best-effort enumeration of embedded file names (pdf-lib limits on binary extract).</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Extract"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setFiles(null); }} label={file?file.name:"Drop a PDF"} />
        {files && (
          <ResultBar
            fileName="attachments.zip"
            size={files.reduce((a,f)=>a+f.bytes.byteLength,0)}
            onDownload={()=>downloadZip(files.map(f=>({name:f.name,data:f.bytes})),"attachments.zip")}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
