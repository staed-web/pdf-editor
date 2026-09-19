"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getTool } from "@/lib/tools";
import { deletePageIndices, getPageCount } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("delete-pages")!;

export default function DeletePagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [sel, setSel] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
    setPages(await getPageCount(await f.arrayBuffer()));
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const remove: number[] = [];
      for (const part of sel.split(/[,\s]+/).filter(Boolean)) {
        const m = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!m) throw new Error(`Bad: ${part}`);
        const a=Number(m[1]), b=Number(m[2]||m[1]);
        for (let i=a;i<=b;i++) remove.push(i-1);
      }
      const bytes = await deletePageIndices(await file.arrayBuffer(), [...new Set(remove)]);
      setResult(bytes);
      toast.success("Pages removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <div className="space-y-2">
            <Label>Pages to delete</Label>
            <Input value={sel} onChange={(e)=>setSel(e.target.value)} placeholder="2,4-6" />
            <p className="text-[11px] text-zinc-500">{pages?`Document: ${pages} pages`:"Load a PDF"}</p>
          </div>
          <Button className="w-full" variant="destructive" disabled={!file||busy||!sel.trim()} onClick={run}>{busy?"Working…":"Delete pages"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="pages-deleted.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"pages-deleted.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
