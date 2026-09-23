"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSummary,
  ProcessProgress,
  ProcessError,
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { getTool } from "@/lib/tools";
import { useProcessJob } from "@/hooks/useProcessJob";
import { useHandoffIntake } from "@/hooks/useHandoffIntake";
import { protectPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  classifyProcessError,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("protect")!;

export default function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const job = useProcessJob();

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setResult(null);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/protect", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setResult(null);
    setPassword("");
    setConfirm("");
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    if (password.length < 1) {
      job.setError(classifyProcessError(new Error("Enter a password")));
      return;
    }
    if (password !== confirm) {
      job.setError(classifyProcessError(new Error("Passwords do not match")));
      return;
    }
    const bytes = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Encrypting…");
      setProgress(30);
      const out = await protectPdf(await file.arrayBuffer(), password);
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      setProgress(90);
      return out;
    });
    if (!bytes) return;
    const name = suggestedName(file.name, "protected");
    setResult({ bytes, name });
    toast.success("PDF encrypted");
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Strong password protection is applied on your device. Keep your
              password safe — InstantPDFEdit cannot recover it.
            </p>
            <SoftLimitsNote />
            <Button className="w-full" disabled={!file || job.busy} onClick={run}>
              {job.busy ? "Encrypting…" : "Protect PDF"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF"}
        />
        <FileSummary summary={summary} />
        {job.busy && (
          <ProcessProgress
            value={job.progress}
            label={job.progressLabel}
            onCancel={job.cancel}
          />
        )}
        <ProcessError error={job.error} onDismiss={job.resetError} />
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.bytes.byteLength}
            blob={result.bytes}
            fromTool="protect"
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
