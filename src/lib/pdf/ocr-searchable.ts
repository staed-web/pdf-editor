/**
 * OCR pages and write an invisible text layer into a new PDF (searchable scan).
 * Tesseract.js is loaded dynamically so non-OCR routes stay lean.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderPdfPages } from "./ops";

export type OcrProgress = (pct: number, label?: string) => void;

async function loadTesseract() {
  const mod = await import("tesseract.js");
  return mod.createWorker;
}


function langNeedsUnicodeFont(lang: string): boolean {
  return /(^|\+)hin(\+|$)/i.test(lang);
}

let unicodeFontBytesPromise: Promise<ArrayBuffer> | null = null;

async function loadDevanagariFontBytes(): Promise<ArrayBuffer> {
  if (!unicodeFontBytesPromise) {
    unicodeFontBytesPromise = fetch("/fonts/NotoSansDevanagari-Regular.ttf").then(
      async (res) => {
        if (!res.ok) {
          unicodeFontBytesPromise = null;
          throw new Error("Could not load Devanagari font for searchable OCR");
        }
        return res.arrayBuffer();
      }
    );
  }
  return unicodeFontBytesPromise;
}

async function embedOcrFont(
  out: PDFDocument,
  lang: string,
  onProgress?: OcrProgress
) {
  if (!langNeedsUnicodeFont(lang)) {
    return out.embedFont(StandardFonts.Helvetica);
  }
  onProgress?.(6, "Loading Hindi font…");
  const fontkitMod = await import("@pdf-lib/fontkit");
  // CJS/ESM interop — pdf-lib expects the fontkit namespace (has create())
  const fk = ((fontkitMod as unknown as { default?: unknown }).default ??
    fontkitMod) as Parameters<PDFDocument["registerFontkit"]>[0];
  out.registerFontkit(fk);
  const bytes = await loadDevanagariFontBytes();
  return out.embedFont(bytes, { subset: true });
}

export async function ocrToSearchablePdf(
  source: ArrayBuffer,
  opts: { lang?: string; onProgress?: OcrProgress } = {}
): Promise<{ bytes: Uint8Array; text: string }> {
  const lang = opts.lang || "eng";
  opts.onProgress?.(3, "Loading OCR engine…");
  const createWorker = await loadTesseract();
  opts.onProgress?.(5, "Rendering pages");
  const pages = await renderPdfPages(source, { format: "png", scale: 2 });
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        opts.onProgress?.(10 + Math.round(m.progress * 70), "Recognizing");
      }
      if (m.status === "loading language traineddata") {
        opts.onProgress?.(8, "Downloading language data…");
      }
    },
  });

  const out = await PDFDocument.create();
  const font = await embedOcrFont(out, lang, opts.onProgress);
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
    const words: {
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }[] = [];
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
      // Fit width; Unicode font used when lang includes Hindi (hin)
      try {
        while (size > 4 && font.widthOfTextAtSize(text, size) > w * 1.15) {
          size -= 0.5;
        }
        page.drawText(text, {
          x,
          y: y + h * 0.1,
          size,
          font,
          color: rgb(0, 0, 0),
          opacity: 0, // invisible but selectable/searchable
        });
      } catch {
        /* skip rare glyphs the active font still can't encode */
      }
    }
  }

  await worker.terminate();
  opts.onProgress?.(100, "Done");
  const bytes = await out.save({ useObjectStreams: true });
  return { bytes, text: textChunks.join("\n\n") };
}

/** Plain-text OCR without building a PDF (lazy Tesseract). */
export async function ocrPagesToText(
  source: ArrayBuffer,
  opts: { lang?: string; onProgress?: OcrProgress; isCancelled?: () => boolean } = {}
): Promise<string> {
  const lang = opts.lang || "eng";
  opts.onProgress?.(3, "Loading OCR engine…");
  const createWorker = await loadTesseract();
  opts.onProgress?.(5, "Rendering pages");
  const pages = await renderPdfPages(source, { format: "png", scale: 2 });
  if (opts.isCancelled?.()) throw new DOMException("Aborted", "AbortError");
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        if (!opts.isCancelled?.()) {
          opts.onProgress?.(10 + Math.round(m.progress * 80), "Recognizing");
        }
      }
    },
  });
  const chunks: string[] = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      if (opts.isCancelled?.()) throw new DOMException("Aborted", "AbortError");
      opts.onProgress?.(
        10 + Math.round((i / pages.length) * 80),
        `OCR page ${i + 1} of ${pages.length}…`
      );
      const { data } = await worker.recognize(pages[i].blob);
      chunks.push(`--- Page ${i + 1} ---\n${data.text}`);
    }
  } finally {
    await worker.terminate();
  }
  return chunks.join("\n\n");
}
