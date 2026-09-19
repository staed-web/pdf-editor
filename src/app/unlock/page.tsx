"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { unlockPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("unlock")!;

export default function UnlockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await unlockPdf(await file.arrayBuffer(), password);
      setResult(bytes);
      toast.success("Unlocked and re-saved without encryption");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error
          ? e.message
          : "Wrong password or unsupported encryption"
      );
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
              Decrypts AES-encrypted PDFs (including InstantPDFEdit protect) with
              the password, then saves a plain PDF.
            </p>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? "Working…" : "Unlock"}
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
          label={file ? file.name : "Drop a protected PDF"}
        />
        {result && (
          <ResultBar
            fileName="unlocked.pdf"
            size={result.byteLength}
            onDownload={() => downloadBytes(result, "unlocked.pdf")}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
