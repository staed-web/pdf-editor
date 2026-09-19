import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PageSizes,
  PDFName,
  PDFDict,
  PDFNumber,
  PDFHexString,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";
import { ensurePdfWorker, loadPdfDocument, pdfjs } from "./loader";

export async function loadPdf(bytes: ArrayBuffer | Uint8Array) {
  const buf =
    bytes instanceof ArrayBuffer ? bytes.slice(0) : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return PDFDocument.load(buf as ArrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
}

export async function mergePdfFiles(
  files: ArrayBuffer[],
  opts?: { bookmarksFromNames?: string[] }
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const bookmarkStarts: { title: string; pageIndex: number }[] = [];
  let pageOffset = 0;
  for (let fi = 0; fi < files.length; fi++) {
    const src = await loadPdf(files[fi]);
    const pages = await out.copyPages(src, src.getPageIndices());
    if (opts?.bookmarksFromNames?.[fi]) {
      const title =
        opts.bookmarksFromNames[fi].replace(/\.pdf$/i, "").trim() ||
        `Document ${fi + 1}`;
      bookmarkStarts.push({ title, pageIndex: pageOffset });
    }
    pages.forEach((p) => out.addPage(p));
    pageOffset += pages.length;
  }
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  if (bookmarkStarts.length) {
    try {
      attachSimpleOutlines(out, bookmarkStarts);
    } catch {
      /* best-effort */
    }
  }
  return out.save({ useObjectStreams: true });
}

function attachSimpleOutlines(
  doc: PDFDocument,
  items: { title: string; pageIndex: number }[]
) {
  const context = doc.context;
  const pages = doc.getPages();
  if (!items.length || !pages.length) return;

  const outlinesRef = context.nextRef();
  const itemRefs: PDFRef[] = items.map(() => context.nextRef());

  items.forEach((item, i) => {
    const page = pages[Math.min(item.pageIndex, pages.length - 1)];
    const dest = context.obj([page.ref, PDFName.of("Fit")]);
    const map = new Map();
    map.set(PDFName.of("Title"), PDFHexString.fromText(item.title));
    map.set(PDFName.of("Parent"), outlinesRef);
    map.set(PDFName.of("Dest"), dest);
    if (i > 0) map.set(PDFName.of("Prev"), itemRefs[i - 1]);
    if (i < items.length - 1) map.set(PDFName.of("Next"), itemRefs[i + 1]);
    context.assign(itemRefs[i], PDFDict.fromMapWithContext(map, context));
  });

  const outlinesMap = new Map();
  outlinesMap.set(PDFName.of("Type"), PDFName.of("Outlines"));
  outlinesMap.set(PDFName.of("First"), itemRefs[0]);
  outlinesMap.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);
  outlinesMap.set(PDFName.of("Count"), PDFNumber.of(items.length));
  context.assign(outlinesRef, PDFDict.fromMapWithContext(outlinesMap, context));
  doc.catalog.set(PDFName.of("Outlines"), outlinesRef);
}


export async function splitByRanges(
  source: ArrayBuffer,
  ranges: { start: number; end: number }[]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const src = await loadPdf(source);
  const results: { name: string; bytes: Uint8Array }[] = [];
  let i = 0;
  for (const r of ranges) {
    const out = await PDFDocument.create();
    const indices = [];
    for (let p = r.start; p <= r.end; p++) indices.push(p - 1);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    results.push({
      name: `pages_${r.start}-${r.end}.pdf`,
      bytes: await out.save(),
    });
    i++;
  }
  return results;
}

export async function splitEveryPage(
  source: ArrayBuffer
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const src = await loadPdf(source);
  const results: { name: string; bytes: Uint8Array }[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [i]);
    out.addPage(p);
    results.push({ name: `page_${i + 1}.pdf`, bytes: await out.save() });
  }
  return results;
}

