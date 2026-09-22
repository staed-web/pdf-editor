/**
 * Annotation / comments list → TXT, CSV, or simple PDF summary.
 * Supports editor in-memory annotations and native PDF Annots via pdf.js.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Annotation } from "@/store/types";
import { ensurePdfWorker, loadPdfDocument } from "./loader";

export type AnnotationSummaryRow = {
  page: number; // 1-based
  type: string;
  text: string;
  color?: string;
  author?: string;
  createdAt?: string;
};

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToTxt(rows: AnnotationSummaryRow[], title = "Annotations"): string {
  const lines = [
    `${title}`,
    `Generated locally by InstantPDFEdit · ${rows.length} item(s)`,
    "".padEnd(48, "─"),
    "",
  ];
  rows.forEach((r, i) => {
    lines.push(`${i + 1}. [p.${r.page}] ${r.type}`);
    if (r.text) lines.push(`   ${r.text}`);
    if (r.author) lines.push(`   Author: ${r.author}`);
    if (r.color) lines.push(`   Color: ${r.color}`);
    if (r.createdAt) lines.push(`   Created: ${r.createdAt}`);
    lines.push("");
  });
  if (!rows.length) lines.push("(No annotations found)");
  return lines.join("\n");
}

export function rowsToCsv(rows: AnnotationSummaryRow[]): string {
  const header = ["page", "type", "text", "color", "author", "createdAt"];
  const body = rows.map((r) =>
    [
      String(r.page),
      csvEscape(r.type),
      csvEscape(r.text || ""),
      csvEscape(r.color || ""),
      csvEscape(r.author || ""),
      csvEscape(r.createdAt || ""),
    ].join(",")
  );
  return [header.join(","), ...body].join("\n");
}

export async function rowsToPdfSummary(
  rows: AnnotationSummaryRow[],
  opts?: { title?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const pageW = 612;
  const pageH = 792;
  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;
  const title = opts?.title || "Annotation summary";

  const drawLine = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    const maxW = pageW - margin * 2;
    const words = text.split(/\s+/);
    let line = "";
    const flush = () => {
      if (!line) return;
      if (y < margin + 20) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 6;
      line = "";
    };
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(trial, size) > maxW) {
        flush();
        line = w;
      } else line = trial;
    }
    flush();
  };

  drawLine(title, 16, bold);
  drawLine(
    `${rows.length} annotation(s) · InstantPDFEdit (browser-local)`,
    9,
    font,
    rgb(0.4, 0.4, 0.45)
  );
  y -= 8;

  if (!rows.length) {
    drawLine("No annotations found in this document.", 11);
  } else {
    rows.forEach((r, i) => {
      drawLine(`${i + 1}. [Page ${r.page}] ${r.type}`, 11, bold);
      if (r.text) drawLine(r.text, 10);
      const meta = [r.author && `Author: ${r.author}`, r.color && `Color: ${r.color}`]
        .filter(Boolean)
        .join(" · ");
      if (meta) drawLine(meta, 9, font, rgb(0.45, 0.45, 0.5));
      y -= 4;
    });
  }

  doc.setProducer("InstantPDFEdit");
  doc.setCreator("InstantPDFEdit");
  return doc.save({ useObjectStreams: true });
}

/** Map editor store annotations → summary rows. */
export function editorAnnotationsToRows(
  annotations: Annotation[]
): AnnotationSummaryRow[] {
  return annotations.map((a) => {
    let text = "";
    if ("text" in a && typeof a.text === "string") text = a.text;
    else if ("label" in a && typeof a.label === "string") text = a.label;
    else if (a.type === "pen") text = `(ink stroke, ${(a as { points: unknown[] }).points?.length || 0} pts)`;
    else if (
      a.type === "highlight" ||
      a.type === "underline" ||
      a.type === "strikethrough"
    ) {
      text = ("text" in a && a.text) || `(${a.type} markup)`;
    } else if (
      a.type === "rect" ||
      a.type === "ellipse" ||
      a.type === "arrow" ||
      a.type === "line"
    ) {
      text = `(${a.type})`;
    } else if (a.type === "signature") {
      text = ("text" in a && a.text) || "(signature)";
    }
    return {
      page: a.pageIndex + 1,
      type: a.type,
      text: String(text || "").trim(),
      color: a.color,
      createdAt: a.createdAt
        ? new Date(a.createdAt).toISOString()
        : undefined,
    };
  });
}

/** Extract native PDF annotations via pdf.js (comments, highlights, etc.). */
export async function extractPdfAnnotationRows(
  source: ArrayBuffer
): Promise<AnnotationSummaryRow[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const rows: AnnotationSummaryRow[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    let annots: Awaited<ReturnType<typeof page.getAnnotations>> = [];
    try {
      annots = await page.getAnnotations();
    } catch {
      annots = [];
    }
    for (const a of annots) {
      const subtype = String(a.subtype || a.annotationType || "Annot");
      // Skip link/widget noise unless they carry contents
      const contents = String(
        a.contentsObj?.str ?? a.contents ?? a.richText ?? ""
      ).trim();
      const title = String(a.title || a.author || "").trim();
      if (
        /^(Link|Widget|Popup)$/i.test(subtype) &&
        !contents &&
        !title
      ) {
        continue;
      }
      const color = Array.isArray(a.color)
        ? `#${a.color
            .slice(0, 3)
            .map((c: number) =>
              Math.round(Math.max(0, Math.min(1, c)) * 255)
                .toString(16)
                .padStart(2, "0")
            )
            .join("")}`
        : undefined;
      rows.push({
        page: i,
        type: subtype,
        text: contents || title || `(${subtype})`,
        color,
        author: title || undefined,
        createdAt: a.modificationDate
          ? String(a.modificationDate)
          : undefined,
      });
    }
    page.cleanup();
  }
  doc.destroy();
  return rows;
}

export type SummaryFormat = "txt" | "csv" | "pdf";

export async function exportAnnotationSummary(
  rows: AnnotationSummaryRow[],
  format: SummaryFormat,
  baseName = "annotations"
): Promise<{ bytes: Uint8Array; name: string; mime: string }> {
  if (format === "csv") {
    const text = rowsToCsv(rows);
    return {
      bytes: new TextEncoder().encode(text),
      name: `${baseName}.csv`,
      mime: "text/csv",
    };
  }
  if (format === "pdf") {
    const bytes = await rowsToPdfSummary(rows, { title: "Annotation summary" });
    return { bytes, name: `${baseName}-summary.pdf`, mime: "application/pdf" };
  }
  const text = rowsToTxt(rows);
  return {
    bytes: new TextEncoder().encode(text),
    name: `${baseName}.txt`,
    mime: "text/plain",
  };
}
