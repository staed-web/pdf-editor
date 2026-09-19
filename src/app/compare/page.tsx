"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { comparePdfs } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("compare")!;

export default function Page() {
  const [a, setA] = useState<File | null>(null);
  const [b, setB] = useState<File | null>(null);
  const [report, setReport] = useState("");
  const [stats, setStats] = useState("");
  const [previewA, setPreviewA] = useState("");
  const [previewB, setPreviewB] = useState("");
  const [heatmap, setHeatmap] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (fs: File[]) => {
    const pdfs = fs.filter(isPdfFile);
    if (pdfs.length < 1) return toast.error("PDF only");
    if (!a) {
      setA(pdfs[0]);
      if (pdfs[1]) setB(pdfs[1]);
    } else if (!b) setB(pdfs[0]);
    else {
      setA(pdfs[0]);
      setB(pdfs[1] || null);
    }
    setResult(null);
  };

  const run = async () => {
    if (!a || !b) return toast.error("Need two PDFs");
    setBusy(true);
    try {
      const out = await comparePdfs(await a.arrayBuffer(), await b.arrayBuffer());
      setReport(out.report);
      setStats(`Text diff ${out.textDiffPct}% · Image diff ${out.imageDiffPct}%`);
      setPreviewA(out.previewA || "");
      setPreviewB(out.previewB || "");
      setHeatmap(out.heatmap || "");
      setResult(new TextEncoder().encode(out.report));
      toast.success("Compare ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Drop two PDFs. Free local text + page-1 pixel diff with a red
              heatmap of changed regions.
            </p>
            <p className="text-xs">A: {a?.name || "—"}</p>
            <p className="text-xs">B: {b?.name || "—"}</p>
            <Button className="w-full" disabled={!a || !b || busy} onClick={run}>
              {busy ? "Comparing…" : "Compare"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          multiple
          onFiles={onFiles}
          label="Drop PDF A and PDF B"
        />
        {stats && <p className="text-sm font-medium">{stats}</p>}
        {(previewA || previewB) && (
          <div className="grid grid-cols-2 gap-3">
            {previewA && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewA}
                alt="A"
                className="rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            )}
            {previewB && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewB}
                alt="B"
                className="rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            )}
          </div>
        )}
        {heatmap && (
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">
              Diff heatmap (red = changed)
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heatmap}
              alt="Heatmap"
              className="max-w-md rounded-lg border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        )}
        {report && (
          <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {report.slice(0, 3000)}
          </pre>
        )}
        {result && (
          <ResultBar
            fileName="compare-report.md"
            size={result.byteLength}
            onDownload={() =>
              downloadBytes(result, "compare-report.md", "text/markdown")
            }
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
