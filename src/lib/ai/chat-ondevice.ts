/**
 * On-device PDF chat via transformers.js RAG:
 * MiniLM embeddings + DistilBERT SQuAD extractive QA.
 * PDF/text never leave the device on the default path.
 */

import {
  chunkText,
  loadTransformers,
  throwIfAborted,
  type ProgressCb,
} from "./transformers-runtime";

/** Sentence embeddings (~23 MB quantized). */
export const EMBED_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
/** Extractive QA grounded on retrieved context (~65 MB quantized). */
export const QA_MODEL_ID = "Xenova/distilbert-base-uncased-distilled-squad";

export const CHAT_MODELS_SIZE_LABEL =
  "~90 MB total (embed + QA, one-time, cached in browser)";

/** Soft caps so weak devices stay responsive. */
export const CHAT_MAX_PAGES = 80;
export const CHAT_MAX_CHARS = 350_000;
export const CHAT_CHUNK_CHARS = 480;
export const CHAT_CHUNK_OVERLAP = 60;
export const CHAT_TOP_K = 5;
/** Pages with fewer chars than this are candidates for OCR. */
export const SCANT_PAGE_CHARS = 40;

export type PageText = { page: number; text: string };

export type DocChunk = {
  id: number;
  page: number;
  text: string;
  embedding: Float32Array;
};

export type ChatIndex = {
  chunks: DocChunk[];
  pageCount: number;
  charCount: number;
  ocrPages: number[];
  truncated: boolean;
  embedModelId: string;
};

export type Citation = {
  page: number;
  snippet: string;
  score: number;
};

export type ChatAnswer = {
  answer: string;
  citations: Citation[];
  confidence: number;
  method: "qa" | "retrieval-fallback";
  modelIds: { embed: string; qa: string };
};

export type ChatProgress = (pct: number, label: string) => void;

type Embedder = (
  texts: string | string[],
  opts?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array | number[]; dims: number[]; tolist?: () => number[][] }>;

type QaFn = (
  question: string,
  context: string
) => Promise<{ answer: string; score: number; start?: number; end?: number }>;

let embedderPromise: Promise<Embedder> | null = null;
let qaPromise: Promise<QaFn> | null = null;

function progressBridge(
  onProgress: ProgressCb | undefined,
  signal: AbortSignal | undefined
): ProgressCb {
  return (info) => {
    if (signal?.aborted) return;
    onProgress?.(info);
  };
}

