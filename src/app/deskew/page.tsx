"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { deskewPdf } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("deskew")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [angles, setAngles] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await deskewPdf(await file.arrayBuffer());
      setResult(out.bytes);
      setAngles(out.angles);
      const nonzero = out.angles.filter((a) => Math.abs(a) >= 0.25);
      toast.success(
        nonzero.length
          ? `Deskewed ${nonzero.length} page(s): ${nonzero
              .map((a) => `${a.toFixed(1)}°`)
              .join(", ")}`
          : "Pages already upright — contrast enhanced"
      );
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
              Free local deskew: projection-profile angle detection (−8°…+8°),
              rotate, then mild contrast boost. Best on scanned text pages.
            </p>
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? "Working…" : "Deskew PDF"}
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
            setAngles([]);
          }}
          label={file ? file.name : "Drop a PDF"}
        />
        {angles.length > 0 && (
          <p className="text-xs text-zinc-500">
            Per-page angles:{" "}
            {angles.map((a, i) => `p${i + 1}=${a.toFixed(1)}°`).join(" · ")}
          </p>
        )}
        {result && (
          <ResultBar
            fileName="deskewed.pdf"
            size={result.byteLength}
            onDownload={() => downloadBytes(result, "deskewed.pdf")}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
