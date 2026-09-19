import {
  PDFDocument,
  PDFName,
  PDFDict,
  rgb,
  degrees,
  StandardFonts,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type {
  Annotation,
  FormFieldValue,
  PageMeta,
  PenAnnotation,
  ShapeAnnotation,
  MarkupAnnotation,
  TextBoxAnnotation,
  NoteAnnotation,
  StampAnnotation,
  SignatureAnnotation,
} from "@/store/types";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}


/** Convert top-left UI coords to pdf-lib bottom-left */
function toPdfY(pageHeight: number, y: number, h = 0) {
  return pageHeight - y - h;
}

type DispRect = { x: number; y: number; w: number; h: number };
type DispPoint = { x: number; y: number };

/** Map annotation coords from rotated display space (pageMeta) → unrotated media box. */
function displayToMediaPoint(
  x: number,
  y: number,
  displayW: number,
  displayH: number,
  rotation: number
): DispPoint {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 0) return { x, y };
  if (r === 90) return { x: y, y: displayW - x }; // media H = displayW
  if (r === 180) return { x: displayW - x, y: displayH - y };
  if (r === 270) return { x: displayH - y, y: x };
  return { x, y };
}

function displayToMediaRect(
  x: number,
  y: number,
  w: number,
  h: number,
  displayW: number,
  displayH: number,
  rotation: number
): DispRect {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 0) return { x, y, w, h };
  const c1 = displayToMediaPoint(x, y, displayW, displayH, r);
  const c2 = displayToMediaPoint(x + w, y, displayW, displayH, r);
  const c3 = displayToMediaPoint(x, y + h, displayW, displayH, r);
  const c4 = displayToMediaPoint(x + w, y + h, displayW, displayH, r);
  const xs = [c1.x, c2.x, c3.x, c4.x];
  const ys = [c1.y, c2.y, c3.y, c4.y];
  const nx = Math.min(...xs);
  const ny = Math.min(...ys);
  return { x: nx, y: ny, w: Math.max(...xs) - nx, h: Math.max(...ys) - ny };
}

function toMediaAnnotation(
  ann: Annotation,
  displayW: number,
  displayH: number,
  rotation: number
): Annotation {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 0) return ann;
  switch (ann.type) {
    case "highlight":
    case "underline":
    case "strikethrough":
      return {
        ...ann,
        rects: ann.rects.map((rect) =>
          displayToMediaRect(rect.x, rect.y, rect.w, rect.h, displayW, displayH, r)
        ),
      };
    case "pen":
      return {
        ...ann,
        points: ann.points.map((p) =>
          displayToMediaPoint(p.x, p.y, displayW, displayH, r)
        ),
      };
    case "line":
    case "arrow": {
      const a = displayToMediaPoint(ann.x, ann.y, displayW, displayH, r);
      const b = displayToMediaPoint(ann.x + ann.w, ann.y + ann.h, displayW, displayH, r);
      return { ...ann, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    }
    case "note": {
      const p = displayToMediaPoint(ann.x, ann.y, displayW, displayH, r);
      return { ...ann, x: p.x, y: p.y };
    }
    case "rect":
    case "ellipse":
    case "textbox":
    case "stamp":
    case "signature": {
      const box = displayToMediaRect(ann.x, ann.y, ann.w, ann.h, displayW, displayH, r);
      return { ...ann, ...box };
    }
    default:
      return ann;
  }
}

async function embedDataUrl(doc: PDFDocument, dataUrl: string) {
  const [header, b64] = dataUrl.split(",");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (header.includes("image/png")) return doc.embedPng(bytes);
  return doc.embedJpg(bytes);
}

function drawMarkup(
  page: PDFPage,
  ann: MarkupAnnotation,
  pageHeight: number
) {
  const c = hexToRgb(ann.color);
  for (const r of ann.rects) {
    const y = toPdfY(pageHeight, r.y, r.h);
    if (ann.type === "highlight") {
      page.drawRectangle({
        x: r.x,
        y,
        width: r.w,
        height: r.h,
        color: rgb(c.r, c.g, c.b),
        opacity: ann.opacity,
        borderWidth: 0,
      });
    } else if (ann.type === "underline") {
      page.drawLine({
        start: { x: r.x, y: y },
        end: { x: r.x + r.w, y: y },
        thickness: Math.max(1, ann.strokeWidth),
        color: rgb(c.r, c.g, c.b),
        opacity: Math.max(0.5, ann.opacity),
      });
    } else {
      page.drawLine({
        start: { x: r.x, y: y + r.h / 2 },
        end: { x: r.x + r.w, y: y + r.h / 2 },
        thickness: Math.max(1, ann.strokeWidth),
        color: rgb(c.r, c.g, c.b),
        opacity: Math.max(0.5, ann.opacity),
      });
    }
  }
}

