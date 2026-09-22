/**
 * Best-effort text-layer PDF from plain text (Latin + Hindi).
 * Not a full layout-preserving translate — readable bilingual export.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function needsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

async function embedBodyFont(doc: PDFDocument, text: string) {
  if (!needsDevanagari(text)) {
    return doc.embedFont(StandardFonts.Helvetica);
  }
  const fontkitMod = await import("@pdf-lib/fontkit");
  const fk = ((fontkitMod as unknown as { default?: unknown }).default ??
    fontkitMod) as Parameters<PDFDocument["registerFontkit"]>[0];
  doc.registerFontkit(fk);
  const res = await fetch("/fonts/NotoSansDevanagari-Regular.ttf");
  if (!res.ok) throw new Error("Could not load Devanagari font");
  const bytes = await res.arrayBuffer();
  return doc.embedFont(bytes, { subset: true });
}

export async function textToSimplePdf(
  text: string,
  opts?: { title?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await embedBodyFont(doc, text);
  const bold = needsDevanagari(text)
    ? font
    : await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const pageW = 612;
  const pageH = 792;
  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;
  const size = 11;
  const maxW = pageW - margin * 2;

  const ensureSpace = (h: number) => {
    if (y < margin + h) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const drawWrapped = (
    raw: string,
    f: typeof font,
    sz: number,
    color = rgb(0.12, 0.12, 0.14)
  ) => {
    const paragraphs = raw.split(/\n/);
    for (const para of paragraphs) {
      if (!para.trim()) {
        y -= sz * 0.6;
        continue;
      }
      // Character-aware wrap for Devanagari (no reliable spaces)
      const tokens = /\s/.test(para) ? para.split(/(\s+)/) : [...para];
      let line = "";
      const flush = () => {
        if (!line) return;
        ensureSpace(sz + 4);
        try {
          page.drawText(line, { x: margin, y, size: sz, font: f, color });
        } catch {
          // skip glyphs font can't encode
        }
        y -= sz + 4;
        line = "";
      };
      for (const tok of tokens) {
        const trial = line + tok;
        try {
          if (f.widthOfTextAtSize(trial, sz) > maxW && line) {
            flush();
            line = tok.trimStart?.() ?? tok;
          } else {
            line = trial;
          }
        } catch {
          flush();
          line = tok;
        }
      }
      flush();
    }
  };

  if (opts?.title) {
    drawWrapped(opts.title, bold, 14, rgb(0.1, 0.1, 0.12));
    y -= 8;
  }
  drawWrapped(
    "InstantPDFEdit · generated on-device · text may wrap differently than the source PDF",
    font,
    8,
    rgb(0.45, 0.45, 0.5)
  );
  y -= 10;
  drawWrapped(text, font, size);
  return doc.save();
}

export async function bilingualTextToPdf(
  source: string,
  translation: string,
  opts?: { sourceLabel?: string; targetLabel?: string; method?: string }
): Promise<Uint8Array> {
  const title = `Translation (${opts?.method || "on-device"})`;
  const body = [
    `## Source (${opts?.sourceLabel || "source"})`,
    "",
    source.slice(0, 80000),
    "",
    "─".repeat(40),
    "",
    `## Translation (${opts?.targetLabel || "target"})`,
    "",
    translation.slice(0, 80000),
  ].join("\n");
  return textToSimplePdf(body, { title });
}
