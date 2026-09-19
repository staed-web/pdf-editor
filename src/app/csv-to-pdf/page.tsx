"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { csvToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes } from "@/lib/download";

const tool = getTool("csv-to-pdf")!;

export default function Page() {
  const [csv, setCsv] = useState("Name,Score\nAda,98\nLinus,95");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs[0];
    if (!f) return;
    setCsv(await f.text());
    setResult(null);
  };

  const run = async () => {
    setBusy(true);
    try {
      setResult(await csvToPdf(csv));
      toast.success("PDF ready");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <><Button className="w-full" disabled={!csv.trim()||busy} onClick={run}>{busy?"Working…":"Make PDF"}</Button></>
      }>
        <DropZone accept="text/csv,.csv" onFiles={onFiles} label="Drop a CSV or edit below" />
        <textarea className="min-h-[180px] w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" value={csv} onChange={(e)=>setCsv(e.target.value)} />
        {result && <ResultBar fileName="table.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"table.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
