/**
 * Smart redaction pattern finders — email, phone, Aadhaar-like, PAN-like, card-ish.
 * Client-side only; preview before hard wipe.
 */
import { ensurePdfWorker, loadPdfDocument } from "./loader";

export type RedactPatternId =
  | "email"
  | "phone"
  | "aadhaar"
  | "pan"
  | "credit-card";

export type PatternHit = {
  id: string;
  pattern: RedactPatternId;
  label: string;
  text: string;
  pageIndex: number;
  /** Top-left origin page points (same as redactRegions) */
  x: number;
  y: number;
  w: number;
  h: number;
};

export const REDACT_PATTERNS: {
  id: RedactPatternId;
  label: string;
  hint: string;
}[] = [
  { id: "email", label: "Email", hint: "name@domain.com" },
  { id: "phone", label: "Phone", hint: "+91 / US-style numbers" },
  {
    id: "aadhaar",
    label: "Aadhaar-like",
    hint: "12-digit groups (XXXX XXXX XXXX)",
  },
  { id: "pan", label: "PAN-like", hint: "ABCDE1234F style" },
  {
    id: "credit-card",
    label: "Card-ish",
    hint: "13–19 digits · Luhn check",
  },
];

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

type Span = {
  pageIndex: number;
  globalStart: number;
  globalEnd: number;
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function buildPageSpans(
  pageIndex: number,
  items: { str?: string; transform?: number[]; width?: number }[],
  pageHeight: number,
  globalOffset: number
): { text: string; spans: Span[]; nextOffset: number } {
  const spans: Span[] = [];
  let text = "";
  let offset = globalOffset;

  for (const item of items) {
    if (!item.str) continue;
    const str = item.str;
    const tx = item.transform ?? [1, 0, 0, 1, 0, 0];
    const fontHeight =
      Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 12;
    const itemW = item.width ?? str.length * fontHeight * 0.5;
    const x = tx[4];
    const yFromBottom = tx[5];
    const y = pageHeight - yFromBottom - fontHeight;

    if (text.length > 0 && !/\s$/.test(text) && !/^\s/.test(str)) {
      text += " ";
      offset += 1;
    }

    const start = offset;
    text += str;
    offset += str.length;
    spans.push({
      pageIndex,
      globalStart: start,
      globalEnd: offset,
      str,
      x,
      y,
      w: Math.max(itemW, fontHeight * 0.35),
      h: fontHeight * 1.15,
    });
  }

  return { text, spans, nextOffset: offset };
}

function rectsForRange(
  spans: Span[],
  start: number,
  end: number
): { pageIndex: number; x: number; y: number; w: number; h: number }[] {
  const overlapping = spans.filter(
    (s) => s.globalEnd > start && s.globalStart < end
  );
  if (!overlapping.length) return [];

  const byPage = new Map<number, typeof overlapping>();
  for (const s of overlapping) {
    const list = byPage.get(s.pageIndex) || [];
    list.push(s);
    byPage.set(s.pageIndex, list);
  }

  const rects: { pageIndex: number; x: number; y: number; w: number; h: number }[] =
    [];
  for (const [pageIndex, list] of byPage) {
    // Merge into one bbox per page for the match (simple + reliable wipe)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of list) {
      const fracStart = Math.max(0, (start - s.globalStart) / Math.max(1, s.str.length));
      const fracEnd = Math.min(1, (end - s.globalStart) / Math.max(1, s.str.length));
      const x0 = s.x + fracStart * s.w;
      const x1 = s.x + fracEnd * s.w;
      minX = Math.min(minX, x0);
      maxX = Math.max(maxX, x1);
      minY = Math.min(minY, s.y);
      maxY = Math.max(maxY, s.y + s.h);
    }
    const pad = 1.5;
    rects.push({
      pageIndex,
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      w: Math.max(4, maxX - minX + pad * 2),
      h: Math.max(4, maxY - minY + pad * 2),
    });
  }
  return rects;
}

type Finder = (haystack: string) => { start: number; end: number; text: string }[];

const FINDERS: Record<RedactPatternId, Finder> = {
  email(haystack) {
    const re =
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+/g;
    const out: { start: number; end: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack))) {
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return out;
  },
  phone(haystack) {
    const re =
      /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}(?:[\s-]?\d{2,5})?/g;
    const out: { start: number; end: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack))) {
      const raw = m[0];
      const digits = raw.replace(/\D/g, "");
      // Avoid Aadhaar / card length collisions; need phone-like length
      if (digits.length < 10 || digits.length > 15) continue;
      if (digits.length === 12 && !raw.includes("+") && !/[()]/.test(raw)) {
        // Likely Aadhaar — leave to aadhaar finder
        continue;
      }
      if (digits.length >= 13 && digits.length <= 19) continue;
      out.push({ start: m.index, end: m.index + raw.length, text: raw.trim() });
    }
    return out;
  },
  aadhaar(haystack) {
    const re = /\b(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})\b/g;
    const out: { start: number; end: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack))) {
      const digits = m[1] + m[2] + m[3];
      // Aadhaar does not start with 0 or 1
      if (digits[0] === "0" || digits[0] === "1") continue;
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return out;
  },
  pan(haystack) {
    const re = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/gi;
    const out: { start: number; end: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack))) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0].toUpperCase(),
      });
    }
    return out;
  },
  "credit-card"(haystack) {
    const re = /\b(?:\d[ -]*?){13,19}\b/g;
    const out: { start: number; end: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack))) {
      const raw = m[0];
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) continue;
      if (!luhnOk(digits)) continue;
      out.push({ start: m.index, end: m.index + raw.length, text: raw.trim() });
    }
    return out;
  },
};

export async function findRedactPatterns(
  source: ArrayBuffer,
  patterns: RedactPatternId[]
): Promise<PatternHit[]> {
  if (!patterns.length) return [];
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const allSpans: Span[] = [];
  let fullText = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: true });
    const viewport = page.getViewport({ scale: 1 });
    const items: { str: string; transform: number[]; width?: number }[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str) continue;
      items.push({
        str: it.str as string,
        transform: (it as { transform: number[] }).transform,
        width: (it as { width?: number }).width,
      });
    }

    const pageBreak = fullText.length > 0 ? 1 : 0;
    if (pageBreak) fullText += "\n";
    const built = buildPageSpans(
      i - 1,
      items,
      viewport.height,
      fullText.length
    );
    fullText += built.text;
    allSpans.push(...built.spans);
    page.cleanup();
  }
  doc.destroy();

  const hits: PatternHit[] = [];
  let seq = 0;
  for (const pid of patterns) {
    const finder = FINDERS[pid];
    const meta = REDACT_PATTERNS.find((p) => p.id === pid)!;
    for (const m of finder(fullText)) {
      const rects = rectsForRange(allSpans, m.start, m.end);
      for (const r of rects) {
        seq += 1;
        hits.push({
          id: `hit-${seq}`,
          pattern: pid,
          label: meta.label,
          text: m.text,
          pageIndex: r.pageIndex,
          x: r.x,
          y: r.y,
          w: r.w,
          h: r.h,
        });
      }
    }
  }

  // Dedupe near-identical rects
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.pageIndex}:${Math.round(h.x)}:${Math.round(h.y)}:${h.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