async function getEmbedder(
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<Embedder> {
  throwIfAborted(signal);
  if (embedderPromise) return embedderPromise;
  const { pipeline } = await loadTransformers();
  embedderPromise = pipeline("feature-extraction", EMBED_MODEL_ID, {
    quantized: true,
    progress_callback: progressBridge(onProgress, signal),
  }) as Promise<Embedder>;
  try {
    return await embedderPromise;
  } catch (e) {
    embedderPromise = null;
    throw e;
  }
}

async function getQa(
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<QaFn> {
  throwIfAborted(signal);
  if (qaPromise) return qaPromise;
  const { pipeline } = await loadTransformers();
  qaPromise = pipeline("question-answering", QA_MODEL_ID, {
    quantized: true,
    progress_callback: progressBridge(onProgress, signal),
  }) as Promise<QaFn>;
  try {
    return await qaPromise;
  } catch (e) {
    qaPromise = null;
    throw e;
  }
}

function toFloat32(data: Float32Array | number[]): Float32Array {
  return data instanceof Float32Array ? data : Float32Array.from(data);
}

function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // embeddings are L2-normalized
}

function snippet(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/** Split page texts into overlapping chunks that retain page numbers. */
export function chunkPages(
  pages: PageText[],
  maxChars = CHAT_CHUNK_CHARS,
  overlap = CHAT_CHUNK_OVERLAP
): { page: number; text: string }[] {
  const out: { page: number; text: string }[] = [];
  for (const p of pages) {
    const cleaned = (p.text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    if (cleaned.length <= maxChars) {
      out.push({ page: p.page, text: cleaned });
      continue;
    }
    for (const c of chunkText(cleaned, maxChars, overlap)) {
      out.push({ page: p.page, text: c });
    }
  }
  return out;
}

/**
 * OCR only pages with scant extractable text (lazy Tesseract).
 * Reuses renderPdfPages + tesseract.js; does not touch the dedicated OCR tool.
 */
export async function ocrScantPages(
  source: ArrayBuffer,
  pages: PageText[],
  opts: {
    signal?: AbortSignal;
    onProgress?: ChatProgress;
    lang?: string;
  } = {}
): Promise<{ pages: PageText[]; ocrPages: number[] }> {
  const { signal, onProgress, lang = "eng" } = opts;
  throwIfAborted(signal);

  const scant = pages.filter(
    (p) => (p.text || "").replace(/\s+/g, "").length < SCANT_PAGE_CHARS
  );
  if (scant.length === 0) {
    return { pages, ocrPages: [] };
  }

  onProgress?.(4, `OCR ${scant.length} scant page(s) (on-device)…`);
  const { renderPdfPages } = await import("@/lib/pdf/ops");
  const tesseract = await import("tesseract.js");
  throwIfAborted(signal);

  // Render full doc once (same path as OCR tool); only recognize scant pages.
  onProgress?.(6, "Rendering pages for OCR…");
  const rendered = await renderPdfPages(source, { format: "png", scale: 1.5 });
  throwIfAborted(signal);

  const worker = await tesseract.createWorker(lang, 1, {
    logger: () => {
      /* keep quiet; we drive progress by page */
    },
  });

  const byPage = new Map(pages.map((p) => [p.page, { ...p }]));
  const ocrPages: number[] = [];

  try {
    for (let i = 0; i < scant.length; i++) {
      throwIfAborted(signal);
      const target = scant[i];
      const idx = target.page - 1;
      if (idx < 0 || idx >= rendered.length) continue;
      onProgress?.(
        8 + Math.round((i / scant.length) * 18),
        `OCR page ${target.page} (${i + 1}/${scant.length})…`
      );
      const { data } = await worker.recognize(rendered[idx].blob);
      const text = (data.text || "").replace(/\s+/g, " ").trim();
      if (text.length > (target.text || "").trim().length) {
        byPage.set(target.page, { page: target.page, text });
        ocrPages.push(target.page);
      }
    }
  } finally {
    await worker.terminate();
  }

  const merged = pages.map((p) => byPage.get(p.page) || p);
  return { pages: merged, ocrPages };
}

export function pagesNeedOcr(pages: PageText[]): boolean {
  if (pages.length === 0) return false;
  const scant = pages.filter(
    (p) => (p.text || "").replace(/\s+/g, "").length < SCANT_PAGE_CHARS
  ).length;
  return scant >= Math.max(1, Math.ceil(pages.length * 0.3));
}

async function embedTexts(
  embedder: Embedder,
  texts: string[],
  signal?: AbortSignal
): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  const batchSize = 8;
  for (let i = 0; i < texts.length; i += batchSize) {
    throwIfAborted(signal);
    const batch = texts.slice(i, i + batchSize);
    const tensor = await embedder(batch, { pooling: "mean", normalize: true });
    const dims = tensor.dims;
    // [batch, hidden] or [hidden] for single
    if (dims.length === 1) {
      out.push(toFloat32(tensor.data as Float32Array | number[]));
    } else if (dims.length === 2) {
      const [b, h] = dims;
      const data = toFloat32(tensor.data as Float32Array | number[]);
      for (let j = 0; j < b; j++) {
        out.push(data.slice(j * h, (j + 1) * h));
      }
    } else {
      // fallback: try tolist
      const list = tensor.tolist?.() ?? [];
      for (const row of list) {
        out.push(Float32Array.from(row));
      }
    }
  }
  return out;
}

/**
 * Build an in-memory embedding index for a PDF's page texts.
 * Call once after extract (+ optional OCR); reuse across questions.
 */
export async function buildChatIndex(
  pagesIn: PageText[],
  opts: {
    signal?: AbortSignal;
    onProgress?: ChatProgress;
    sourceForOcr?: ArrayBuffer;
    enableOcr?: boolean;
  } = {}
): Promise<ChatIndex> {
  const { signal, onProgress, sourceForOcr, enableOcr } = opts;
  throwIfAborted(signal);

  let pages = pagesIn.map((p) => ({
    page: p.page,
    text: (p.text || "").replace(/\s+/g, " ").trim(),
  }));
  let ocrPages: number[] = [];
  let truncated = false;

  if (pages.length > CHAT_MAX_PAGES) {
    pages = pages.slice(0, CHAT_MAX_PAGES);
    truncated = true;
  }

  if (enableOcr && sourceForOcr && pagesNeedOcr(pages)) {
    const ocr = await ocrScantPages(sourceForOcr, pages, {
      signal,
      onProgress,
    });
    pages = ocr.pages;
    ocrPages = ocr.ocrPages;
  }

  let charCount = pages.reduce((n, p) => n + p.text.length, 0);
  if (charCount > CHAT_MAX_CHARS) {
    truncated = true;
    let kept = 0;
    const trimmed: PageText[] = [];
    for (const p of pages) {
      if (kept >= CHAT_MAX_CHARS) break;
      const room = CHAT_MAX_CHARS - kept;
      const text = p.text.length > room ? p.text.slice(0, room) : p.text;
      trimmed.push({ page: p.page, text });
      kept += text.length;
    }
    pages = trimmed;
    charCount = kept;
  }

  const rawChunks = chunkPages(pages);
  if (rawChunks.length === 0) {
    throw new Error(
      "Little or no extractable text. Enable OCR for scant pages, or run the OCR tool first if this is a scan."
    );
  }

  onProgress?.(28, `Loading embedding model (${EMBED_MODEL_ID})…`);

  const downloadPct = (info: {
    status: string;
    progress?: number;
    file?: string;
  }) => {
    throwIfAborted(signal);
    if (typeof info.progress === "number") {
      const pct = 28 + Math.min(30, Math.round(info.progress * 0.3));
      onProgress?.(
        pct,
        info.file
          ? `Downloading embed model… ${Math.round(info.progress)}%`
          : `Loading embed model… ${Math.round(info.progress)}%`
      );
    } else if (info.status === "ready" || info.status === "done") {
      onProgress?.(58, "Embed model ready — indexing…");
    } else {
      onProgress?.(30, info.status || "Loading embed model…");
    }
  };

  const embedder = await getEmbedder(downloadPct, signal);
  throwIfAborted(signal);
  onProgress?.(60, `Embedding ${rawChunks.length} chunk(s)…`);

  const vectors = await embedTexts(
    embedder,
    rawChunks.map((c) => c.text),
    signal
  );

  const chunks: DocChunk[] = rawChunks.map((c, i) => ({
    id: i,
    page: c.page,
    text: c.text,
    embedding: vectors[i] || new Float32Array(0),
  }));

  onProgress?.(78, "Index ready");
  return {
    chunks,
    pageCount: pages.length,
    charCount,
    ocrPages,
    truncated,
    embedModelId: EMBED_MODEL_ID,
  };
}

/**
 * Retrieve top chunks and answer with DistilBERT SQuAD (per-chunk, pick best).
 * Falls back to cited retrieval snippets if QA confidence is too low.
 */
export async function answerWithIndex(
  index: ChatIndex,
  question: string,
  opts: {
    signal?: AbortSignal;
    onProgress?: ChatProgress;
  } = {}
): Promise<ChatAnswer> {
  const { signal, onProgress } = opts;
  throwIfAborted(signal);
  const q = question.replace(/\s+/g, " ").trim();
  if (!q) {
    throw new Error("Enter a question");
  }
  if (index.chunks.length === 0) {
    throw new Error("No indexed chunks — load a PDF first");
  }

  onProgress?.(80, "Embedding question…");
  const embedder = await getEmbedder(undefined, signal);
  const [qVec] = await embedTexts(embedder, [q], signal);

  const scored = index.chunks
    .map((c) => ({
      chunk: c,
      score: c.embedding.length ? cosine(qVec, c.embedding) : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CHAT_TOP_K);

  const citations: Citation[] = scored.map((s) => ({
    page: s.chunk.page,
    snippet: snippet(s.chunk.text),
    score: s.score,
  }));

  onProgress?.(84, `Loading QA model (${QA_MODEL_ID})…`);

  const qaDownload = (info: {
    status: string;
    progress?: number;
    file?: string;
  }) => {
    throwIfAborted(signal);
    if (typeof info.progress === "number") {
      const pct = 84 + Math.min(10, Math.round(info.progress * 0.1));
      onProgress?.(
        pct,
        info.file
          ? `Downloading QA model… ${Math.round(info.progress)}%`
          : `Loading QA model… ${Math.round(info.progress)}%`
      );
    }
  };

  const qa = await getQa(qaDownload, signal);
  throwIfAborted(signal);
  onProgress?.(94, "Answering from top passages…");

  let best = { answer: "", score: 0, page: scored[0]?.chunk.page ?? 1 };

  for (let i = 0; i < scored.length; i++) {
    throwIfAborted(signal);
    const { chunk } = scored[i];
    // DistilBERT max ~512 tokens — keep context tight
    const context = chunk.text.slice(0, 1600);
    try {
      const out = await qa(q, context);
      const ans = (out.answer || "").trim();
      const score = typeof out.score === "number" ? out.score : 0;
      if (ans && score >= best.score) {
        best = { answer: ans, score, page: chunk.page };
      }
    } catch {
      /* try next chunk */
    }
  }

  const modelIds = { embed: EMBED_MODEL_ID, qa: QA_MODEL_ID };

  // Confidence floor — below this, prefer cited retrieval over a weak span
  if (best.answer && best.score >= 0.08) {
    // Ensure the winning page is first in citations
    const ordered = [
      ...citations.filter((c) => c.page === best.page),
      ...citations.filter((c) => c.page !== best.page),
    ];
    // Dedupe by page keeping best snippet score
    const byPage = new Map<number, Citation>();
    for (const c of ordered) {
      const prev = byPage.get(c.page);
      if (!prev || c.score > prev.score) byPage.set(c.page, c);
    }
    const cites = Array.from(byPage.values()).slice(0, 5);

    onProgress?.(100, "Answer ready");
    return {
      answer: `${best.answer} (p.${best.page})`,
      citations: cites,
      confidence: best.score,
      method: "qa",
      modelIds,
    };
  }

  // Retrieval fallback — still semantic, still cited
  const lines = scored.map(
    (s) => `(p.${s.chunk.page}) ${snippet(s.chunk.text, 240)}`
  );
  onProgress?.(100, "Passages ready");
  return {
    answer: lines.length
      ? `Closest passages (on-device retrieval; QA confidence was low):\n\n${lines.join("\n\n")}`
      : "No matching passages found. Try rephrasing, or OCR if this is a scan.",
    citations,
    confidence: scored[0]?.score ?? 0,
    method: "retrieval-fallback",
    modelIds,
  };
}

/**
 * One-shot: build index (optional) + answer. Prefer buildChatIndex once then
 * answerWithIndex for multi-turn chat.
 */
export async function chatPdfOnDevice(
  pages: PageText[],
  question: string,
  opts: {
    signal?: AbortSignal;
    onProgress?: ChatProgress;
    sourceForOcr?: ArrayBuffer;
    enableOcr?: boolean;
    index?: ChatIndex;
  } = {}
): Promise<{ answer: ChatAnswer; index: ChatIndex }> {
  const index =
    opts.index ??
    (await buildChatIndex(pages, {
      signal: opts.signal,
      onProgress: opts.onProgress,
      sourceForOcr: opts.sourceForOcr,
      enableOcr: opts.enableOcr,
    }));
  const answer = await answerWithIndex(index, question, {
    signal: opts.signal,
    onProgress: opts.onProgress,
  });
  return { answer, index };
}
