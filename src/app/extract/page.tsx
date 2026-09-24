"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
import {
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getTool } from "@/lib/tools";
import { extractPageIndices, getPageCount } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("extract")!;

export default function ExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [sel, setSel] = useState("1");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const resetAll = () => {
    setFile(null);
    setPages(0);
    setSel("1");
    setResult(null);
  };

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setResult(null);
    const n = await getPageCount(await f.arrayBuffer());
    setPages(n);
    setSel(`1-${Math.min(n, 1)}`);
  };

  const parsePages = (s: string, max: number) => {
    const out: number[] = [];
    for (const part of s.split(/[,\s]+/).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) throw new Error(`Invalid page selection: ${part}`);
      const a = Number(m[1]);
      const b = Number(m[2] || m[1]);
      for (let i = a; i <= b; i++) {
        if (i < 1 || i > max) throw new Error(`Page ${i} out of range`);
        out.push(i - 1);
      }
    }
    return [...new Set(out)];
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const idx = parsePages(sel, pages);
      const bytes = await extractPageIndices(await file.arrayBuffer(), idx);
      setResult(bytes);
      toast.success("Extracted");
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
        actionBar={
          <ToolActionBar>
            <Button
              className="min-h-11 w-full flex-1"
              disabled={!file || busy}
              onClick={run}
            >
              {busy ? "Working…" : "Extract"}
            </Button>
          </ToolActionBar>
        }
        options={
          <>
            <div className="space-y-2">
              <Label>Pages to extract</Label>
              <Input
                value={sel}
                onChange={(e) => setSel(e.target.value)}
                placeholder="1-3,5"
              />
              <p className="text-[11px] text-zinc-500">
                {pages ? `Document: ${pages} pages` : "Load a PDF"}
              </p>
            </div>
            <SoftLimitsNote />
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF"}
          pickerLabel="Choose PDF"
        />
        {result && (
          <ProcessSuccess
            fileName="extracted.pdf"
            size={result.byteLength}
            blob={result}
            fromTool="extract"
            onDownload={() => downloadBytes(result, "extracted.pdf")}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
