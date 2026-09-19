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
import { getMetadata, setMetadata } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("metadata")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [info, setInfo] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
    const m = await getMetadata(await f.arrayBuffer());
    setTitle(m.title); setAuthor(m.author); setSubject(m.subject); setKeywords(m.keywords);
    setInfo(`${m.pageCount} pages · creator: ${m.creator||"—"} · producer: ${m.producer||"—"}`);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await setMetadata(await file.arrayBuffer(), { title, author, subject, keywords }));
      toast.success("Metadata updated");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          {info && <p className="text-xs text-zinc-500">{info}</p>}
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Author</Label><Input value={author} onChange={(e)=>setAuthor(e.target.value)} /></div>
          <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e)=>setSubject(e.target.value)} /></div>
          <div className="space-y-2"><Label>Keywords</Label><Input value={keywords} onChange={(e)=>setKeywords(e.target.value)} /></div>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Saving…":"Save metadata"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="metadata.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"metadata.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
