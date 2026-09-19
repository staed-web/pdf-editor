"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { svgToPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes } from "@/lib/download";

const tool = getTool("svg-to-pdf")!;

export default function Page() {
  const [svg, setSvg] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="#fef3c7"/><text x="40" y="110" font-size="28" fill="#92400e">Hello SVG</text></svg>');
  const [name, setName] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs[0];
    if (!f) return;
    setName(f.name);
    setSvg(await f.text());
    setResult(null);
  };

  const run = async () => {
    setBusy(true);
    try {
      setResult(await svgToPdf(svg));
      toast.success("PDF ready (rasterized)");
    } catch (e) {
      console.error(e);
      toast.error("Failed to rasterize SVG");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Rasterizes SVG via canvas then embeds as PDF — free local path.</p>
          <Button className="w-full" disabled={!svg.trim()||busy} onClick={run}>{busy?"Working…":"Make PDF"}</Button>
        </>
      }>
        <DropZone accept="image/svg+xml,.svg" onFiles={onFiles} label={name||"Drop an SVG or edit below"} />
        <textarea className="min-h-[160px] w-full rounded-2xl border border-zinc-200 bg-white p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" value={svg} onChange={(e)=>setSvg(e.target.value)} />
        {result && <ResultBar fileName="svg.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"svg.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