export async function extractPageIndices(
  source: ArrayBuffer,
  indices0: number[]
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices0);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export async function deletePageIndices(
  source: ArrayBuffer,
  remove0: number[]
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const keep = src.getPageIndices().filter((i) => !remove0.includes(i));
  if (keep.length === 0) throw new Error("Cannot delete all pages");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keep);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export async function rotatePages(
  source: ArrayBuffer,
  rotation: 90 | 180 | 270,
  pageIndices0?: number[]
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const all = src.getPageIndices();
  const target = new Set(pageIndices0 ?? all);
  const copied = await out.copyPages(src, all);
  copied.forEach((p, i) => {
    if (target.has(i)) {
      const cur = p.getRotation().angle;
      p.setRotation(degrees((cur + rotation) % 360));
    }
    out.addPage(p);
  });
  return out.save();
}

/** Reorder pages: order is array of 0-based source indices; rotations optional degrees per output slot */
export async function reorganizePages(
  source: ArrayBuffer,
  order: number[],
  rotations: Record<number, number> = {}
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p, i) => {
    const srcIdx = order[i];
    const rot = rotations[srcIdx] || rotations[i] || 0;
    if (rot % 360 !== 0) {
      const cur = p.getRotation().angle;
      p.setRotation(degrees((cur + rot) % 360));
    }
    out.addPage(p);
  });
  return out.save();
}

export async function repairPdf(source: ArrayBuffer): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  try {
    const title = src.getTitle();
    if (title) out.setTitle(title);
  } catch { /* */ }
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  return out.save({ useObjectStreams: true });
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

export type WatermarkOpts = {
  text?: string;
  imageBytes?: Uint8Array;
  imageType?: "png" | "jpg";
  opacity: number;
  fontSize: number;
  color: string;
  position:
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "diagonal";
  rotation?: number;
};

export async function addWatermark(
  source: ArrayBuffer,
  opts: WatermarkOpts
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  let img = null as Awaited<ReturnType<typeof src.embedPng>> | null;
  if (opts.imageBytes) {
    img =
      opts.imageType === "jpg"
        ? await src.embedJpg(opts.imageBytes)
        : await src.embedPng(opts.imageBytes);
  }
  const c = hexToRgb(opts.color || "#000000");
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    if (img) {
      const maxW = width * 0.4;
      const scale = Math.min(maxW / img.width, height * 0.3 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const { x, y } = posXY(opts.position, width, height, w, h);
      page.drawImage(img, { x, y, width: w, height: h, opacity: opts.opacity });
    } else if (opts.text) {
      const size = opts.fontSize;
      const tw = font.widthOfTextAtSize(opts.text, size);
      const th = size;
      if (opts.position === "diagonal") {
        page.drawText(opts.text, {
          x: width * 0.15,
          y: height * 0.35,
          size,
          font,
          color: rgb(c.r, c.g, c.b),
          opacity: opts.opacity,
          rotate: degrees(opts.rotation ?? -35),
        });
      } else {
        const { x, y } = posXY(opts.position, width, height, tw, th);
        page.drawText(opts.text, {
          x,
          y,
          size,
          font,
          color: rgb(c.r, c.g, c.b),
          opacity: opts.opacity,
        });
      }
    }
  }
  return src.save();
}

function posXY(
  position: WatermarkOpts["position"],
  width: number,
  height: number,
  w: number,
  h: number
) {
  const pad = 36;
  switch (position) {
    case "top-left":
      return { x: pad, y: height - h - pad };
    case "top-right":
      return { x: width - w - pad, y: height - h - pad };
    case "bottom-left":
      return { x: pad, y: pad };
    case "bottom-right":
      return { x: width - w - pad, y: pad };
    case "diagonal":
    case "center":
    default:
      return { x: (width - w) / 2, y: (height - h) / 2 };
  }
}

