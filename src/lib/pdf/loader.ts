import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

let workerReady = false;

export function ensurePdfWorker() {
  if (typeof window === "undefined") return;
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerReady = true;
  }
}

export async function loadPdfDocument(
  data: ArrayBuffer
): Promise<PDFDocumentProxy> {
  ensurePdfWorker();
  // Clone so pdf.js ownership doesn't detach our stored buffer
  const copy = data.slice(0);
  return pdfjs.getDocument({ data: copy, useSystemFonts: true }).promise;
}

export async function getPageSizes(
  doc: PDFDocumentProxy
): Promise<{ width: number; height: number }[]> {
  const sizes: { width: number; height: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    sizes.push({ width: viewport.width, height: viewport.height });
    page.cleanup();
  }
  return sizes;
}

export { pdfjs };
