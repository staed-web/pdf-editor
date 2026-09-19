import type { PDFDocumentProxy } from "pdfjs-dist";

export interface SearchMatch {
  pageIndex: number;
  text: string;
  /** Approximate rects in PDF page coords (top-left origin) */
  rects: { x: number; y: number; w: number; h: number }[];
  itemIndex: number;
}

export async function searchPdf(
  doc: PDFDocumentProxy,
  query: string
): Promise<SearchMatch[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const matches: SearchMatch[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: true });
    const viewport = page.getViewport({ scale: 1 });

    content.items.forEach((item, itemIndex) => {
      if (!("str" in item) || !item.str) return;
      const str = item.str as string;
      const lower = str.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        const idx = lower.indexOf(q, from);
        if (idx < 0) break;

        const tx = item.transform as number[];
        const fontHeight = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 12;
        const itemW =
          (item as { width?: number }).width ?? str.length * fontHeight * 0.5;
        const charW = str.length ? itemW / str.length : fontHeight * 0.5;
        const x = tx[4] + idx * charW;
        const yFromBottom = tx[5];
        const w = Math.max(charW * q.length, fontHeight * 0.35);
        const y = viewport.height - yFromBottom - fontHeight;

        matches.push({
          pageIndex: i - 1,
          text: str.slice(idx, idx + query.length),
          itemIndex,
          rects: [{ x, y, w, h: fontHeight * 1.1 }],
        });
        from = idx + Math.max(1, q.length);
      }
    });
    page.cleanup();
  }

  return matches;
}
