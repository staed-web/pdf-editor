/**
 * PDF outline / bookmark extract, edit write-back, and heading generation.
 * 100% browser-local (pdf.js + pdf-lib).
 */
import { PDFName } from "pdf-lib";
import { loadPdf, attachSimpleOutlines } from "./ops";
import { ensurePdfWorker, loadPdfDocument } from "./loader";

export type BookmarkItem = {
  id: string;
  title: string;
  /** 0-based page index */
  pageIndex: number;
  /** Display indent depth (0 = top) */
  depth: number;
};

function uid() {
  return `bm_${Math.random().toString(36).slice(2, 10)}`;
}

/** Read outline via pdf.js (best-effort dest → page). */
export async function extractBookmarks(
  source: ArrayBuffer
): Promise<BookmarkItem[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const out: BookmarkItem[] = [];
  try {
    const root = await doc.getOutline();
    if (root?.length) {
      const walk = async (
        items: NonNullable<Awaited<ReturnType<typeof doc.getOutline>>>,
        depth: number
      ) => {
        if (!items || depth > 6) return;
        for (const item of items) {
          let pageIndex = 0;
          try {
            if (item.dest) {
              const dest =
                typeof item.dest === "string"
                  ? await doc.getDestination(item.dest)
                  : item.dest;
              if (dest) {
                const ref = Array.isArray(dest) ? dest[0] : null;
                if (ref) pageIndex = await doc.getPageIndex(ref);
              }
            }
          } catch {
            /* keep 0 */
          }
          out.push({
            id: uid(),
            title: (item.title || "Untitled").trim() || "Untitled",
            pageIndex: Math.max(0, pageIndex),
            depth,
          });
          if (item.items?.length) await walk(item.items, depth + 1);
        }
      };
      await walk(root, 0);
    }
  } catch {
    /* empty */
  }
  doc.destroy();
  return out;
}

/** Replace document outlines with a flat list (depth ignored on write). */
export async function writeBookmarks(
  source: ArrayBuffer,
  items: { title: string; pageIndex: number }[]
): Promise<Uint8Array> {
  const doc = await loadPdf(source.slice(0));
  const cleaned = items
    .map((it) => ({
      title: it.title.trim() || "Untitled",
      pageIndex: Math.max(0, Math.min(it.pageIndex, doc.getPageCount() - 1)),
    }))
    .filter((it) => it.title);
  try {
    doc.catalog.delete(PDFName.of("Outlines"));
  } catch {
    /* */
  }
  if (cleaned.length) {
    attachSimpleOutlines(doc, cleaned);
  }
  doc.setProducer("InstantPDFEdit");
  doc.setCreator("InstantPDFEdit");
  return doc.save({ useObjectStreams: true });
}

type TextRun = {
  str: string;
  x: number;
  y: number;
  h: number;
  font?: string;
};

/**
 * Best-effort bookmarks from text-layer heading heuristics when a text layer exists.
 * Looks for larger-than-median font runs and numbered section titles.
 */
export async function generateBookmarksFromHeadings(
  source: ArrayBuffer,
  opts?: { maxPerPage?: number; maxTotal?: number }
): Promise<{ items: BookmarkItem[]; note: string }> {
  const maxPerPage = opts?.maxPerPage ?? 4;
  const maxTotal = opts?.maxTotal ?? 80;
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const candidates: BookmarkItem[] = [];
  let pagesWithText = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const runs: TextRun[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str?.trim()) continue;
      const tr = it.transform as number[] | undefined;
      const h =
        typeof (it as { height?: number }).height === "number" &&
        (it as { height: number }).height > 0
          ? (it as { height: number }).height
          : Math.abs(tr?.[3] ?? tr?.[0] ?? 10);
      runs.push({
        str: it.str,
        x: tr?.[4] ?? 0,
        y: tr?.[5] ?? 0,
        h,
        font: (it as { fontName?: string }).fontName,
      });
    }
    page.cleanup();
    if (!runs.length) continue;
    pagesWithText++;

    // Cluster into lines by similar y
    runs.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: { text: string; y: number; maxH: number; boldish: boolean }[] =
      [];
    let cur: TextRun[] = [];
    let curY = runs[0].y;
    const flush = () => {
      if (!cur.length) return;
      const text = cur
        .map((r) => r.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text)
        lines.push({
          text,
          y: curY,
          maxH: Math.max(...cur.map((r) => r.h)),
          boldish: cur.some((r) => /bold|black|heavy|semibold/i.test(r.font || "")),
        });
      cur = [];
    };
    for (const r of runs) {
      if (Math.abs(r.y - curY) > Math.max(2, r.h * 0.35)) {
        flush();
        curY = r.y;
      }
      cur.push(r);
    }
    flush();

    const heights = lines.map((l) => l.maxH).sort((a, b) => a - b);
    const median = heights[Math.floor(heights.length / 2)] || 10;
    const threshold = Math.max(median * 1.25, median + 1.5);

    const pageHits: BookmarkItem[] = [];
    for (const line of lines) {
      if (pageHits.length >= maxPerPage) break;
      const t = line.text;
      if (t.length < 3 || t.length > 120) continue;
      if (/^https?:\/\//i.test(t) || /^page\s+\d+/i.test(t)) continue;
      const numbered = /^(?:\d+[.\)]\s+|[IVXLC]+\.\s+|[A-Z]\.\s+)/.test(t);
      const allCaps =
        t.length >= 4 &&
        t === t.toUpperCase() &&
        /[A-Z]/.test(t) &&
        t.split(/\s+/).length <= 12;
      const large = line.maxH >= threshold;
      if (!(large || numbered || (line.boldish && t.length <= 80) || allCaps))
        continue;
      const depth = numbered
        ? /^\d+\.\d+/.test(t)
          ? 1
          : 0
        : large && line.maxH >= threshold * 1.15
          ? 0
          : 0;
      pageHits.push({
        id: uid(),
        title: t.slice(0, 100),
        pageIndex: i - 1,
        depth,
      });
    }
    candidates.push(...pageHits);
    if (candidates.length >= maxTotal) break;
  }
  doc.destroy();

  // Dedupe consecutive identical titles
  const items: BookmarkItem[] = [];
  for (const c of candidates) {
    const prev = items[items.length - 1];
    if (prev && prev.title === c.title && prev.pageIndex === c.pageIndex) continue;
    items.push(c);
    if (items.length >= maxTotal) break;
  }

  if (!pagesWithText) {
    return {
      items: [],
      note: "No text layer found — OCR the PDF first, then retry.",
    };
  }
  if (!items.length) {
    return {
      items: [],
      note: "Text found, but no heading-like lines detected.",
    };
  }
  return {
    items,
    note: `Generated ${items.length} bookmark${items.length === 1 ? "" : "s"} from headings on ${pagesWithText} page${pagesWithText === 1 ? "" : "s"}.`,
  };
}