export async function addPageNumbers(
  source: ArrayBuffer,
  opts: {
    position: "header" | "footer";
    format: string; // e.g. "Page {n} of {total}"
    fontSize: number;
    align: "left" | "center" | "right";
    startFrom?: number;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.Helvetica);
  const pages = src.getPages();
  const total = pages.length;
  const start = opts.startFrom ?? 1;
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const n = start + i;
    const text = opts.format
      .replace("{n}", String(n))
      .replace("{total}", String(total));
    const tw = font.widthOfTextAtSize(text, opts.fontSize);
    let x = 40;
    if (opts.align === "center") x = (width - tw) / 2;
    if (opts.align === "right") x = width - tw - 40;
    const y = opts.position === "header" ? height - 28 : 20;
    page.drawText(text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
  return src.save();
}

export async function addHeaderFooter(
  source: ArrayBuffer,
  opts: {
    header?: string;
    footer?: string;
    fontSize: number;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.Helvetica);
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    if (opts.header) {
      const tw = font.widthOfTextAtSize(opts.header, opts.fontSize);
      page.drawText(opts.header, {
        x: (width - tw) / 2,
        y: height - 28,
        size: opts.fontSize,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
    }
    if (opts.footer) {
      const tw = font.widthOfTextAtSize(opts.footer, opts.fontSize);
      page.drawText(opts.footer, {
        x: (width - tw) / 2,
        y: 20,
        size: opts.fontSize,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
    }
  }
  return src.save();
}

export async function cropPages(
  source: ArrayBuffer,
  margins: { top: number; right: number; bottom: number; left: number }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    const x = margins.left;
    const y = margins.bottom;
    const w = Math.max(10, width - margins.left - margins.right);
    const h = Math.max(10, height - margins.top - margins.bottom);
    page.setCropBox(x, y, w, h);
    page.setMediaBox(x, y, w, h);
  }
  return src.save();
}

export async function flattenForms(source: ArrayBuffer): Promise<Uint8Array> {
  const src = await loadPdf(source);
  try {
    const form = src.getForm();
    form.flatten();
  } catch {
    /* no form or can't flatten */
  }
  return src.save({ useObjectStreams: true });
}

export async function protectPdf(
  source: ArrayBuffer,
  userPassword: string,
  ownerPassword?: string
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  // Rebuild then encrypt — pdf-lib supports userPassword on save in 1.17+
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  return out.save({
    useObjectStreams: false,
    userPassword,
    ownerPassword: ownerPassword || userPassword,
  } as Parameters<typeof out.save>[0]);
}

export async function unlockPdf(
  source: ArrayBuffer,
  password: string
): Promise<Uint8Array> {
  const src = await PDFDocument.load(source.slice(0), {
    // @ts-expect-error password option
    password,
    ignoreEncryption: false,
    updateMetadata: false,
  });
  // Re-save without encryption
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export async function imagesToPdf(
  images: { bytes: Uint8Array; type: "png" | "jpg" | "webp" }[],
  opts?: { pageSize?: "auto" | "a4" | "letter"; margin?: number }
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const margin = opts?.margin ?? 0;
  for (const img of images) {
    let embedded;
    let bytes = img.bytes;
    let type = img.type;
    if (type === "webp") {
      // convert webp → png via canvas
      const png = await webpToPng(bytes);
      bytes = png;
      type = "png";
    }
    embedded =
      type === "jpg"
        ? await out.embedJpg(bytes)
        : await out.embedPng(bytes);
    let pageW: number;
    let pageH: number;
    if (opts?.pageSize === "a4") {
      [pageW, pageH] = PageSizes.A4;
    } else if (opts?.pageSize === "letter") {
      [pageW, pageH] = PageSizes.Letter;
    } else {
      pageW = embedded.width + margin * 2;
      pageH = embedded.height + margin * 2;
    }
    const page = out.addPage([pageW, pageH]);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, {
      x: (pageW - w) / 2,
      y: (pageH - h) / 2,
      width: w,
      height: h,
    });
  }
  out.setProducer("InstantPDFEdit");
  return out.save();
}

async function webpToPng(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "image/webp" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const b64 = dataUrl.split(",")[1];
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderPdfPages(
  source: ArrayBuffer,
  opts: { format: "jpeg" | "png"; quality?: number; scale?: number }
): Promise<{ name: string; blob: Blob; bytes: Uint8Array }[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const scale = opts.scale ?? 2;
  const results: { name: string; blob: Blob; bytes: Uint8Array }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const mime = opts.format === "png" ? "image/png" : "image/jpeg";
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), mime, opts.quality ?? 0.92)
    );
    const ab = await blob.arrayBuffer();
    results.push({
      name: `page_${i}.${opts.format === "png" ? "png" : "jpg"}`,
      blob,
      bytes: new Uint8Array(ab),
    });
    page.cleanup();
  }
  doc.destroy();
  return results;
}

