"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileSummary,
  ProcessProgress,
  ProcessError,
  SoftLimitsNote,
} from "@/components/tools/process";
import { getTool } from "@/lib/tools";
import { useProcessJob } from "@/hooks/useProcessJob";
import { useHandoffIntake } from "@/hooks/useHandoffIntake";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import {
  CHAT_MODELS_SIZE_LABEL,
  CHAT_MAX_PAGES,
  EMBED_MODEL_ID,
  QA_MODEL_ID,
  pagesNeedOcr,
  type ChatIndex,
  type Citation,
  type PageText,
} from "@/lib/ai/chat-ondevice";

const tool = getTool("chat-pdf")!;

type Msg = {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  method?: string;
  confidence?: number;
};

export default function ChatPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [index, setIndex] = useState<ChatIndex | null>(null);
  const [enableOcr, setEnableOcr] = useState(true);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [badge, setBadge] = useState("");
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
    mime: string;
  } | null>(null);
  const sourceBufRef = useRef<ArrayBuffer | null>(null);
  const indexRef = useRef<ChatIndex | null>(null);
  const job = useProcessJob();

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setPages(null);
      setIndex(null);
      indexRef.current = null;
      setMessages([]);
      setBadge("");
      setResult(null);
      setQ("");
      job.resetError();
      sourceBufRef.current = (await f.arrayBuffer()).slice(0);
      setSummary(await inspectPdfFile(f));
      try {
        const extracted = await extractTextFromPdf(sourceBufRef.current!);
        setPages(extracted);
        toast.success(
          `Loaded ${extracted.length} page(s) — ask to index on-device`
        );
      } catch {
        toast.error("Could not extract text");
      }
    },
    [job.resetError]
  );

  useHandoffIntake("/chat-pdf", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setPages(null);
    setIndex(null);
    indexRef.current = null;
    sourceBufRef.current = null;
    setMessages([]);
    setBadge("");
    setResult(null);
    setQ("");
    job.resetError();
  };

  const exportTranscript = (msgs: Msg[]) => {
    if (!file || msgs.length === 0) return;
    const md = [
      `# Ask PDF — on-device RAG`,
      ``,
      `File: ${file.name}`,
      `Models: \`${EMBED_MODEL_ID}\` (embed) + \`${QA_MODEL_ID}\` (QA)`,
      `Badge: On-device model · text never left this device`,
      ``,
      ...msgs.flatMap((m) => {
        if (m.role === "user") return [`## Q`, m.text, ``];
        const cites =
          m.citations
            ?.map(
              (c) =>
                `- p.${c.page} (sim ${c.score.toFixed(3)}): ${c.snippet}`
            )
            .join("\n") || "";
        return [
          `## A${m.method ? ` (${m.method})` : ""}`,
          m.text,
          cites ? `\n### Citations\n${cites}` : "",
          ``,
        ];
      }),
    ].join("\n");
    setResult({
      bytes: new TextEncoder().encode(md),
      name: suggestedName(file.name, "chat", "md"),
      mime: "text/markdown",
    });
  };

  const ask = async () => {
    if (!file || !sourceBufRef.current || !q.trim()) return;
    const question = q.trim();

    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Extracting text…");
      setProgress(3);

      let pageTexts = pages;
      if (!pageTexts) {
        pageTexts = await extractTextFromPdf(sourceBufRef.current!);
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        setPages(pageTexts);
      }

      const { buildChatIndex, answerWithIndex, pagesNeedOcr: needsOcr } =
        await import("@/lib/ai/chat-ondevice");
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const ac = new AbortController();
      const poll = setInterval(() => {
        if (isCancelled()) ac.abort();
      }, 200);

      try {
        let idx = indexRef.current;
        if (!idx) {
          const doOcr = enableOcr && needsOcr(pageTexts!);
          if (doOcr) {
            setLabel("Scant text detected — OCR on-device…");
          } else {
            setLabel(`Loading embed model (${CHAT_MODELS_SIZE_LABEL})…`);
          }
          idx = await buildChatIndex(pageTexts!, {
            signal: ac.signal,
            enableOcr: enableOcr,
            sourceForOcr: sourceBufRef.current!,
            onProgress: (pct, label) => {
              if (isCancelled()) {
                ac.abort();
                return;
              }
              setProgress(pct);
              setLabel(label);
            },
          });
          if (isCancelled()) throw new DOMException("Aborted", "AbortError");
          indexRef.current = idx;
          setIndex(idx);
          if (idx.ocrPages.length) {
            // Refresh page texts after OCR merge is inside index only;
            // pages state stays as pdf.js extract (index has OCR’d chunks).
          }
        }

        setLabel("Retrieving + answering on-device…");
        const answer = await answerWithIndex(idx, question, {
          signal: ac.signal,
          onProgress: (pct, label) => {
            if (isCancelled()) {
              ac.abort();
              return;
            }
            setProgress(pct);
            setLabel(label);
          },
        });
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");

        return {
          question,
          answer: answer.answer,
          citations: answer.citations,
          method: answer.method,
          confidence: answer.confidence,
          badge: `On-device model · ${answer.modelIds.embed} + ${answer.modelIds.qa}`,
          indexMeta: idx,
        };
      } finally {
        clearInterval(poll);
      }
    });

    if (!out) return;

    const next: Msg[] = [
      ...messages,
      { role: "user", text: out.question },
      {
        role: "assistant",
        text: out.answer,
        citations: out.citations,
        method: out.method,
        confidence: out.confidence,
      },
    ];
    setMessages(next);
    setBadge(out.badge);
    setQ("");
    exportTranscript(next);
    toast.success(
      out.method === "qa" ? "On-device answer ready" : "Passages retrieved"
    );
  };

  const indexReady = !!index;
  const scantHint =
    pages && pagesNeedOcr(pages)
      ? "Many pages look scant — OCR toggle recommended."
      : null;

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Privacy-first RAG: embeddings + extractive QA run entirely in your
              browser via transformers.js. PDF and text are{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-300">
                never uploaded
              </strong>{" "}
              on the default path. First download {CHAT_MODELS_SIZE_LABEL}, then
              cached. Soft cap ~{CHAT_MAX_PAGES} pages.
            </p>
            <p className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
              On-device model ·{" "}
              <code className="text-[10px]">{EMBED_MODEL_ID}</code> +{" "}
              <code className="text-[10px]">{QA_MODEL_ID}</code>. Answers cite
              page numbers from retrieved chunks.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ocr-scant">
                OCR scant pages (lazy Tesseract)
              </Label>
              <Switch
                id="ocr-scant"
                checked={enableOcr}
                onCheckedChange={setEnableOcr}
                disabled={job.busy || indexReady}
              />
            </div>
            {scantHint && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {scantHint}
              </p>
            )}
            {indexReady && (
              <p className="text-[11px] text-zinc-500">
                Indexed {index!.chunks.length} chunks · {index!.pageCount}{" "}
                pages
                {index!.ocrPages.length
                  ? ` · OCR p.${index!.ocrPages.join(", ")}`
                  : ""}
                {index!.truncated ? " · truncated to soft limits" : ""}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="chat-q">Question</Label>
              <Input
                id="chat-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What is the agreement about?"
                disabled={!file || job.busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask();
                  }
                }}
              />
            </div>
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || !q.trim() || job.busy}
              onClick={() => void ask()}
            >
              {job.busy
                ? "Working…"
                : indexReady
                  ? "Ask (on-device)"
                  : "Index & ask (on-device)"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF to ask"}
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
        {badge && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {badge}
          </p>
        )}
        {messages.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Chat
            </h2>
            <ul className="space-y-4">
              {messages.map((m, i) => (
                <li key={i} className="space-y-1.5">
                  <p
                    className={
                      m.role === "user"
                        ? "text-xs font-semibold text-amber-700 dark:text-amber-400"
                        : "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                    }
                  >
                    {m.role === "user" ? "You" : "On-device model"}
                    {m.method ? ` · ${m.method}` : ""}
                    {typeof m.confidence === "number"
                      ? ` · conf ${m.confidence.toFixed(2)}`
                      : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.text}
                  </p>
                  {m.citations && m.citations.length > 0 && (
                    <ul className="space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
                      {m.citations.map((c, j) => (
                        <li key={j}>
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            p.{c.page}
                          </span>{" "}
                          · sim {c.score.toFixed(3)} · {c.snippet}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-zinc-600 dark:text-zinc-400">
              Transcript ready ({result.name})
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadBytes(result.bytes, result.name, result.mime)
              }
            >
              Download .md
            </Button>
            <Button size="sm" variant="ghost" onClick={resetAll}>
              Start over
            </Button>
          </div>
        )}
      </ToolShell>
    </MarketingShell>
  );
}
