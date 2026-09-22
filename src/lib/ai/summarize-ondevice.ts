/**
 * PDF summarization priority:
 * 1. Chrome Summarizer API (built-in, preferred)
 * 2. Rules / heuristic extractive outline (default when no browser AI)
 * 3. Optional Xenova DistilBART (~230 MB) — OFF by default to avoid OOM
 */

import {
  chunkText,
  loadTransformers,
  type ProgressCb,
} from "./transformers-runtime";
import {
  createBrowserSummarizer,
  isSummarizerUsable,
  throwIfAborted,
} from "./chrome-ai";

/** Quantized DistilBART CNN — English abstractive summarization (~230 MB). Opt-in only. */
export const SUMMARIZE_MODEL_ID = "Xenova/distilbart-cnn-6-6";
export const SUMMARIZE_MODEL_SIZE_LABEL = "~230 MB (opt-in, cached in browser)";

export type SummarizeProgress = (pct: number, label: string) => void;

export type SummarizeMethod =
  | "browser-summarizer"
  | "rules-heuristic"
  | "xenova-distilbart";

export function localOutline(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  const scored = sentences.map((s) => {
    const words = s.toLowerCase().split(/\W+/);
    const score = words.filter((w) => w.length > 5).length + (s.length > 120 ? 1 : 0);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(
    0,
    Math.min(8, Math.max(3, Math.floor(sentences.length * 0.15)))
  );
  const set = new Set(top.map((t) => t.s));
  return sentences.filter((s) => set.has(s));
}

type XenovaSummarizer = (input: string, opts?: Record<string, unknown>) => Promise<
  | { summary_text: string }
  | { summary_text: string }[]
>;

let summarizerPromise: Promise<XenovaSummarizer> | null = null;
let summarizerModel: string | null = null;

async function getXenovaSummarizer(
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<XenovaSummarizer> {
  throwIfAborted(signal);
  if (summarizerPromise && summarizerModel === SUMMARIZE_MODEL_ID) {
    return summarizerPromise;
  }
  const { pipeline } = await loadTransformers();
  summarizerModel = SUMMARIZE_MODEL_ID;
  summarizerPromise = pipeline("summarization", SUMMARIZE_MODEL_ID, {
    quantized: true,
    progress_callback: (data: {
      status?: string;
      progress?: number;
      file?: string;
      loaded?: number;
      total?: number;
    }) => {
      if (signal?.aborted) return;
      onProgress?.({
        status: data.status || "progress",
        progress: data.progress,
        file: data.file,
        loaded: data.loaded,
        total: data.total,
      });
    },
  }) as Promise<XenovaSummarizer>;
  try {
    return await summarizerPromise;
  } catch (e) {
    summarizerPromise = null;
    summarizerModel = null;
    throw e;
  }
}

function unwrapSummary(
  out: { summary_text: string } | { summary_text: string }[]
): string {
  if (Array.isArray(out)) return out.map((o) => o.summary_text).join(" ").trim();
  return (out.summary_text || "").trim();
}

async function summarizeWithBrowserApi(
  cleaned: string,
  signal?: AbortSignal,
  onProgress?: SummarizeProgress
): Promise<{ summary: string; chunks: number } | null> {
  if (!(await isSummarizerUsable())) return null;
  const summarizer = await createBrowserSummarizer({ signal, onProgress });
  if (!summarizer) return null;

  try {
    const chunks = chunkText(cleaned, 3500, 120);
    const partials: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      throwIfAborted(signal);
      onProgress?.(
        45 + Math.round((i / Math.max(chunks.length, 1)) * 50),
        `Browser summarize ${i + 1}/${chunks.length}…`
      );
      partials.push((await summarizer.summarize(chunks[i])).trim());
    }
    onProgress?.(100, "Summary ready");
    try {
      summarizer.destroy?.();
    } catch {
      /* ignore */
    }
    return {
      summary: partials.filter(Boolean).join("\n\n"),
      chunks: chunks.length,
    };
  } catch {
    return null;
  }
}

async function summarizeWithXenova(
  cleaned: string,
  signal?: AbortSignal,
  onProgress?: SummarizeProgress
): Promise<{ summary: string; chunks: number; modelId: string }> {
  onProgress?.(2, `Preparing deeper summary (${SUMMARIZE_MODEL_SIZE_LABEL})…`);

  const downloadPct = (info: {
    status: string;
    progress?: number;
    file?: string;
  }) => {
    throwIfAborted(signal);
    if (typeof info.progress === "number") {
      const pct = Math.min(40, Math.round(info.progress * 0.4));
      onProgress?.(
        pct,
        info.file
          ? `Downloading model file… ${Math.round(info.progress)}%`
          : `Loading model… ${Math.round(info.progress)}%`
      );
    } else if (info.status === "ready" || info.status === "done") {
      onProgress?.(42, "Model ready — summarizing…");
    } else {
      onProgress?.(8, info.status || "Loading model…");
    }
  };

  const summarizer = await getXenovaSummarizer(downloadPct, signal);
  throwIfAborted(signal);
  onProgress?.(45, "Chunking document…");

  const chunks = chunkText(cleaned, 2800, 180);
  const partials: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    throwIfAborted(signal);
    const base = 45 + Math.round((i / Math.max(chunks.length, 1)) * 45);
    onProgress?.(
      base,
      `Summarizing chunk ${i + 1}/${chunks.length}…`
    );
    const out = await summarizer(chunks[i], {
      max_new_tokens: 120,
      min_new_tokens: 24,
      max_length: 142,
      min_length: 30,
      do_sample: false,
    });
    partials.push(unwrapSummary(out));
  }

  throwIfAborted(signal);

  let summary: string;
  if (partials.length <= 1) {
    summary = partials[0] || "";
  } else {
    onProgress?.(92, "Combining chunk summaries (map-reduce)…");
    const joined = partials.join(" ");
    const reduceChunks = chunkText(joined, 3000, 100);
    if (reduceChunks.length === 1) {
      summary = unwrapSummary(
        await summarizer(reduceChunks[0], {
          max_new_tokens: 160,
          min_new_tokens: 40,
          max_length: 180,
          min_length: 40,
          do_sample: false,
        })
      );
    } else {
      const mid: string[] = [];
      for (let i = 0; i < reduceChunks.length; i++) {
        throwIfAborted(signal);
        onProgress?.(
          92 + Math.round((i / reduceChunks.length) * 6),
          `Reduce pass ${i + 1}/${reduceChunks.length}…`
        );
        mid.push(
          unwrapSummary(
            await summarizer(reduceChunks[i], {
              max_new_tokens: 100,
              min_length: 20,
              do_sample: false,
            })
          )
        );
      }
      summary = mid.join(" ");
    }
  }

  onProgress?.(100, "Summary ready");
  return { summary, chunks: chunks.length, modelId: SUMMARIZE_MODEL_ID };
}

/**
 * Prefer Browser Summarizer API. DistilBART only when allowXenova=true.
 * When neither AI path works, returns empty summary (caller uses localOutline).
 */
export async function summarizeOnDevice(
  text: string,
  opts: {
    signal?: AbortSignal;
    onProgress?: SummarizeProgress;
    /** Opt-in heavy DistilBART download. Default false. */
    allowXenova?: boolean;
    /** Prefer heuristic only (no browser AI, no Xenova). */
    heuristicOnly?: boolean;
  } = {}
): Promise<{
  summary: string;
  chunks: number;
  modelId: string;
  method: SummarizeMethod;
}> {
  const { signal, onProgress, allowXenova = false, heuristicOnly = false } = opts;
  throwIfAborted(signal);

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      summary: "",
      chunks: 0,
      modelId: "",
      method: "rules-heuristic",
    };
  }

  if (heuristicOnly) {
    onProgress?.(100, "Outline ready");
    return {
      summary: "",
      chunks: 0,
      modelId: "",
      method: "rules-heuristic",
    };
  }

  // 1. Browser Summarizer API
  onProgress?.(4, "Checking summary options…");
  const browser = await summarizeWithBrowserApi(cleaned, signal, onProgress);
  if (browser?.summary) {
    return {
      summary: browser.summary,
      chunks: browser.chunks,
      modelId: "browser-summarizer",
      method: "browser-summarizer",
    };
  }

  // 2. Opt-in Xenova only
  if (allowXenova) {
    const xen = await summarizeWithXenova(cleaned, signal, onProgress);
    return {
      ...xen,
      method: "xenova-distilbart",
    };
  }

  // 3. No download — caller should show localOutline
  onProgress?.(100, "Outline ready");
  return {
    summary: "",
    chunks: 0,
    modelId: "",
    method: "rules-heuristic",
  };
}

export async function probeSummarizeEngine(): Promise<{
  browserSummarizer: boolean;
  label: string;
}> {
  const browserSummarizer = await isSummarizerUsable();
  return {
    browserSummarizer,
    label: browserSummarizer
      ? "Private · on your device"
      : "Private · on your device",
  };
}