/** Compress by re-rendering pages as JPEG with quality + max-edge downsample */
export async function compressPdf(
  source: ArrayBuffer,
  quality: "low" | "medium" | "high" = "medium"
): Promise<{
  bytes: Uint8Array;
  originalSize: number;
  newSize: number;
  pageCount: number;
  scaleUsed: number;
  jpegQuality: number;
}> {
  const presets = {
    low: { q: 0.38, scale: 1.0, maxEdge: 1280 },
    medium: { q: 0.58, scale: 1.35, maxEdge: 1600 },
    high: { q: 0.78, scale: 1.7, maxEdge: 2200 },
  } as const;
  const { q, scale, maxEdge } = presets[quality];
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const longEdge = Math.max(base.width, base.height);
    const fit = Math.min(scale, maxEdge / Math.max(1, longEdge));
    const viewport = page.getViewport({ scale: fit });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d")!;
    // White fill avoids black transparency in JPEG
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    // Mild sharpen via contrast for low quality scans
    if (quality === "low") {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let p = 0; p < d.length; p += 4) {
        d[p] = Math.min(255, d[p] * 1.04);
        d[p + 1] = Math.min(255, d[p + 1] * 1.04);
        d[p + 2] = Math.min(255, d[p + 2] * 1.04);
      }
      ctx.putImageData(img, 0, 0);
    }
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", q)
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const img = await out.embedJpg(bytes);
    // Preserve original page size in PDF points
    const pdfPage = out.addPage([base.width, base.height]);
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width: base.width,
      height: base.height,
    });
    page.cleanup();
  }
  doc.destroy();
  const bytes = await out.save({ useObjectStreams: true });
  return {
    bytes,
    originalSize: source.byteLength,
    newSize: bytes.byteLength,
    pageCount: out.getPageCount(),
    scaleUsed: scale,
    jpegQuality: q,
  };
}

export async function redactRegions(
  source: ArrayBuffer,
  regions: { pageIndex: number; x: number; y: number; w: number; h: number }[],
  opts: { hardWipe?: boolean } = {}
): Promise<Uint8Array> {
  const hardWipe = opts.hardWipe !== false;
  const byPage = new Map<number, typeof regions>();
  for (const r of regions) {
    const list = byPage.get(r.pageIndex) || [];
    list.push(r);
    byPage.set(r.pageIndex, list);
  }

  if (hardWipe && byPage.size > 0) {
    // Rasterize affected pages with black boxes burned in (removes underlying text/images).
    ensurePdfWorker();
    const jsDoc = await loadPdfDocument(source.slice(0));
    const src = await loadPdf(source);
    const out = await PDFDocument.create();
    const all = src.getPageIndices();
    for (const i of all) {
      if (!byPage.has(i)) {
        const [copied] = await out.copyPages(src, [i]);
        out.addPage(copied);
        continue;
      }
      const page = await jsDoc.getPage(i + 1);
      const scale = 2;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      ctx.fillStyle = "#000";
      for (const r of byPage.get(i)!) {
        ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
      }
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.92)
      );
      const jpg = new Uint8Array(await blob.arrayBuffer());
      const img = await out.embedJpg(jpg);
      const base = page.getViewport({ scale: 1 });
      const pdfPage = out.addPage([base.width, base.height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      page.cleanup();
    }
    jsDoc.destroy();
    return out.save({ useObjectStreams: true });
  }

  const src = await loadPdf(source);
  const pages = src.getPages();
  for (const r of regions) {
    const page = pages[r.pageIndex];
    if (!page) continue;
    const { height } = page.getSize();
    const y = height - r.y - r.h;
    page.drawRectangle({
      x: r.x,
      y,
      width: r.w,
      height: r.h,
      color: rgb(0, 0, 0),
      borderWidth: 0,
    });
  }
  return src.save();
}

export async function extractTextFromPdf(
  source: ArrayBuffer
): Promise<{ page: number; text: string }[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const result: { page: number; text: string }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    result.push({ page: i, text });
    page.cleanup();
  }
  doc.destroy();
  return result;
}

export async function getPageCount(source: ArrayBuffer): Promise<number> {
  const src = await loadPdf(source);
  return src.getPageCount();
}

export { pdfjs };
