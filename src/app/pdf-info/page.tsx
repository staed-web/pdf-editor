"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { pdfInfoStats } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { formatBytes } from "@/lib/utils";

const tool = getTool("pdf-info")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof pdfInfoStats>> | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (f?: File) => {
    const target = f || file;
    if (!target) return;
    setBusy(true);
    try {
      const s = await pdfInfoStats(await target.arrayBuffer());
      setStats(s);
      const report = Object.entries(s).map(([k,v])=>`${k}: ${v}`).join("\n");
      setResult(new TextEncoder().encode(report));
      toast.success("Info ready");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <><Button className="w-full" disabled={!file||busy} onClick={()=>run()}>{busy?"Analyzing…":"Analyze"}</Button></>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setStats(null); setResult(null); run(f); }} label={file?file.name:"Drop a PDF"} />
        {stats && (
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div><dt className="text-xs text-zinc-500">Pages</dt><dd className="font-semibold">{stats.pageCount}</dd></div>
            <div><dt className="text-xs text-zinc-500">Words</dt><dd className="font-semibold">{stats.words.toLocaleString()}</dd></div>
            <div><dt className="text-xs text-zinc-500">Characters</dt><dd className="font-semibold">{stats.chars.toLocaleString()}</dd></div>
            <div><dt className="text-xs text-zinc-500">Size</dt><dd className="font-semibold">{formatBytes(stats.bytes)}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-zinc-500">Title</dt><dd>{stats.title||"—"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-zinc-500">Author</dt><dd>{stats.author||"—"}</dd></div>
          </dl>
        )}
        {result && <ResultBar fileName="pdf-info.txt" size={result.byteLength} onDownload={()=>downloadBytes(result,"pdf-info.txt","text/plain")} />}
      </ToolShell>
    </MarketingShell>
  );
}
