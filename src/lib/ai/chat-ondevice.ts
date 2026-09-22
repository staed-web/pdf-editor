/**
 * Ask PDF — browser built-in AI first (Chrome Prompt API / LanguageModel),
 * then honest keyword/TF extractive fallback. NO Xenova MiniLM/DistilBERT.
 */

import {
  createLanguageModelSession,
  isLanguageModelUsable,
  throwIfAborted,
} from "./chrome-ai";

export const CHAT_MAX_PAGES = 80;
export const CHAT_MAX_CHARS = 350_000;
export const CHAT_CHUNK_CHARS = 900;
export const CHAT_CHUNK_OVERLAP = 80;
export const CHAT_TOP_K = 6;
/** Soft context budget for Prompt API prompts (~chars). */
export const CHAT_CONTEXT_CHARS = 10_000;
/** Pages with fewer chars than this are candidates for OCR. */
export const SCANT_PAGE_CHARS = 40;

/** @deprecated Removed — no Xenova chat downloads. Kept so old imports don't break builds mid-edit. */
export const EMBED_MODEL_ID = "";
/** @deprecated Removed — no Xenova chat downloads. */
export const QA_MODEL_ID = "";
/** @deprecated No chat model download on this route. */
export const CHAT_MODELS_SIZE_LABEL = "no download (browser AI or basic search)";

export type PageText = { page: number; text: string };

export type DocChunk = {
  id: number;
  page: number;
  text: string;
};

export type ChatIndex = {
  chunks: DocChunk[];
  pageCount: number;
  charCount: number;
  ocrPages: number[];
  truncated: boolean;
  /** Always keyword — never MiniLM. */
  retrieval: "keyword";
};

export type Citation = {
  page: number;
  snippet: string;
  score: number;
};

export type ChatAnswerMethod = "browser-prompt" | "basic-search";

export type ChatAnswer = {
  answer: string;
  citations: Citation[];
  confidence: number;
  method: ChatAnswerMethod;
  /** Human-readable engine label for badges/transcript. */
  engineLabel: string;
};

export type ChatProgress = (pct: number, label: string) => void;

const STOP = new Set([
  "a","an","the","and","or","but","if","in","on","at","to","for","of","as",
  "is","are","was","were","be","been","being","it","this","that","these",
  "those","with","from","by","into","about","what","which","who","whom",
  "how","when","where","why","do","does","did","can","could","should",
  "would","will","shall","may","might","must","have","has","had","not",
  "no","yes","you","your","we","our","they","their","i","me","my",
]);

function snippet(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f\u0900-\u097f]+/i)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
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
    let i = 0;
    while (i < cleaned.length) {
      let end = Math.min(i + maxChars, cleaned.length);
      if (end < cleaned.length) {
        const slice = cleaned.slice(i, end);
        const lastStop = Math.max(
          slice.lastIndexOf(". "),
          slice.lastIndexOf("? "),
          slice.lastIndexOf("! "),
          slice.lastIndexOf(" ")
        );
        if (lastStop > maxChars * 0.4) end = i + lastStop + 1;
      }
      const piece = cleaned.slice(i, end).trim();
      if (piece) out.push({ page: p.page, text: piece });
      if (end >= cleaned.length) break;
      i = Math.max(end - overlap, i + 1);
    }
  }
  return out;
}