function drawPen(page: PDFPage, ann: PenAnnotation, pageHeight: number) {
  if (ann.points.length < 2) return;
  const c = hexToRgb(ann.color);
  for (let i = 1; i < ann.points.length; i++) {
    const a = ann.points[i - 1];
    const b = ann.points[i];
    page.drawLine({
      start: { x: a.x, y: toPdfY(pageHeight, a.y) },
      end: { x: b.x, y: toPdfY(pageHeight, b.y) },
      thickness: ann.strokeWidth,
      color: rgb(c.r, c.g, c.b),
      opacity: Math.max(0.6, ann.opacity),
      lineCap: 1,
    });
  }
}

function drawShape(page: PDFPage, ann: ShapeAnnotation, pageHeight: number) {
  const c = hexToRgb(ann.color);
  const fill = hexToRgb(ann.fillColor || ann.color);
  const x = Math.min(ann.x, ann.x + ann.w);
  const yTop = Math.min(ann.y, ann.y + ann.h);
  const w = Math.abs(ann.w);
  const h = Math.abs(ann.h);
  const y = toPdfY(pageHeight, yTop, h);

  if (ann.type === "rect") {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      borderColor: rgb(c.r, c.g, c.b),
      borderWidth: ann.strokeWidth,
      color: ann.filled ? rgb(fill.r, fill.g, fill.b) : undefined,
      opacity: ann.filled ? ann.opacity : 1,
      borderOpacity: 1,
    });
  } else if (ann.type === "ellipse") {
    page.drawEllipse({
      x: x + w / 2,
      y: y + h / 2,
      xScale: w / 2,
      yScale: h / 2,
      borderColor: rgb(c.r, c.g, c.b),
      borderWidth: ann.strokeWidth,
      color: ann.filled ? rgb(fill.r, fill.g, fill.b) : undefined,
      opacity: ann.filled ? ann.opacity : 1,
      borderOpacity: 1,
    });
  } else if (ann.type === "line" || ann.type === "arrow") {
    const x1 = ann.x;
    const y1 = toPdfY(pageHeight, ann.y);
    const x2 = ann.x + ann.w;
    const y2 = toPdfY(pageHeight, ann.y + ann.h);
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: ann.strokeWidth,
      color: rgb(c.r, c.g, c.b),
    });
    if (ann.type === "arrow") {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 10 + ann.strokeWidth * 2;
      const a1 = angle + Math.PI * 0.8;
      const a2 = angle - Math.PI * 0.8;
      page.drawLine({
        start: { x: x2, y: y2 },
        end: { x: x2 + Math.cos(a1) * head, y: y2 + Math.sin(a1) * head },
        thickness: ann.strokeWidth,
        color: rgb(c.r, c.g, c.b),
      });
      page.drawLine({
        start: { x: x2, y: y2 },
        end: { x: x2 + Math.cos(a2) * head, y: y2 + Math.sin(a2) * head },
        thickness: ann.strokeWidth,
        color: rgb(c.r, c.g, c.b),
      });
    }
  }
}

function drawTextBox(
  page: PDFPage,
  ann: TextBoxAnnotation,
  pageHeight: number,
  font: PDFFont
) {
  const c = hexToRgb(ann.color);
  const y = toPdfY(pageHeight, ann.y, ann.h);
  page.drawRectangle({
    x: ann.x,
    y,
    width: ann.w,
    height: ann.h,
    borderColor: rgb(c.r, c.g, c.b),
    borderWidth: 1,
    color: rgb(1, 1, 1),
    opacity: 0.92,
  });
  const lines = ann.text.split("\n");
  let cursor = y + ann.h - ann.fontSize - 4;
  for (const line of lines) {
    if (cursor < y) break;
    page.drawText(line, {
      x: ann.x + 4,
      y: cursor,
      size: ann.fontSize,
      font,
      color: rgb(c.r, c.g, c.b),
      maxWidth: ann.w - 8,
    });
    cursor -= ann.fontSize * 1.25;
  }
}

