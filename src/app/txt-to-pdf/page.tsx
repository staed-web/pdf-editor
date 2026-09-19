"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { textToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes } from "@/lib/download";

const tool = getTool("txt-to-pdf")!;

export default function Page() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs[0];
    if (!f) return;
    setFileName(f.name);
    setText(await f.text());
    setResult(null);
  };

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      setResult(await textToPdf(text, { title: fileName || "text" }));
      toast.success("PDF ready");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <><Button className="w-full" disabled={!text.trim()||busy} onClick={run}>{busy?"Working…":"Make PDF"}</Button></>
      }>
        <DropZone accept="text/plain,.txt" onFiles={onFiles} label={fileName||"Drop a .txt or paste below"} />
        <div className="space-y-2">
          <Label>Text</Label>
          <textarea className="min-h-[200px] w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={text} onChange={(e)=>setText(e.target.value)} />
        </div>
        {result && <ResultBar fileName="text.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"text.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
