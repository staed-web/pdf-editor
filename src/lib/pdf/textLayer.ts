/**
 * pdf.js text-layer helpers for selectable markup + search rects.
 */
import type { PDFPageProxy } from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";

export type PageRect = { x: number; y: number; w: number; h: number };

/** Markup tools that should receive text selection */
export const TEXT_MARKUP_TOOLS = new Set([
  "highlight",
  "underline",
  "strikethrough",
  "select",
]);

/**
 * Render a transparent selectable text layer into `container` for the page.
 * Returns a cancel/cleanup function.
 */
export async function renderTextLayer(opts: {
  page: PDFPageProxy;
  container: HTMLElement;
  viewport: { width: number; height: number; scale: number; rotation?: number; clone: (o: { dontFlip?: boolean }) => unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawViewport: any;
}): Promise<{ cancel: () => void }> {
  const { page, container, rawViewport } = opts;
  container.replaceChildren();
  container.setAttribute("class", "textLayer");
  container.style.width = `${rawViewport.width}px`;
  container.style.height = `${rawViewport.height}px`;

  const textContent = await page.getTextContent({ includeMarkedContent: true });
  const layer = new TextLayer({
    textContentSource: textContent,
    container,
    viewport: rawViewport,
  });
  await layer.render();

  // End-of-content div improves selection behavior (pdf.js pattern)
  const end = document.createElement("div");
  end.className = "endOfContent";
  container.appendChild(end);

  return {
    cancel: () => {
      try {
        layer.cancel();
      } catch {
        /* */
      }
      container.replaceChildren();
    },
  };
}

/**
 * Map current window selection client rects into page PDF coords
 * (top-left origin, unscaled page points).
 */
export function selectionToPageRects(
  container: HTMLElement,
  scale: number
): { rects: PageRect[]; text: string } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  // Ensure selection is within this page's text layer
  const anchor = sel.anchorNode;
  const focus = sel.focusNode;
  if (!anchor || !focus) return null;
  if (!container.contains(anchor) && !container.contains(focus)) return null;

  const text = sel.toString().replace(/\s+/g, " ").trim();
  if (!text) return null;

  const pageBox = container.getBoundingClientRect();
  const clientRects = sel.getRangeAt(0).getClientRects();
  const rects: PageRect[] = [];

  for (let i = 0; i < clientRects.length; i++) {
    const r = clientRects[i];
    if (r.width < 1 || r.height < 1) continue;
    // Skip rects clearly outside this page
    if (r.bottom < pageBox.top || r.top > pageBox.bottom) continue;
    if (r.right < pageBox.left || r.left > pageBox.right) continue;

    const x = (r.left - pageBox.left) / scale;
    const y = (r.top - pageBox.top) / scale;
    const w = r.width / scale;
    const h = r.height / scale;
    // Merge with previous if same line and adjacent
    const prev = rects[rects.length - 1];
    if (
      prev &&
      Math.abs(prev.y - y) < h * 0.4 &&
      Math.abs(prev.h - h) < h * 0.5 &&
      x <= prev.x + prev.w + 2
    ) {
      const right = Math.max(prev.x + prev.w, x + w);
      prev.x = Math.min(prev.x, x);
      prev.w = right - prev.x;
      prev.y = Math.min(prev.y, y);
      prev.h = Math.max(prev.h, h);
    } else {
      rects.push({ x, y, w, h });
    }
  }

  if (!rects.length) return null;
  return { rects, text };
}

/** Clear any active DOM selection */
export function clearDomSelection() {
  const sel = window.getSelection();
  sel?.removeAllRanges();
}
