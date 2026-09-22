/**
 * Free on-device / browser translation priority:
 * 1. Chrome Translator API (when available)
 * 2. transformers.js Marian MT (EN↔HI prioritized for IN users)
 * 3. Offline glossary stub — labeled, not real MT
 */

import {
  chunkText,
  loadTransformers,
  throwIfAborted,
  type ProgressCb,
} from "./transformers-runtime";

export type TranslateProgress = (pct: number, label: string) => void;

export type TranslateMethod =
  | "browser"
  | "on-device"
  | "glossary";

/** Marian Opus-MT models hosted as Xenova ONNX (quantized ≈ 70–90 MB each). */
export const MARIAN_MODELS: Record<
  string,
  { modelId: string; sizeLabel: string; label: string }
> = {
  "en-es": {
    modelId: "Xenova/opus-mt-en-es",
    sizeLabel: "~75 MB",
    label: "English → Spanish",
  },
  "en-fr": {
    modelId: "Xenova/opus-mt-en-fr",
    sizeLabel: "~75 MB",
    label: "English → French",
  },
  "en-de": {
    modelId: "Xenova/opus-mt-en-de",
    sizeLabel: "~75 MB",
    label: "English → German",
  },
  "en-hi": {
    modelId: "Xenova/opus-mt-en-hi",
    sizeLabel: "~80 MB",
    label: "English → Hindi",
  },
  "hi-en": {
    modelId: "Xenova/opus-mt-hi-en",
    sizeLabel: "~80 MB",
    label: "Hindi → English",
  },
  "en-ja": {
    modelId: "Xenova/opus-mt-en-jap",
    sizeLabel: "~80 MB",
    label: "English → Japanese",
  },
};

export const TRANSLATE_LANGS = [
  { id: "es", label: "Spanish", pairFromEn: "en-es" },
  { id: "fr", label: "French", pairFromEn: "en-fr" },
  { id: "de", label: "German", pairFromEn: "en-de" },
  { id: "hi", label: "Hindi", pairFromEn: "en-hi" },
  { id: "ja", label: "Japanese", pairFromEn: "en-ja" },
  { id: "en", label: "English (from Hindi)", pairFromEn: "hi-en", sourceHint: "hi" },
] as const;

type TranslatorFn = (
  texts: string | string[],
  opts?: Record<string, unknown>
) => Promise<{ translation_text: string } | { translation_text: string }[]>;

const pipeCache = new Map<string, Promise<TranslatorFn>>();

async function getMarian(
  modelId: string,
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<TranslatorFn> {
  throwIfAborted(signal);
  let p = pipeCache.get(modelId);
  if (!p) {
    const { pipeline } = await loadTransformers();
    p = pipeline("translation", modelId, {
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
    }) as Promise<TranslatorFn>;
    pipeCache.set(modelId, p);
    try {
      await p;
    } catch (e) {
      pipeCache.delete(modelId);
      throw e;
    }
  }
  return p;
}

function unwrapTranslation(
  out: { translation_text: string } | { translation_text: string }[]
): string {
  if (Array.isArray(out)) {
    return out.map((o) => o.translation_text).join(" ").trim();
  }
  return (out.translation_text || "").trim();
}

/** Chrome / Edge experimental Translator API */
async function tryBrowserTranslator(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: TranslateProgress,
  signal?: AbortSignal
): Promise<string | null> {
  throwIfAborted(signal);
  try {
    // @ts-expect-error experimental Translator API
    if (typeof Translator === "undefined") return null;
    onProgress?.(5, "Translating on your device…");
    // @ts-expect-error experimental
    const availability = await Translator.availability?.({
      sourceLanguage,
      targetLanguage,
    });
    if (
      availability === "unavailable" ||
      availability === "no" ||
      availability === false
    ) {
      return null;
    }
    // @ts-expect-error experimental
    const translator = await Translator.create({
      sourceLanguage,
      targetLanguage,
      monitor(m: EventTarget) {
        m.addEventListener("downloadprogress", ((e: Event) => {
          const ev = e as unknown as { loaded?: number; total?: number };
          if (ev.total && ev.loaded != null) {
            const pct = Math.round((ev.loaded / ev.total) * 35) + 5;
            onProgress?.(pct, "Downloading browser language pack…");
          }
        }) as EventListener);
      },
    });
    throwIfAborted(signal);
    // Translate in chunks to avoid hard limits
    const parts = chunkText(text, 3500, 0);
    const outs: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      throwIfAborted(signal);
      onProgress?.(
        40 + Math.round((i / Math.max(parts.length, 1)) * 55),
        `Browser translate ${i + 1}/${parts.length}…`
      );
      outs.push(await translator.translate(parts[i]));
    }
    onProgress?.(100, "Translation ready");
    return outs.join("\n\n");
  } catch {
    return null;
  }
}

