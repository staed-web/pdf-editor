"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { attachFilesToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("attach-files")!;

export default function Page() {
  const [pdf, setPdf] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!pdf || !attachments.length) return;
    setBusy(true);
    try {
      const files = [];
      for (const f of attachments) {
        files.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), mime: f.type });
      }
      setResult(await attachFilesToPdf(await pdf.arrayBuffer(), files));
      toast.success("Files attached");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs">PDF: {pdf?.name||"—"}</p>
          <p className="text-xs">Attachments: {attachments.map(a=>a.name).join(", ")||"—"}</p>
          <input type="file" multiple onChange={(e)=>setAttachments(Array.from(e.target.files||[]))} />
          <Button className="w-full" disabled={!pdf||!attachments.length||busy} onClick={run}>{busy?"Working…":"Attach"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setPdf(f); setResult(null); }} label={pdf?pdf.name:"Drop a PDF"} />
        {result && <ResultBar fileName="with-attachments.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"with-attachments.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
