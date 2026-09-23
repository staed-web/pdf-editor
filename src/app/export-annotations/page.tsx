"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import {
  extractPdfAnnotationRows,
  exportAnnotationSummary,
  type AnnotationSummaryRow,
  type SummaryFormat,
} from "@/lib/pdf/annotation-summary";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { cn } from "@/lib/utils";

const tool = getTool("export-annotations")!;

export default function ExportAnnotationsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<AnnotationSummaryRow[]>([]);
  const [format, setFormat] = useState<SummaryFormat>("txt");
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
    mime: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setBusy(true);
    setResult(null);
    try {
      const list = await extractPdfAnnotationRows(await f.arrayBuffer());
      setFile(f);
      setRows(list);
      toast.success(
        list.length
          ? `Found ${list.length} annotation${list.length === 1 ? "" : "s"}`
          : "No annotations found"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const base = (file.name || "document").replace(/\.pdf$/i, "");
      const out = await exportAnnotationSummary(
        rows,
        format,
        `${base}-annotations`
      );
      setResult(out);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
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
              Lists native PDF comments, highlights, and stamps, then exports
              TXT / CSV / PDF. For marks you add in the editor, use{" "}
              <Link href="/edit" className="underline">
                Export comments
              </Link>{" "}
              there.
            </p>
            <p className="text-xs">
              {busy ? "Working…" : `${rows.length} annotation(s) loaded`}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["txt", "csv", "pdf"] as SummaryFormat[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={format === f ? "default" : "outline"}
                  onClick={() => setFormat(f)}
                  className="uppercase"
                >
                  {f}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!file || busy}
              onClick={() => void run()}
            >
              {busy ? "Working…" : `Export ${format.toUpperCase()}`}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={(fs) => void onFiles(fs)}
          label={file ? file.name : "Drop a PDF with comments / annots"}
        />

        {rows.length > 0 && (
          <div className="max-h-80 overflow-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Text</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-t border-zinc-100 dark:border-zinc-800",
                      i % 2 === 0 && "bg-zinc-50/50 dark:bg-zinc-900/30"
                    )}
                  >
                    <td className="px-3 py-1.5 tabular-nums">{r.page}</td>
                    <td className="px-3 py-1.5 capitalize">{r.type}</td>
                    <td className="max-w-[28rem] truncate px-3 py-1.5">
                      {r.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <ResultBar
            fileName={result.name}
            size={result.bytes.byteLength}
            meta={`${rows.length} row(s)`}
            onDownload={() =>
              downloadBytes(result.bytes, result.name, result.mime)
            }
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