function drawNote(
  page: PDFPage,
  ann: NoteAnnotation,
  pageHeight: number,
  font: PDFFont
) {
  const c = hexToRgb(ann.color);
  const size = 18;
  const y = toPdfY(pageHeight, ann.y, size);
  page.drawRectangle({
    x: ann.x,
    y,
    width: size,
    height: size,
    color: rgb(c.r, c.g, c.b),
    opacity: 0.95,
  });
  if (ann.text) {
    page.drawText(ann.text.slice(0, 80), {
      x: ann.x + size + 4,
      y: y + 4,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 160,
    });
  }
}

function drawStamp(
  page: PDFPage,
  ann: StampAnnotation,
  pageHeight: number,
  font: PDFFont
) {
  const c = hexToRgb(ann.color);
  const x = ann.x;
  const y = toPdfY(pageHeight, ann.y, ann.h);
  page.drawRectangle({
    x,
    y,
    width: ann.w,
    height: ann.h,
    borderColor: rgb(c.r, c.g, c.b),
    borderWidth: 2,
    borderOpacity: 0.9,
  });
  const size = Math.min(ann.h * 0.45, ann.w / Math.max(ann.label.length * 0.55, 1));
  const textWidth = font.widthOfTextAtSize(ann.label, size);
  page.drawText(ann.label, {
    x: x + (ann.w - textWidth) / 2,
    y: y + (ann.h - size) / 2,
    size,
    font,
    color: rgb(c.r, c.g, c.b),
    opacity: 0.85,
  });
}

async function drawSignature(
  page: PDFPage,
  doc: PDFDocument,
  ann: SignatureAnnotation,
  pageHeight: number,
  font: PDFFont
) {
  const y = toPdfY(pageHeight, ann.y, ann.h);
  if (ann.dataUrl) {
    try {
      const img = await embedDataUrl(doc, ann.dataUrl);
      page.drawImage(img, { x: ann.x, y, width: ann.w, height: ann.h });
      return;
    } catch {
      /* fall through to text */
    }
  }
  if (ann.text) {
    const c = hexToRgb(ann.color);
    const size = ann.fontSize || Math.min(ann.h * 0.7, 28);
    page.drawText(ann.text, {
      x: ann.x + 4,
      y: y + (ann.h - size) / 2,
      size,
      font,
      color: rgb(c.r, c.g, c.b),
    });
  }
}

function applyFormValues(
  pdfDoc: PDFDocument,
  values: FormFieldValue[],
  flatten: boolean
) {
  try {
    const form = pdfDoc.getForm();
    for (const v of values) {
      try {
        const field = form.getFieldMaybe(v.name);
        if (!field) continue;
        const typeName = field.constructor.name;
        if (typeName.includes("Text") && "setText" in field) {
          (field as { setText: (t: string) => void }).setText(v.value);
        } else if (typeName.includes("CheckBox")) {
          const cb = field as unknown as { check: () => void; uncheck: () => void };
          if (v.value === "true" || v.value === "Yes" || v.value === "1") cb.check();
          else cb.uncheck();
        } else if (typeName.includes("Dropdown") || typeName.includes("Radio")) {
          if ("select" in field) {
            (field as unknown as { select: (v: string) => void }).select(v.value);
          }
        }
      } catch {
        /* skip bad field */
      }
    }
    if (flatten) {
      try {
        form.flatten();
      } catch {
        /* some forms can't flatten */
      }
    }
  } catch {
    /* no form */
  }
}

export interface ExportOptions {
  sourceBytes: ArrayBuffer;
  pages: PageMeta[];
  annotations: Annotation[];
  formValues: FormFieldValue[];
  flattenForms: boolean;
}

