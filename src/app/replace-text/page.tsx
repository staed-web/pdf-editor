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
import { replaceTextOverlay } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("replace-text")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file || !find) return;
    setBusy(true);
    try {
      const out = await replaceTextOverlay(await file.arrayBuffer(), find, replace);
      setResult(out.bytes);
      setCount(out.count);
      toast.success(out.count ? `Replaced ${out.count} hit(s)` : "No matches found");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free local approximation (same limitation as many SaaS overlays): white rect + redraw new text. Does not edit the original content stream.</p>
          <div className="space-y-2"><Label>Find</Label><Input value={find} onChange={(e)=>setFind(e.target.value)} /></div>
          <div className="space-y-2"><Label>Replace with</Label><Input value={replace} onChange={(e)=>setReplace(e.target.value)} /></div>
          <Button className="w-full" disabled={!file||!find||busy} onClick={run}>{busy?"Working…":"Replace"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="replaced.pdf" size={result.byteLength} meta={`${count} replacements`} onDownload={()=>downloadBytes(result,"replaced.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
