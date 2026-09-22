/**
 * On-device PDF summarization via transformers.js (DistilBART).
 * Map-reduce over chunks for long documents. Heuristic outline stays available
 * for weak devices (no model download).
 */

import {
  chunkText,
  loadTransformers,
  throwIfAborted,
  type ProgressCb,
} from "./transformers-runtime";

/** Quantized DistilBART CNN — English abstractive summarization (~230 MB first download). */
export const SUMMARIZE_MODEL_ID = "Xenova/distilbart-cnn-6-6";
export const SUMMARIZE_MODEL_SIZE_LABEL = "~230 MB (one-time, cached in browser)";

export type SummarizeProgress = (pct: number, label: string) => void;

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

type Summarizer = (input: string, opts?: Record<string, unknown>) => Promise<
  | { summary_text: string }
  | { summary_text: string }[]
>;

let summarizerPromise: Promise<Summarizer> | null = null;
let summarizerModel: string | null = null;

async function getSummarizer(
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<Summarizer> {
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
  }) as Promise<Summarizer>;
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

export async function summarizeOnDevice(
  text: string,
  opts: {
    signal?: AbortSignal;
    onProgress?: SummarizeProgress;
  } = {}
): Promise<{ summary: string; chunks: number; modelId: string }> {
  const { signal, onProgress } = opts;
  throwIfAborted(signal);

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { summary: "", chunks: 0, modelId: SUMMARIZE_MODEL_ID };
  }

  onProgress?.(2, `Preparing on-device model (${SUMMARIZE_MODEL_SIZE_LABEL})…`);

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

  const summarizer = await getSummarizer(downloadPct, signal);
  throwIfAborted(signal);
  onProgress?.(45, "Chunking document…");

  const chunks = chunkText(cleaned, 2800, 180);
  const partials: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    throwIfAborted(signal);
    const base = 45 + Math.round((i / Math.max(chunks.length, 1)) * 45);
    onProgress?.(
      base,
      `Summarizing chunk ${i + 1}/${chunks.length} (on-device)…`
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
    // Second pass if still long
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
