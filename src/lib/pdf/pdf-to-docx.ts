/**
 * Layout-aware PDF → DOCX conversion (client-side approximation).
 * Clusters pdf.js text items into lines/paragraphs/columns, preserves
 * bold/italic/size heuristics, and optionally embeds page JPEGs for
 * scanned/empty-text pages.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  PageBreak,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { ensurePdfWorker, loadPdfDocument } from "./loader";

export type PdfToDocxMode = "fast" | "rich";

export interface PdfToDocxOptions {
  mode?: PdfToDocxMode;
  /** Insert a page-break paragraph between PDF pages */
  pageBreaks?: boolean;
  onProgress?: (pct: number, label?: string) => void;
}

type TextItem = {
  str: string;
  x: number;
  y: number; // top-left origin page coords
  w: number;
  h: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
};

type Line = {
  y: number;
  h: number;
  items: TextItem[];
  text: string;
};

type Block =
  | { kind: "paragraph"; lines: Line[]; fontSize: number; bold: boolean; italic: boolean }
  | { kind: "image"; jpeg: Uint8Array; width: number; height: number; caption: string };

function fontFlags(fontName: string): { bold: boolean; italic: boolean } {
  const n = (fontName || "").toLowerCase();
  return {
    bold: /bold|black|heavy|demi|semibold|medi/.test(n),
    italic: /italic|oblique|kursiv/.test(n),
  };
}

function fontSizeFromTransform(tx: number[]): number {
  // |a b; c d| scale — prefer vertical scale for size
  const sx = Math.hypot(tx[0], tx[1]);
  const sy = Math.hypot(tx[2], tx[3]);
  return Math.max(sx, sy) || 12;
}

function clusterLines(items: TextItem[], yTol = 3): Line[] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(it.y - last.y) <= Math.max(yTol, last.h * 0.35)) {
      last.items.push(it);
      last.h = Math.max(last.h, it.h);
      last.y = Math.min(last.y, it.y);
    } else {
      lines.push({ y: it.y, h: it.h, items: [it], text: "" });
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    // Detect column gaps: insert spaces / tabs for large x gaps
    const parts: string[] = [];
    for (let i = 0; i < line.items.length; i++) {
      const cur = line.items[i];
      if (i > 0) {
        const prev = line.items[i - 1];
        const gap = cur.x - (prev.x + prev.w);
        if (gap > Math.max(24, prev.h * 2)) parts.push("\t");
        else if (gap > Math.max(3, prev.h * 0.25)) parts.push(" ");
      }
      parts.push(cur.str);
    }
    line.text = parts.join("").replace(/\s+/g, (m) => (m.includes("\t") ? "\t" : " "));
  }
  return lines;
}

function linesToBlocks(lines: Line[]): Block[] {
  if (!lines.length) return [];
  const blocks: Block[] = [];
  let cur: Line[] = [lines[0]];
  const avgH = (ls: Line[]) => ls.reduce((s, l) => s + l.h, 0) / ls.length;

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const line = lines[i];
    const gap = line.y - (prev.y + prev.h);
    const paraBreak = gap > Math.max(8, avgH(cur) * 0.85);
    if (paraBreak) {
      blocks.push(blockFromLines(cur));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(blockFromLines(cur));
  return blocks;
}

function blockFromLines(lines: Line[]): Block {
  const items = lines.flatMap((l) => l.items);
  const fontSize =
    items.reduce((s, it) => s + it.fontSize, 0) / Math.max(1, items.length);
  const boldRatio = items.filter((i) => i.bold).length / Math.max(1, items.length);
  const italicRatio = items.filter((i) => i.italic).length / Math.max(1, items.length);
  return {
    kind: "paragraph",
    lines,
    fontSize: Math.round(fontSize * 10) / 10,
    bold: boldRatio >= 0.55,
    italic: italicRatio >= 0.55,
  };
}

async function extractPageItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any
): Promise<{ items: TextItem[]; width: number; height: number }> {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent({ includeMarkedContent: true });
  const items: TextItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !raw.str) continue;
    const tx = raw.transform as number[];
    const fontSize = fontSizeFromTransform(tx);
    const x = tx[4];
    const yBottom = tx[5];
    const w = (raw as { width?: number }).width ?? fontSize * String(raw.str).length * 0.5;
    const h = fontSize;
    const y = viewport.height - yBottom - h;
    const fontName = String((raw as { fontName?: string }).fontName || "");
    const flags = fontFlags(fontName);
    items.push({
      str: String(raw.str),
      x,
      y,
      w,
      h,
      fontName,
      bold: flags.bold,
      italic: flags.italic,
      fontSize,
    });
  }
  return { items, width: viewport.width, height: viewport.height };
}

