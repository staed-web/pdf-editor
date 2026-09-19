"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { convertPdfToExcel } from "@/lib/pdf/pdf-to-excel";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-excel")!;

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await convertPdfToExcel(await file.arrayBuffer());
      setResult(out);
      toast.success("Spreadsheet created (column-aligned table detection)");
    } catch {
      toast.error("Failed");
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
              Clusters text into rows by Y proximity and infers columns from X
              alignment. One sheet per page. Best on simple tables.
            </p>
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? "Working…" : "Export XLSX"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={(fs) => {
            const f = fs.find(isPdfFile);
            if (!f) return toast.error("PDF only");
            setFile(f);
            setResult(null);
          }}
          label={file ? file.name : "Drop a PDF"}
        />
        {result && (
          <ResultBar
            fileName="extract.xlsx"
            size={result.byteLength}
            onDownload={() =>
              downloadBytes(
                result,
                "extract.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              )
            }
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