function glossaryStub(text: string, targetLang: string): string {
  const glossary: Record<string, Record<string, string>> = {
    es: {
      the: "el/la",
      and: "y",
      of: "de",
      to: "a",
      document: "documento",
      page: "página",
      confidential: "confidencial",
      agreement: "acuerdo",
      date: "fecha",
      signature: "firma",
    },
    fr: {
      the: "le/la",
      and: "et",
      of: "de",
      to: "à",
      document: "document",
      page: "page",
      confidential: "confidentiel",
      agreement: "accord",
      date: "date",
      signature: "signature",
    },
    de: {
      the: "der/die/das",
      and: "und",
      of: "von",
      to: "zu",
      document: "Dokument",
      page: "Seite",
      confidential: "vertraulich",
      agreement: "Vereinbarung",
      date: "Datum",
      signature: "Unterschrift",
    },
    hi: {
      the: "द",
      and: "और",
      of: "का",
      to: "को",
      document: "दस्तावेज़",
      page: "पृष्ठ",
      confidential: "गोपनीय",
      agreement: "समझौता",
      date: "तारीख",
      signature: "हस्ताक्षर",
    },
  };
  const g = glossary[targetLang] || glossary.es;
  const out = text
    .split(/(\b)/)
    .map((tok) => {
      const low = tok.toLowerCase();
      if (g[low]) {
        const rep = g[low];
        return tok[0] === tok[0]?.toUpperCase()
          ? rep.charAt(0).toUpperCase() + rep.slice(1)
          : rep;
      }
      return tok;
    })
    .join("");
  return `[Basic glossary → ${targetLang}]\n\n${out}`;
}

export function resolveMarianPair(
  sourceLang: string,
  targetLang: string
): { key: string; modelId: string; sizeLabel: string } | null {
  const key = `${sourceLang}-${targetLang}`;
  const m = MARIAN_MODELS[key];
  if (!m) return null;
  return { key, modelId: m.modelId, sizeLabel: m.sizeLabel };
}

export async function translateOnDevice(
  text: string,
  opts: {
    sourceLang?: string;
    targetLang: string;
    /** Force skip browser API / force glossary for testing */
    prefer?: "auto" | "browser" | "marian" | "glossary";
    signal?: AbortSignal;
    onProgress?: TranslateProgress;
  }
): Promise<{ text: string; method: TranslateMethod; modelId?: string }> {
  const sourceLang = opts.sourceLang || "en";
  const targetLang = opts.targetLang;
  const prefer = opts.prefer || "auto";
  const { signal, onProgress } = opts;
  throwIfAborted(signal);

  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) {
    return { text: "", method: "glossary" };
  }

  // 1. Browser Translator API
  if (prefer === "auto" || prefer === "browser") {
    const browserOut = await tryBrowserTranslator(
      cleaned,
      sourceLang,
      targetLang,
      onProgress,
      signal
    );
    if (browserOut != null) {
      return {
        text: browserOut,
        method: "browser",
      };
    }
    if (prefer === "browser") {
      throw new Error("Built-in translator unavailable");
    }
  }

  // 2. Marian on-device
  if (prefer === "auto" || prefer === "marian") {
    const pair = resolveMarianPair(sourceLang, targetLang);
    if (pair) {
      onProgress?.(
        3,
        `Loading on-device model ${pair.modelId} (${pair.sizeLabel}, cached after first run)…`
      );
      const downloadPct: ProgressCb = (info) => {
        throwIfAborted(signal);
        if (typeof info.progress === "number") {
          onProgress?.(
            Math.min(42, Math.round(info.progress * 0.42)),
            info.file
              ? `Downloading ${info.file}… ${Math.round(info.progress)}%`
              : `Loading language pack… ${Math.round(info.progress)}%`
          );
        }
      };
      const translator = await getMarian(pair.modelId, downloadPct, signal);
      throwIfAborted(signal);
      const parts = chunkText(cleaned, 800, 0);
      const outs: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        throwIfAborted(signal);
        onProgress?.(
          45 + Math.round((i / Math.max(parts.length, 1)) * 50),
          `On-device translate ${i + 1}/${parts.length}…`
        );
        outs.push(unwrapTranslation(await translator(parts[i])));
      }
      onProgress?.(100, "Translation ready");
      return {
        text: outs.join(" "),
        method: "on-device",
        modelId: pair.modelId,
      };
    }
  }

  // 3. Glossary stub — clearly not real MT
  onProgress?.(90, "Falling back to offline glossary (not real MT)…");
  const stub = glossaryStub(cleaned, targetLang);
  onProgress?.(100, "Glossary stub ready");
  return { text: stub, method: "glossary" };
}

/** Keep for any older callers; now delegates to translateOnDevice. */
export async function translateTextLocal(
  text: string,
  targetLang: string
): Promise<{ text: string; method: string }> {
  const out = await translateOnDevice(text, { targetLang, sourceLang: "en" });
  return { text: out.text, method: out.method };
}
