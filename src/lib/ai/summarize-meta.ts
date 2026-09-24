/**
 * Lightweight summarize constants + heuristic outline.
 * Safe to import from UI without pulling @xenova/transformers.
 */

export const SUMMARIZE_MODEL_ID = "Xenova/distilbart-cnn-6-6";
export const SUMMARIZE_MODEL_SIZE_LABEL = "~230 MB (opt-in, cached in browser)";

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
    const score =
      words.filter((w) => w.length > 5).length + (s.length > 120 ? 1 : 0);
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

/** Human-readable badge for a completed summarize run. */
export function summarizeMethodBadge(method: SummarizeMethod): string {
  switch (method) {
    case "browser-summarizer":
      return "On-device browser AI · private";
    case "xenova-distilbart":
      return "Optional offline model · private";
    case "rules-heuristic":
    default:
      return "Quick outline · private · on your device";
  }
}
