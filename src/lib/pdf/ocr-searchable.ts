/**
 * OCR pages and write an invisible text layer into a new PDF (searchable scan).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createWorker } from "tesseract.js";
import { renderPdfPages } from "./ops";

export type OcrProgress = (pct: number, label?: string) => void;

export async function ocrToSearchablePdf(
  source: ArrayBuffer,
  opts: { lang?: string; onProgress?: OcrProgress } = {}
): Promise<{ bytes: Uint8Array; text: string }> {
  const lang = opts.lang || "eng";
  opts.onProgress?.(5, "Rendering pages");
  const pages = await renderPdfPages(source, { format: "png", scale: 2 });
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        opts.onProgress?.(10 + Math.round(m.progress * 70), "Recognizing");
      }
    },
  });

  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const textChunks: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    opts.onProgress?.(
      10 + Math.round((i / Math.max(1, pages.length)) * 80),
      `OCR page ${i + 1}/${pages.length}`
    );
    const { data } = await worker.recognize(pages[i].blob);
    textChunks.push(`--- Page ${i + 1} ---\n${data.text}`);

    const png = pages[i].bytes;
    const img = await out.embedPng(png);
    // Use image pixel size mapped to points (72dpi-ish via scale 2 render)
    const pageW = img.width / 2;
    const pageH = img.height / 2;
    const page = out.addPage([pageW, pageH]);
    page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });

    // Invisible text from word boxes (tesseract bbox: x0,y0,x1,y1 in image px)
    const words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] = [];
    for (const block of data.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const line of para.lines || []) {
          for (const word of line.words || []) words.push(word);
        }
      }
    }
    for (const word of words) {
      const text = (word.text || "").trim();
      if (!text) continue;
      const box = word.bbox;
      if (!box) continue;
      const scale = 0.5; // image px → PDF points (we rendered at 2x)
      const x = box.x0 * scale;
      const w = Math.max(4, (box.x1 - box.x0) * scale);
      const h = Math.max(6, (box.y1 - box.y0) * scale);
      // tesseract y grows downward; PDF y grows upward
      const yTop = box.y0 * scale;
      const y = pageH - yTop - h;
      let size = Math.min(h * 0.9, 28);
      // Fit width
      while (size > 4 && font.widthOfTextAtSize(text, size) > w * 1.15) {
        size -= 0.5;
      }
      try {
        page.drawText(text, {
          x,
          y: y + h * 0.1,
          size,
          font,
          color: rgb(0, 0, 0),
          opacity: 0, // invisible but selectable/searchable
        });
      } catch {
        /* skip glyphs Helvetica can't encode */
      }
    }
  }

  await worker.terminate();
  opts.onProgress?.(100, "Done");
  const bytes = await out.save({ useObjectStreams: true });
  return { bytes, text: textChunks.join("\n\n") };
}
