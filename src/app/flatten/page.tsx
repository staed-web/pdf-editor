"use client";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
import { ProcessSuccess, SoftLimitsNote } from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getTool } from "@/lib/tools";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { useHandoffIntake } from "@/hooks/useHandoffIntake";

const tool = getTool("flatten")!;

export default function FlattenPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoRan, setAutoRan] = useState(false);
  const [stripAnnotations, setStripAnnotations] = useState(true);

  const runWithFile = useCallback(
    async (f: File) => {
      setBusy(true);
      try {
        const { flattenForms } = await import("@/lib/pdf/ops");
        const bytes = await flattenForms(await f.arrayBuffer(), {
          stripAnnotations,
        });
        setResult(bytes);
        toast.success(
          stripAnnotations
            ? "Flattened & locked — forms burned in, leftover annotations removed"
            : "Flattened forms — ready to download"
        );
      } catch {
        toast.error("Flatten failed");
      } finally {
        setBusy(false);
      }
    },
    [stripAnnotations]
  );

  useHandoffIntake("/flatten", async (f) => {
    setFile(f);
    setResult(null);
    if (!autoRan) {
      setAutoRan(true);
      await runWithFile(f);
    }
  });

  const resetAll = () => {
    setFile(null);
    setResult(null);
  };

  const run = async () => {
    if (!file) return;
    await runWithFile(file);
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
              {busy ? "Working…" : "Flatten & lock"}
            </Button>
          </ToolActionBar>
        }
        options={
          <>
            <p className="text-xs text-zinc-500">
              Last step for contracts: burns form fields into the page and
              removes leftover annotation objects so recipients can&apos;t edit
              them. Typical path:{" "}
              <Link href="/sign" className="underline">
                Sign
              </Link>
              {" → "}Flatten & lock → Download.
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="strip">Remove leftover annotations</Label>
                <p className="text-[10px] text-[var(--muted)]">
                  Recommended after signing — locks widgets & comments
                </p>
              </div>
              <Switch
                id="strip"
                checked={stripAnnotations}
                onCheckedChange={setStripAnnotations}
              />
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign">Back to Sign</Link>
            </Button>
            <SoftLimitsNote />
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
          label={file ? file.name : "Drop a signed or filled PDF"}
        />
        {result && (
          <ProcessSuccess
            fileName="flattened.pdf"
            size={result.byteLength}
            meta={
              stripAnnotations
                ? "Forms flattened · annotations stripped"
                : "Forms flattened"
            }
            blob={result}
            fromTool="flatten"
            onDownload={() => downloadBytes(result, "flattened.pdf")}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