export async function exportEditedPdf(opts: ExportOptions): Promise<Uint8Array> {
  const src = await PDFDocument.load(opts.sourceBytes.slice(0), {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  const blankSize = opts.pages.find((p) => p.sourceIndex >= 0) || {
    width: 612,
    height: 792,
  };

  for (let i = 0; i < opts.pages.length; i++) {
    const pageMeta = opts.pages[i];
    let page: PDFPage;
    if (pageMeta.sourceIndex < 0) {
      page = out.addPage([
        pageMeta.width || blankSize.width,
        pageMeta.height || blankSize.height,
      ]);
    } else {
      const [copied] = await out.copyPages(src, [pageMeta.sourceIndex]);
      page = out.addPage(copied);
    }

    const media = page.getSize();
    const rotation = ((pageMeta.rotation % 360) + 360) % 360;
    const displayW = pageMeta.width || media.width;
    const displayH = pageMeta.height || media.height;

    // Draw annotations in media-box space, then apply page rotation so they stay aligned.
    const pageAnns = opts.annotations
      .filter((a) => a.pageIndex === i)
      .map((a) => toMediaAnnotation(a, displayW, displayH, rotation));

    const height = media.height;
    for (const ann of pageAnns) {
      switch (ann.type) {
        case "highlight":
        case "underline":
        case "strikethrough":
          drawMarkup(page, ann, height);
          break;
        case "pen":
          drawPen(page, ann, height);
          break;
        case "rect":
        case "ellipse":
        case "arrow":
        case "line":
          drawShape(page, ann, height);
          break;
        case "textbox":
          drawTextBox(page, ann, height, font);
          break;
        case "note":
          drawNote(page, ann, height, font);
          break;
        case "stamp":
          drawStamp(page, ann, height, bold);
          break;
        case "signature":
          await drawSignature(page, out, ann, height, font);
          break;
      }
    }

    if (rotation !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + rotation) % 360));
    }
  }

  applyFormValues(out, opts.formValues, opts.flattenForms);

  // Strip leftover AcroForm if we flattened into a rebuilt doc without form fields copied properly
  // Form fields from copied pages may still exist; apply values on `out` after copy.
  // Re-apply: forms are copied with pages, so fill on `out` again after copy is correct —
  // but we created fresh doc and copied pages which may include widget annotations.
  // Fill forms on `out` — already done via applyFormValues.

  // Also try filling on a merge approach for forms that live in source:
  // If copied pages retained form fields, getForm on out should see them.
  try {
    const form = out.getForm();
    for (const v of opts.formValues) {
      const field = form.getFieldMaybe(v.name);
      if (!field) continue;
      try {
        if ("setText" in field) (field as { setText: (t: string) => void }).setText(v.value);
      } catch { /* */ }
    }
    if (opts.flattenForms) {
      try { form.flatten(); } catch { /* */ }
    }
  } catch { /* */ }

  out.setTitle(src.getTitle() || "Edited PDF");
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");

  return out.save({ useObjectStreams: true });
}

export async function mergePdfs(
  primary: ArrayBuffer,
  secondary: ArrayBuffer
): Promise<Uint8Array> {
  const a = await PDFDocument.load(primary.slice(0), { ignoreEncryption: true });
  const b = await PDFDocument.load(secondary.slice(0), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pagesA = await out.copyPages(a, a.getPageIndices());
  pagesA.forEach((p) => out.addPage(p));
  const pagesB = await out.copyPages(b, b.getPageIndices());
  pagesB.forEach((p) => out.addPage(p));
  return out.save();
}

export async function extractPages(
  source: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(source.slice(0), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageIndices);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Extract AcroForm field info via pdf-lib */
export async function listFormFields(
  source: ArrayBuffer
): Promise<FormFieldValue[]> {
  try {
    const doc = await PDFDocument.load(source.slice(0), { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();
    return fields.map((f) => {
      const name = f.getName();
      let value = "";
      let type = f.constructor.name;
      try {
        if ("getText" in f) value = (f as { getText: () => string }).getText() || "";
        else if ("isChecked" in f)
          value = (f as { isChecked: () => boolean }).isChecked() ? "true" : "false";
        else if ("getSelected" in f) {
          const sel = (f as { getSelected: () => string | string[] }).getSelected();
          value = Array.isArray(sel) ? sel.join(", ") : sel || "";
        }
      } catch { /* */ }
      // Best-effort page index
      let pageIndex = 0;
      try {
        const acro = f.acroField;
        const kids = acro.getWidgets();
        if (kids[0]) {
          const pageRef = kids[0].dict.get(PDFName.of("P"));
          if (pageRef) {
            const pages = doc.getPages();
            const idx = pages.findIndex((p) => p.ref === pageRef);
            if (idx >= 0) pageIndex = idx;
          }
        }
      } catch { /* */ }
      return { name, value, type, pageIndex };
    });
  } catch {
    return [];
  }
}

// silence unused import warning for PDFDict if tree-shaken
void PDFDict;
