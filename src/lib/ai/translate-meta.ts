/**
 * Lightweight translate constants — no @xenova/transformers import.
 */

export type TranslateMethod = "browser" | "on-device" | "glossary";

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
  {
    id: "en",
    label: "English (from Hindi)",
    pairFromEn: "hi-en",
    sourceHint: "hi",
  },
] as const;

export function resolveMarianPair(
  sourceLang: string,
  targetLang: string
): { key: string; modelId: string; sizeLabel: string } | null {
  const key = `${sourceLang}-${targetLang}`;
  const m = MARIAN_MODELS[key];
  if (!m) return null;
  return { key, modelId: m.modelId, sizeLabel: m.sizeLabel };
}

/** Human-readable badge for a completed translate run. */
export function translateMethodBadge(method: TranslateMethod): string {
  switch (method) {
    case "browser":
      return "On-device browser AI · private";
    case "on-device":
      return "Offline language pack · private";
    case "glossary":
    default:
      return "Basic glossary · not AI · on your device";
  }
}