async function renderPageJpeg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale = 1.5,
  quality = 0.82
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", quality)
  );
  const ab = await blob.arrayBuffer();
  return { bytes: new Uint8Array(ab), width: canvas.width, height: canvas.height };
}

function paragraphToDocx(block: Extract<Block, { kind: "paragraph" }>): Paragraph {
  const text = block.lines.map((l) => l.text).join(" ");
  const size = Math.max(16, Math.min(72, Math.round(block.fontSize * 2))); // half-points
  const isHeading = block.bold && block.fontSize >= 16 && text.length < 120;
  // Per-run style when lines have mixed items
  const runs: TextRun[] = [];
  for (let li = 0; li < block.lines.length; li++) {
    const line = block.lines[li];
    for (let ii = 0; ii < line.items.length; ii++) {
      const it = line.items[ii];
      if (ii > 0) {
        const prev = line.items[ii - 1];
        const gap = it.x - (prev.x + prev.w);
        if (gap > Math.max(24, prev.h * 2)) runs.push(new TextRun({ text: "\t", size }));
        else if (gap > 2) runs.push(new TextRun({ text: " ", size }));
      }
      runs.push(
        new TextRun({
          text: it.str,
          bold: it.bold,
          italics: it.italic,
          size: Math.max(16, Math.min(72, Math.round(it.fontSize * 2))),
        })
      );
    }
    if (li < block.lines.length - 1) runs.push(new TextRun({ break: 1 }));
  }
  if (!runs.length) {
    runs.push(
      new TextRun({
        text: text || " ",
        bold: block.bold,
        italics: block.italic,
        size,
      })
    );
  }
  return new Paragraph({
    children: runs,
    spacing: { after: 120, line: 276 },
    heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
  });
}

export async function convertPdfToDocx(
  source: ArrayBuffer,
  opts: PdfToDocxOptions = {}
): Promise<Uint8Array> {
  const mode = opts.mode ?? "rich";
  const pageBreaks = opts.pageBreaks ?? true;
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const children: Paragraph[] = [];
  const n = doc.numPages;

  for (let i = 1; i <= n; i++) {
    opts.onProgress?.(Math.round(((i - 1) / n) * 100), `Page ${i}/${n}`);
    const page = await doc.getPage(i);
    const { items, width, height } = await extractPageItems(page);
    const textLen = items.reduce((s, it) => s + it.str.trim().length, 0);

    if (i > 1 && pageBreaks) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Page ${i}`,
            bold: true,
            size: 18,
            color: "888888",
          }),
        ],
        spacing: { after: 80 },
      })
    );

    if (textLen < 8) {
      // Scanned / empty text — embed JPEG when rich mode
      if (mode === "rich") {
        try {
          const img = await renderPageJpeg(page, 1.4, 0.8);
          // Fit within ~6.5" printable width at 96dpi-ish
          const maxW = 600;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: "jpg",
                  data: img.bytes,
                  transformation: { width: w, height: h },
                }),
              ],
              spacing: { after: 80 },
            })
          );
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Scanned page ${i} — embedded image; run OCR for searchable text]`,
                  italics: true,
                  size: 16,
                  color: "666666",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        } catch {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Page ${i} has no extractable text]`,
                  italics: true,
                  color: "999999",
                }),
              ],
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Page ${i} has no extractable text — use Rich mode to embed page image]`,
                italics: true,
                color: "999999",
              }),
            ],
          })
        );
      }
    } else if (mode === "fast") {
      const lines = clusterLines(items);
      const plain = lines.map((l) => l.text).join("\n");
      for (const line of plain.split("\n")) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line || " ", size: 22 })],
            spacing: { after: 60 },
          })
        );
      }
    } else {
      const lines = clusterLines(items);
      const blocks = linesToBlocks(lines);
      // Rough column note: if many tab-separated lines, keep as-is (tabs preserved in runs)
      void width;
      void height;
      for (const b of blocks) {
        if (b.kind === "paragraph") children.push(paragraphToDocx(b));
      }
    }

    page.cleanup();
  }

  doc.destroy();
  opts.onProgress?.(100, "Packing DOCX");

  const document = new Document({
    creator: "InstantPDFEdit",
    description: "Free local PDF→Word approximation (layout best-effort)",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5"
          },
        },
        children: children.length
          ? children
          : [new Paragraph({ children: [new TextRun({ text: "(empty)" })] })],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  return new Uint8Array(await blob.arrayBuffer());
}