/**
 * OCR only pages with scant extractable text (lazy Tesseract).
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

  onProgress?.(6, "Rendering pages for OCR…");
  const rendered = await renderPdfPages(source, { format: "png", scale: 1.5 });
  throwIfAborted(signal);

  const worker = await tesseract.createWorker(lang, 1, {
    logger: () => {},
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

function scoreChunk(queryTokens: string[], chunkText: string): number {
  if (queryTokens.length === 0) return 0;
  const tf = termFreq(tokenize(chunkText));
  let score = 0;
  const unique = new Set(queryTokens);
  for (const t of unique) {
    const f = tf.get(t) || 0;
    if (f > 0) score += 1 + Math.log(1 + f);
  }
  // Phrase bonus: consecutive query words
  const lower = chunkText.toLowerCase();
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
    if (lower.includes(bigram)) score += 1.5;
  }
  return score;
}

export function retrieveTopChunks(
  index: ChatIndex,
  question: string,
  topK = CHAT_TOP_K
): { chunk: DocChunk; score: number }[] {
  const qTokens = tokenize(question);
  const scored = index.chunks
    .map((c) => ({ chunk: c, score: scoreChunk(qTokens, c.text) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length >= topK) return scored.slice(0, topK);

  // If keyword miss, fall back to first pages / window around middle
  if (scored.length === 0) {
    return index.chunks.slice(0, topK).map((c, i) => ({
      chunk: c,
      score: 0.01 * (topK - i),
    }));
  }
  return scored.slice(0, topK);
}

function buildContextWindow(
  scored: { chunk: DocChunk; score: number }[],
  budget = CHAT_CONTEXT_CHARS
): { context: string; citations: Citation[] } {
  const citations: Citation[] = [];
  const parts: string[] = [];
  let used = 0;
  const seenPages = new Set<number>();

  for (const s of scored) {
    const header = `[Page ${s.chunk.page}] `;
    const room = budget - used - header.length;
    if (room < 80) break;
    const body =
      s.chunk.text.length > room
        ? s.chunk.text.slice(0, room - 1) + "…"
        : s.chunk.text;
    parts.push(header + body);
    used += header.length + body.length + 2;
    if (!seenPages.has(s.chunk.page) || citations.length < 5) {
      citations.push({
        page: s.chunk.page,
        snippet: snippet(s.chunk.text),
        score: s.score,
      });
      seenPages.add(s.chunk.page);
    }
  }

  // Dedupe citations by page (keep best score)
  const byPage = new Map<number, Citation>();
  for (const c of citations) {
    const prev = byPage.get(c.page);
    if (!prev || c.score > prev.score) byPage.set(c.page, c);
  }

  return {
    context: parts.join("\n\n"),
    citations: Array.from(byPage.values()).slice(0, 5),
  };
}

/**
 * Build a lightweight keyword index (no embeddings, no model download).
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

  onProgress?.(40, "Building keyword index (no model download)…");
  const rawChunks = chunkPages(pages);
  if (rawChunks.length === 0) {
    throw new Error(
      "Little or no extractable text. Enable OCR for scant pages, or run the OCR tool first if this is a scan."
    );
  }

  const chunks: DocChunk[] = rawChunks.map((c, i) => ({
    id: i,
    page: c.page,
    text: c.text,
  }));

  onProgress?.(70, "Index ready");
  return {
    chunks,
    pageCount: pages.length,
    charCount,
    ocrPages,
    truncated,
    retrieval: "keyword",
  };
}

function basicSearchAnswer(
  scored: { chunk: DocChunk; score: number }[],
  citations: Citation[]
): ChatAnswer {
  const lines = scored.slice(0, 4).map(
    (s) => `(p.${s.chunk.page}) ${snippet(s.chunk.text, 260)}`
  );
  return {
    answer: lines.length
      ? `Basic search (no browser AI) — closest passages:\n\n${lines.join("\n\n")}`
      : "No matching passages found. Try rephrasing, or OCR if this is a scan.",
    citations,
    confidence: scored[0]?.score ? Math.min(1, scored[0].score / 8) : 0,
    method: "basic-search",
    engineLabel: "Basic search (no browser AI)",
  };
}

/**
 * Retrieve relevant pages via keyword/TF, then answer with Chrome Prompt API
 * when available. Otherwise honest extractive snippet fallback — never Xenova.
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
  if (!q) throw new Error("Enter a question");
  if (index.chunks.length === 0) {
    throw new Error("No indexed chunks — load a PDF first");
  }

  onProgress?.(75, "Finding relevant pages…");
  const scored = retrieveTopChunks(index, q);
  const { context, citations } = buildContextWindow(scored);

  const usable = await isLanguageModelUsable();
  if (!usable) {
    onProgress?.(100, "Basic search ready");
    return basicSearchAnswer(scored, citations);
  }

  onProgress?.(80, "Using your browser’s built-in on-device AI…");
  const session = await createLanguageModelSession({
    signal,
    onProgress,
    systemPrompt:
      "You answer questions using ONLY the provided PDF excerpts. " +
      "Cite page numbers like (p.N). If the excerpts do not contain the answer, say so clearly. " +
      "Be concise. Do not invent facts outside the excerpts.",
  });

  if (!session) {
    onProgress?.(100, "Basic search ready");
    return basicSearchAnswer(scored, citations);
  }

  try {
    throwIfAborted(signal);
    onProgress?.(90, "Prompting browser AI with page context…");
    const prompt = [
      "PDF excerpts:",
      context || "(no excerpts)",
      "",
      `Question: ${q}`,
      "",
      "Answer based only on the excerpts. Include page citations like (p.3).",
    ].join("\n");

    const raw = (await session.prompt(prompt, { signal })).trim();
    onProgress?.(100, "Answer ready");
    return {
      answer:
        raw ||
        "The browser AI returned an empty answer. Try rephrasing your question.",
      citations,
      confidence: scored[0]?.score ? Math.min(1, 0.5 + scored[0].score / 10) : 0.5,
      method: "browser-prompt",
      engineLabel: "Uses your browser’s built-in on-device AI",
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    onProgress?.(100, "Basic search ready");
    return basicSearchAnswer(scored, citations);
  } finally {
    try {
      session.destroy?.();
    } catch {
      /* ignore */
    }
  }
}

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

/** Probe Prompt API without downloading models when possible. */
export async function probeChatEngine(): Promise<{
  browserAi: boolean;
  label: string;
}> {
  const browserAi = await isLanguageModelUsable();
  return {
    browserAi,
    label: browserAi
      ? "Uses your browser’s built-in on-device AI"
      : "Basic search (no browser AI)",
  };
}
