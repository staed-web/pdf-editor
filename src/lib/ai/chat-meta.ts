/**
 * Lightweight Ask-PDF constants — no tesseract / heavy OCR imports.
 */

export const CHAT_MAX_PAGES = 80;
export const CHAT_MAX_CHARS = 350_000;
export const CHAT_CHUNK_CHARS = 900;
export const CHAT_CHUNK_OVERLAP = 80;
export const CHAT_TOP_K = 6;
export const CHAT_CONTEXT_CHARS = 10_000;
export const SCANT_PAGE_CHARS = 40;
export const CHAT_MODELS_SIZE_LABEL = "runs on your device";

export type PageText = { page: number; text: string };

export function pagesNeedOcr(pages: PageText[]): boolean {
  if (pages.length === 0) return false;
  const scant = pages.filter(
    (p) => (p.text || "").replace(/\s+/g, "").length < SCANT_PAGE_CHARS
  ).length;
  return scant >= Math.max(1, Math.ceil(pages.length * 0.3));
}
