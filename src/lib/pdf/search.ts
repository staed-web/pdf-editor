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
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    content.items.forEach((item, itemIndex) => {
      if (!("str" in item) || !item.str) return;
      const str = item.str as string;
      if (!str.toLowerCase().includes(q)) return;

      const tx = item.transform as number[];
      const x = tx[4];
      const yFromBottom = tx[5];
      const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
      const width = (item as { width?: number }).width ?? str.length * fontHeight * 0.5;
      const y = viewport.height - yFromBottom - fontHeight;

      matches.push({
        pageIndex: i - 1,
        text: str,
        itemIndex,
        rects: [{ x, y, w: width, h: fontHeight }],
      });
    });
    page.cleanup();
  }

  return matches;
}
