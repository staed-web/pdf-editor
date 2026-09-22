/**
 * Extra client-side PDF ops for InstantPDFEdit tools.
 * All processing stays in the browser — no server uploads.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PageSizes,
  PDFName,
  PDFDict,
  PDFArray,
  PDFHexString,
  PDFString,
} from "pdf-lib";
import JSZip from "jszip";
import { ensurePdfWorker, loadPdfDocument, pdfjs } from "./loader";
import {
  loadPdf,
  renderPdfPages,
  extractTextFromPdf,
  imagesToPdf,
} from "./ops";

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

/** N-up imposition: place n source pages onto each output sheet */
export async function nUpPdf(
  source: ArrayBuffer,
  n: 2 | 4 | 6 | 9,
  opts?: { pageSize?: "a4" | "letter"; landscape?: boolean }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const [baseW, baseH] =
    opts?.pageSize === "letter" ? PageSizes.Letter : PageSizes.A4;
  const landscape = opts?.landscape ?? n !== 2;
  const sheetW = landscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
  const sheetH = landscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);

  const layouts: Record<number, [number, number]> = {
    2: [1, 2],
    4: [2, 2],
    6: [2, 3],
    9: [3, 3],
  };
  const [cols, rows] = layouts[n];
  const cellW = sheetW / cols;
  const cellH = sheetH / rows;
  const indices = src.getPageIndices();
  const saved = await src.save();
  const pageObjs = [];
  for (let i = 0; i < indices.length; i++) {
    const [embeddedPage] = await out.embedPdf(saved, [i]);
    pageObjs.push(embeddedPage);
  }

  for (let i = 0; i < pageObjs.length; i += n) {
    const sheet = out.addPage([sheetW, sheetH]);
    for (let k = 0; k < n && i + k < pageObjs.length; k++) {
      const ep = pageObjs[i + k];
      const col = k % cols;
      const row = Math.floor(k / cols);
      // pdf y from bottom: row 0 at top
      const x = col * cellW;
      const y = sheetH - (row + 1) * cellH;
      const scale = Math.min(cellW / ep.width, cellH / ep.height) * 0.96;
      const w = ep.width * scale;
      const h = ep.height * scale;
      sheet.drawPage(ep, {
        x: x + (cellW - w) / 2,
        y: y + (cellH - h) / 2,
        xScale: scale,
        yScale: scale,
      });
    }
  }
  out.setProducer("InstantPDFEdit");
  return out.save({ useObjectStreams: true });
}

/** Booklet imposition (saddle-stitch fold order) */
export async function bookletPdf(
  source: ArrayBuffer,
  opts?: { pageSize?: "a4" | "letter" }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  let count = src.getPageCount();
  // Pad to multiple of 4
  const pad = (4 - (count % 4)) % 4;
  const out = await PDFDocument.create();
  const [baseW, baseH] =
    opts?.pageSize === "letter" ? PageSizes.Letter : PageSizes.A4;
  const sheetW = Math.max(baseW, baseH);
  const sheetH = Math.min(baseW, baseH);
  const halfW = sheetW / 2;

  // Build page list with blank pads
  const total = count + pad;
  const sheets = total / 4;
  const embeds: Awaited<ReturnType<typeof out.embedPdf>>[0][] = [];
  const saved = await src.save();
  for (let i = 0; i < count; i++) {
    const [ep] = await out.embedPdf(saved, [i]);
    embeds.push(ep);
  }

  for (let s = 0; s < sheets; s++) {
    // Front: total-2s, 2s+1 | Back: 2s+2, total-2s-1  (1-based thinking)
    // 0-based: outerL = total-1-2s, outerR = 2s, innerL = 2s+1, innerR = total-2-2s
    const pairs: [number, number][] = [
      [total - 1 - 2 * s, 2 * s],
      [2 * s + 1, total - 2 - 2 * s],
    ];
    for (const [leftIdx, rightIdx] of pairs) {
      const sheet = out.addPage([sheetW, sheetH]);
      for (const [idx, side] of [
        [leftIdx, 0],
        [rightIdx, 1],
      ] as const) {
        if (idx >= count) continue; // blank pad
        const ep = embeds[idx];
        const scale = Math.min(halfW / ep.width, sheetH / ep.height) * 0.94;
        const w = ep.width * scale;
        const h = ep.height * scale;
        const x = side * halfW + (halfW - w) / 2;
        const y = (sheetH - h) / 2;
        sheet.drawPage(ep, { x, y, xScale: scale, yScale: scale });
      }
    }
  }
  out.setProducer("InstantPDFEdit");
  return out.save({ useObjectStreams: true });
}

export async function reversePages(source: ArrayBuffer): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const order = src.getPageIndices().reverse();
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export async function removeBlankPages(
  source: ArrayBuffer,
  threshold = 0.985
): Promise<{ bytes: Uint8Array; removed: number; kept: number }> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const keep: number[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bright = 0;
    const total = canvas.width * canvas.height;
    for (let p = 0; p < data.length; p += 4) {
      const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
      if (lum > 245) bright++;
    }
    if (bright / total < threshold) keep.push(i - 1);
    page.cleanup();
  }
  const totalPages = doc.numPages;
  doc.destroy();
  if (keep.length === 0) throw new Error("All pages look blank — lower threshold?");
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keep);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  return {
    bytes,
    removed: totalPages - keep.length,
    kept: keep.length,
  };
}

export async function duplicatePages(
  source: ArrayBuffer,
  pageIndices0: number[],
  times = 1
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const all = src.getPageIndices();
  const copied = await out.copyPages(src, all);
  copied.forEach((p) => out.addPage(p));
  for (let t = 0; t < times; t++) {
    for (const idx of pageIndices0) {
      const [p] = await out.copyPages(src, [idx]);
      out.addPage(p);
    }
  }
  return out.save();
}

export async function addBlankPages(
  source: ArrayBuffer,
  opts: {
    count: number;
    position: "start" | "end" | "after";
    afterPage?: number; // 1-based when position=after
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const pages = src.getPages();
  const { width, height } = pages[0]?.getSize() ?? { width: 595, height: 842 };
  const blanks = () => {
    for (let i = 0; i < opts.count; i++) out.addPage([width, height]);
  };
  if (opts.position === "start") {
    blanks();
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  } else if (opts.position === "end") {
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
    blanks();
  } else {
    const after = Math.max(0, (opts.afterPage ?? 1) - 1);
    const indices = src.getPageIndices();
    const before = indices.slice(0, after + 1);
    const afterIdx = indices.slice(after + 1);
    const c1 = await out.copyPages(src, before);
    c1.forEach((p) => out.addPage(p));
    blanks();
    if (afterIdx.length) {
      const c2 = await out.copyPages(src, afterIdx);
      c2.forEach((p) => out.addPage(p));
    }
  }
  return out.save();
}

export async function splitEveryN(
  source: ArrayBuffer,
  n: number
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const src = await loadPdf(source);
  const count = src.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];
  for (let start = 0; start < count; start += n) {
    const end = Math.min(start + n, count);
    const out = await PDFDocument.create();
    const indices = [];
    for (let i = start; i < end; i++) indices.push(i);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    results.push({
      name: `part_${start + 1}-${end}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}

export async function splitByMaxBytes(
  source: ArrayBuffer,
  maxBytes: number
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const src = await loadPdf(source);
  const count = src.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];
  let start = 0;
  let part = 1;
  while (start < count) {
    let end = start;
    let lastBytes: Uint8Array | null = null;
    while (end < count) {
      const out = await PDFDocument.create();
      const indices = [];
      for (let i = start; i <= end; i++) indices.push(i);
      const copied = await out.copyPages(src, indices);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      if (bytes.byteLength > maxBytes && end > start) break;
      lastBytes = bytes;
      end++;
      if (bytes.byteLength > maxBytes) break;
    }
    if (!lastBytes) {
      // single page still over — take one page
      const out = await PDFDocument.create();
      const [p] = await out.copyPages(src, [start]);
      out.addPage(p);
      lastBytes = await out.save();
      end = start + 1;
    }
    results.push({ name: `part_${part}.pdf`, bytes: lastBytes });
    part++;
    start = end;
  }
  return results;
}

export async function splitByBookmarksOrEveryN(
  source: ArrayBuffer,
  fallbackEveryN = 10
): Promise<{ name: string; bytes: Uint8Array; note: string }> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  let outline: { title: string; pageIndex: number }[] = [];
  try {
    const root = await doc.getOutline();
    if (root?.length) {
      const walk = async (
        items: Awaited<ReturnType<typeof doc.getOutline>>,
        depth = 0
      ) => {
        if (!items || depth > 2) return;
        for (const item of items) {
          let pageIndex = 0;
          try {
            if (item.dest) {
              const dest =
                typeof item.dest === "string"
                  ? await doc.getDestination(item.dest)
                  : item.dest;
              if (dest) {
                const ref = Array.isArray(dest) ? dest[0] : null;
                if (ref) {
                  pageIndex = await doc.getPageIndex(ref);
                }
              }
            }
          } catch {
            /* */
          }
          outline.push({ title: item.title || `Section`, pageIndex });
          if (item.items?.length) await walk(item.items, depth + 1);
        }
      };
      await walk(root);
    }
  } catch {
    /* */
  }
  doc.destroy();

  if (outline.length >= 2) {
    // Unique sorted page starts
    const starts = [
      ...new Set(outline.map((o) => o.pageIndex).filter((i) => i >= 0)),
    ].sort((a, b) => a - b);
    const src = await loadPdf(source);
    const count = src.getPageCount();
    const results: { name: string; bytes: Uint8Array }[] = [];
    for (let i = 0; i < starts.length; i++) {
      const from = starts[i];
      const to = (starts[i + 1] ?? count) - 1;
      if (to < from) continue;
      const indices = [];
      for (let p = from; p <= to; p++) indices.push(p);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, indices);
      copied.forEach((p) => out.addPage(p));
      const title = (outline.find((o) => o.pageIndex === from)?.title || `part_${i + 1}`)
        .replace(/[^\w\- ]+/g, "")
        .slice(0, 40);
      results.push({
        name: `${String(i + 1).padStart(2, "0")}_${title || "section"}.pdf`,
        bytes: await out.save(),
      });
    }
    const zip = new JSZip();
    results.forEach((r) => zip.file(r.name, r.bytes));
    const blob = await zip.generateAsync({ type: "uint8array" });
    return {
      bytes: blob,
      name: "split-by-bookmarks.zip",
      note: `Split into ${results.length} sections from bookmarks`,
    };
  }

  const parts = await splitEveryN(source, fallbackEveryN);
  const zip = new JSZip();
  parts.forEach((r) => zip.file(r.name, r.bytes));
  const blob = await zip.generateAsync({ type: "uint8array" });
  return {
    bytes: blob,
    name: "split-every-n.zip",
    note: `No bookmarks found — split every ${fallbackEveryN} pages`,
  };
}

/** Side-by-side compare: text + page image diff % */
export async function comparePdfs(
  a: ArrayBuffer,
  b: ArrayBuffer
): Promise<{
  report: string;
  textDiffPct: number;
  imageDiffPct: number;
  previewA?: string;
  previewB?: string;
  heatmap?: string;
}> {
  const textA = await extractTextFromPdf(a);
  const textB = await extractTextFromPdf(b);
  const fullA = textA.map((p) => p.text).join("\n");
  const fullB = textB.map((p) => p.text).join("\n");
  const wordsA = new Set(fullA.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(fullB.toLowerCase().split(/\W+/).filter(Boolean));
  let inter = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) inter++;
  });
  const union = new Set([...wordsA, ...wordsB]).size || 1;
  const textSim = inter / union;
  const textDiffPct = Math.round((1 - textSim) * 1000) / 10;

  // Image compare first page at low res
  ensurePdfWorker();
  const docA = await loadPdfDocument(a);
  const docB = await loadPdfDocument(b);
  const pageA = await docA.getPage(1);
  const pageB = await docB.getPage(1);
  const scale = 0.5;
  const vpA = pageA.getViewport({ scale });
  const vpB = pageB.getViewport({ scale });
  const w = Math.min(Math.floor(vpA.width), Math.floor(vpB.width), 400);
  const h = Math.min(Math.floor(vpA.height), Math.floor(vpB.height), 560);
  const cA = document.createElement("canvas");
  const cB = document.createElement("canvas");
  cA.width = w;
  cA.height = h;
  cB.width = w;
  cB.height = h;
  await pageA.render({
    canvasContext: cA.getContext("2d")!,
    viewport: pageA.getViewport({
      scale: w / pageA.getViewport({ scale: 1 }).width,
    }),
  }).promise;
  await pageB.render({
    canvasContext: cB.getContext("2d")!,
    viewport: pageB.getViewport({
      scale: w / pageB.getViewport({ scale: 1 }).width,
    }),
  }).promise;
  const dA = cA.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dB = cB.getContext("2d")!.getImageData(0, 0, w, h).data;
  let diff = 0;
  const px = w * h;
  for (let i = 0; i < dA.length; i += 4) {
    const dr = Math.abs(dA[i] - dB[i]);
    const dg = Math.abs(dA[i + 1] - dB[i + 1]);
    const db = Math.abs(dA[i + 2] - dB[i + 2]);
    if (dr + dg + db > 40) diff++;
  }
  const imageDiffPct = Math.round((diff / px) * 1000) / 10;
  const previewA = cA.toDataURL("image/jpeg", 0.7);
  const previewB = cB.toDataURL("image/jpeg", 0.7);

  // Heatmap: red where pixels differ, dimmed A underneath
  const cH = document.createElement("canvas");
  cH.width = w;
  cH.height = h;
  const ctxH = cH.getContext("2d")!;
  ctxH.drawImage(cA, 0, 0);
  const heat = ctxH.getImageData(0, 0, w, h);
  const hd = heat.data;
  for (let i = 0; i < dA.length; i += 4) {
    const dr = Math.abs(dA[i] - dB[i]);
    const dg = Math.abs(dA[i + 1] - dB[i + 1]);
    const db = Math.abs(dA[i + 2] - dB[i + 2]);
    const changed = dr + dg + db > 40;
    if (changed) {
      hd[i] = 220;
      hd[i + 1] = 40;
      hd[i + 2] = 40;
      hd[i + 3] = 220;
    } else {
      hd[i] = Math.round(dA[i] * 0.55);
      hd[i + 1] = Math.round(dA[i + 1] * 0.55);
      hd[i + 2] = Math.round(dA[i + 2] * 0.55);
    }
  }
  ctxH.putImageData(heat, 0, 0);
  const heatmap = cH.toDataURL("image/jpeg", 0.75);

  pageA.cleanup();
  pageB.cleanup();
  docA.destroy();
  docB.destroy();

  const report = [
    `# PDF Compare Report`,
    ``,
    `- Pages A: ${textA.length}`,
    `- Pages B: ${textB.length}`,
    `- Text difference (word Jaccard): ${textDiffPct}%`,
    `- Page-1 image difference: ${imageDiffPct}%`,
    ``,
    `## Text A (excerpt)`,
    fullA.slice(0, 2000),
    ``,
    `## Text B (excerpt)`,
    fullB.slice(0, 2000),
  ].join("\n");

  return { report, textDiffPct, imageDiffPct, previewA, previewB, heatmap };
}

/** Re-render pages in grayscale */
export async function grayscalePdf(
  source: ArrayBuffer,
  quality = 0.85
): Promise<Uint8Array> {
  return canvasFilterPdf(source, (ctx, w, h) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
  }, quality);
}

export async function invertPdf(
  source: ArrayBuffer,
  quality = 0.85
): Promise<Uint8Array> {
  return canvasFilterPdf(source, (ctx, w, h) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    ctx.putImageData(img, 0, 0);
  }, quality);
}

async function canvasFilterPdf(
  source: ArrayBuffer,
  filter: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  quality = 0.85,
  scale = 1.5
): Promise<Uint8Array> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    filter(ctx, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const img = await out.embedJpg(bytes);
    const p = out.addPage([img.width, img.height]);
    p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    page.cleanup();
  }
  doc.destroy();
  return out.save({ useObjectStreams: true });
}

export async function dpiResamplePdf(
  source: ArrayBuffer,
  dpi: 72 | 100 | 150 | 200 | 300,
  quality = 0.8
): Promise<Uint8Array> {
  const scale = dpi / 72;
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const img = await out.embedJpg(bytes);
    // Keep original page size in points
    const base = page.getViewport({ scale: 1 });
    const p = out.addPage([base.width, base.height]);
    p.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    page.cleanup();
  }
  doc.destroy();
  return out.save({ useObjectStreams: true });
}

/** Best-effort structure rewrite / object streams (not true Fast Web View linearization) */
export async function optimizeStructure(
  source: ArrayBuffer
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  try {
    const t = src.getTitle();
    if (t) out.setTitle(t);
    const a = src.getAuthor();
    if (a) out.setAuthor(a);
  } catch {
    /* */
  }
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  return out.save({ useObjectStreams: true });
}

export async function pdfToHtml(source: ArrayBuffer): Promise<string> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const parts: string[] = [
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDF export</title>`,
    `<style>body{font-family:system-ui,sans-serif;background:#f4f4f5;margin:0;padding:16px}`,
    `.page{position:relative;background:#fff;margin:16px auto;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden}`,
    `.t{position:absolute;white-space:pre;transform-origin:0 0;color:#111}</style></head><body>`,
  ];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.25 });
    const content = await page.getTextContent();
    parts.push(
      `<div class="page" style="width:${viewport.width}px;height:${viewport.height}px">`
    );
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const tx = item.transform;
      const x = tx[4];
      const y = viewport.height - tx[5];
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;
      const escaped = item.str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      parts.push(
        `<span class="t" style="left:${x}px;top:${y - fontSize}px;font-size:${fontSize}px">${escaped}</span>`
      );
    }
    parts.push(`</div>`);
    page.cleanup();
  }
  doc.destroy();
  parts.push(`</body></html>`);
  return parts.join("\n");
}

export async function pdfToMarkdown(source: ArrayBuffer): Promise<string> {
  const pages = await extractTextFromPdf(source);
  return pages
    .map((p) => `## Page ${p.page}\n\n${p.text.trim()}\n`)
    .join("\n");
}

export async function pdfToPptx(source: ArrayBuffer): Promise<Uint8Array> {
  const pages = await renderPdfPages(source, {
    format: "jpeg",
    quality: 0.88,
    scale: 1.5,
  });
  // Minimal PPTX: slide per image via OOXML + JSZip
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${pages.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n")}
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );
  const slideRels = pages
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
    )
    .join("\n");
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slideRels}
</Relationships>`
  );
  const sldIdLst = pages
    .map(
      (_, i) =>
        `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`
    )
    .join("");
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${sldIdLst}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
  );
  for (let i = 0; i < pages.length; i++) {
    zip.file(`ppt/media/image${i + 1}.jpeg`, pages[i].bytes);
    zip.file(
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.jpeg"/>
</Relationships>`
    );
    zip.file(
      `ppt/slides/slide${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="Image"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`
    );
  }
  return zip.generateAsync({ type: "uint8array" });
}

export async function pdfToEpub(source: ArrayBuffer): Promise<Uint8Array> {
  const pages = await extractTextFromPdf(source);
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`
  );
  const manifest = pages
    .map(
      (p) =>
        `<item id="p${p.page}" href="page${p.page}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n");
  const spine = pages.map((p) => `<itemref idref="p${p.page}"/>`).join("\n");
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>PDF Export</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">instantpdfedit-${Date.now()}</dc:identifier>
    <dc:creator>InstantPDFEdit</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">${spine}</spine>
</package>`
  );
  const nav = pages
    .map(
      (p) =>
        `<navPoint id="n${p.page}" playOrder="${p.page}"><navLabel><text>Page ${p.page}</text></navLabel><content src="page${p.page}.xhtml"/></navPoint>`
    )
    .join("\n");
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="instantpdfedit"/></head>
  <docTitle><text>PDF Export</text></docTitle>
  <navMap>${nav}</navMap>
</ncx>`
  );
  for (const p of pages) {
    const body = (p.text || "(no extractable text)")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    zip.file(
      `OEBPS/page${p.page}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Page ${p.page}</title></head>
<body><h1>Page ${p.page}</h1><p>${body}</p></body></html>`
    );
  }
  return zip.generateAsync({ type: "uint8array" });
}

export async function textToPdf(
  text: string,
  opts?: { title?: string; fontSize?: number }
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontSize = opts?.fontSize ?? 11;
  const [pageW, pageH] = PageSizes.A4;
  const margin = 48;
  const maxWidth = pageW - margin * 2;
  const lineHeight = fontSize * 1.4;
  const lines: string[] = [];
  for (const para of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!para) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
  }
  let page = out.addPage([pageW, pageH]);
  let y = pageH - margin;
  for (const line of lines) {
    if (y < margin) {
      page = out.addPage([pageW, pageH]);
      y = pageH - margin;
    }
    if (line) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    y -= lineHeight;
  }
  if (opts?.title) out.setTitle(opts.title);
  out.setProducer("InstantPDFEdit");
  return out.save();
}

export async function markdownToPdf(md: string): Promise<Uint8Array> {
  // Simple MD → plain text with heading markers, then textToPdf
  const plain = md
    .replace(/^### (.+)$/gm, "\n$1\n")
    .replace(/^## (.+)$/gm, "\n\n$1\n")
    .replace(/^# (.+)$/gm, "\n\n$1\n\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*] /gm, "• ");
  return textToPdf(plain, { title: "Markdown export", fontSize: 11 });
}

export async function csvToPdf(csv: string): Promise<Uint8Array> {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map((r) => {
      // naive CSV split
      const cells: string[] = [];
      let cur = "";
      let q = false;
      for (const ch of r) {
        if (ch === '"') q = !q;
        else if (ch === "," && !q) {
          cells.push(cur);
          cur = "";
        } else cur += ch;
      }
      cells.push(cur);
      return cells;
    });
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const [pageW, pageH] = PageSizes.A4;
  const margin = 36;
  const fontSize = 8;
  const cols = Math.max(...rows.map((r) => r.length), 1);
  const colW = (pageW - margin * 2) / cols;
  let page = out.addPage([pageW, pageH]);
  let y = pageH - margin;
  for (const row of rows) {
    if (y < margin + 12) {
      page = out.addPage([pageW, pageH]);
      y = pageH - margin;
    }
    for (let c = 0; c < cols; c++) {
      const cell = (row[c] || "").slice(0, 40);
      page.drawText(cell, {
        x: margin + c * colW,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: colW - 4,
      });
    }
    y -= fontSize * 1.6;
  }
  out.setProducer("InstantPDFEdit");
  return out.save();
}

export async function svgToPdf(svgText: string): Promise<Uint8Array> {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const b64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return imagesToPdf([{ bytes, type: "png" }]);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function webpFileToPdf(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return imagesToPdf([{ bytes, type: "webp" }]);
}

export async function heicToPdf(file: File): Promise<Uint8Array> {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return imagesToPdf([{ bytes, type: "jpg" }]);
}

export async function addBatesNumbers(
  source: ArrayBuffer,
  opts: {
    prefix: string;
    start: number;
    digits: number;
    position:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    fontSize: number;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  const pages = src.getPages();
  pages.forEach((page, i) => {
    const n = String(opts.start + i).padStart(opts.digits, "0");
    const text = `${opts.prefix}${n}`;
    const { width, height } = page.getSize();
    const tw = font.widthOfTextAtSize(text, opts.fontSize);
    const pad = 24;
    let x = pad;
    let y = pad;
    if (opts.position.includes("right")) x = width - tw - pad;
    if (opts.position.includes("top")) y = height - opts.fontSize - pad;
    page.drawText(text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
  });
  return src.save();
}

export async function addBackground(
  source: ArrayBuffer,
  opts: { color?: string; imageBytes?: Uint8Array; imageType?: "png" | "jpg" }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  let img = null as Awaited<ReturnType<typeof src.embedPng>> | null;
  if (opts.imageBytes) {
    img =
      opts.imageType === "jpg"
        ? await src.embedJpg(opts.imageBytes)
        : await src.embedPng(opts.imageBytes);
  }
  const c = hexToRgb(opts.color || "#fff8e7");
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    // Draw behind by using a full-page rect — note: draws on top of content in pdf-lib
    // For true underlay we rebuild with draw first then embed page
  }
  // Rebuild: for each page, new page with bg then draw embedded source page
  const out = await PDFDocument.create();
  const saved = await src.save();
  for (let i = 0; i < src.getPageCount(); i++) {
    const [ep] = await out.embedPdf(saved, [i]);
    const page = out.addPage([ep.width, ep.height]);
    if (img) {
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: ep.width,
        height: ep.height,
        opacity: 0.35,
      });
    } else {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: ep.width,
        height: ep.height,
        color: rgb(c.r, c.g, c.b),
      });
    }
    page.drawPage(ep, {
      x: 0,
      y: 0,
      xScale: 1,
      yScale: 1,
    });
  }
  return out.save();
}

export async function overlayPdf(
  base: ArrayBuffer,
  stamp: ArrayBuffer,
  opts?: { opacity?: number; everyPage?: boolean }
): Promise<Uint8Array> {
  const src = await loadPdf(base);
  const stampDoc = await loadPdf(stamp);
  const stampSaved = await stampDoc.save();
  const [stampPage] = await src.embedPdf(stampSaved, [0]);
  const opacity = opts?.opacity ?? 1;
  const pages = src.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (!opts?.everyPage && i > 0) break;
    const page = pages[i];
    const { width, height } = page.getSize();
    const scale = Math.min(width / stampPage.width, height / stampPage.height);
    const w = stampPage.width * scale;
    const h = stampPage.height * scale;
    page.drawPage(stampPage, {
      x: (width - w) / 2,
      y: (height - h) / 2,
      xScale: scale,
      yScale: scale,
      opacity,
    });
  }
  return src.save();
}

export async function underlayPdf(
  base: ArrayBuffer,
  under: ArrayBuffer
): Promise<Uint8Array> {
  const src = await loadPdf(base);
  const underDoc = await loadPdf(under);
  const underSaved = await underDoc.save();
  const out = await PDFDocument.create();
  const baseSaved = await src.save();
  const [uEmb] = await out.embedPdf(underSaved, [0]);
  for (let i = 0; i < src.getPageCount(); i++) {
    const [ep] = await out.embedPdf(baseSaved, [i]);
    const page = out.addPage([ep.width, ep.height]);
    const scale = Math.min(ep.width / uEmb.width, ep.height / uEmb.height);
    page.drawPage(uEmb, {
      x: (ep.width - uEmb.width * scale) / 2,
      y: (ep.height - uEmb.height * scale) / 2,
      xScale: scale,
      yScale: scale,
      opacity: 0.5,
    });
    page.drawPage(ep, { x: 0, y: 0, xScale: 1, yScale: 1 });
  }
  return out.save();
}

export async function stampQrOrBarcode(
  source: ArrayBuffer,
  opts: {
    kind: "qr" | "code128";
    value: string;
    position:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    size: number;
  }
): Promise<Uint8Array> {
  let pngBytes: Uint8Array;
  if (opts.kind === "qr") {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(opts.value, {
      margin: 1,
      width: 256,
      errorCorrectionLevel: "M",
    });
    const b64 = dataUrl.split(",")[1];
    pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } else {
    pngBytes = drawCode128Png(opts.value, 400, 80);
  }
  const src = await loadPdf(source);
  const img = await src.embedPng(pngBytes);
  const size = opts.size;
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    const pad = 24;
    let x = pad;
    let y = pad;
    if (opts.position.includes("right")) x = width - size - pad;
    if (opts.position.includes("top")) y = height - size - pad;
    const h = opts.kind === "qr" ? size : size * 0.35;
    page.drawImage(img, { x, y, width: size, height: h });
  }
  return src.save();
}

/** Minimal Code128-B barcode as PNG via canvas */
function drawCode128Png(text: string, w: number, h: number): Uint8Array {
  // Simplified: draw bars from char codes (visual barcode, not guaranteed scannable for all)
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  const payload = text.slice(0, 24);
  let x = 8;
  // start pattern visual
  const patterns = [2, 1, 1, 2, 3, 2];
  for (const ch of "Ì" + payload + "Î") {
    const code = ch.charCodeAt(0);
    for (let i = 0; i < 6; i++) {
      const barW = ((code + i * 7) % 3) + 1;
      if (i % 2 === 0) ctx.fillRect(x, 4, barW, h - 20);
      x += barW;
    }
    x += 1;
  }
  ctx.font = "10px monospace";
  ctx.fillText(payload, 8, h - 4);
  const dataUrl = canvas.toDataURL("image/png");
  const b64 = dataUrl.split(",")[1];
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Estimate skew angle (degrees) via horizontal projection variance. */
function estimateSkewAngle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): number {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Downsample binary row ink counts at candidate angles
  const angles: number[] = [];
  for (let a = -8; a <= 8; a += 0.5) angles.push(a);
  let best = 0;
  let bestScore = -1;
  for (const ang of angles) {
    const rad = (ang * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const bins = new Float64Array(h);
    // Sample every 3rd pixel for speed
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 3) {
        const i = (y * w + x) * 4;
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (g > 200) continue; // background
        const yr = Math.round(y * cos + x * sin);
        if (yr >= 0 && yr < h) bins[yr]++;
      }
    }
    // Score = variance of row ink (text lines → sharp peaks when upright)
    let mean = 0;
    let n = 0;
    for (let i = 0; i < h; i++) {
      if (bins[i] > 0) {
        mean += bins[i];
        n++;
      }
    }
    mean = n ? mean / n : 0;
    let varSum = 0;
    for (let i = 0; i < h; i++) {
      const diff = bins[i] - mean;
      varSum += diff * diff;
    }
    if (varSum > bestScore) {
      bestScore = varSum;
      best = ang;
    }
  }
  // Ignore tiny noise angles
  return Math.abs(best) < 0.25 ? 0 : best;
}

function rotateCanvas(
  src: HTMLCanvasElement,
  angleDeg: number
): HTMLCanvasElement {
  if (!angleDeg) return src;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = Math.ceil(w * cos + h * sin);
  out.height = Math.ceil(w * sin + h * cos);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(-rad); // negate: positive detected skew → rotate opposite
  ctx.drawImage(src, -w / 2, -h / 2);
  return out;
}

/** Deskew pages: detect skew angle + rotate + contrast boost. */
export async function deskewPdf(
  source: ArrayBuffer
): Promise<{ bytes: Uint8Array; angles: number[] }> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const out = await PDFDocument.create();
  const angles: number[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const angle = estimateSkewAngle(ctx, canvas.width, canvas.height);
    angles.push(angle);
    let work = rotateCanvas(canvas, angle);
    // Mild contrast boost after straighten
    const wctx = work.getContext("2d")!;
    const img = wctx.getImageData(0, 0, work.width, work.height);
    const d = img.data;
    const factor = 1.25;
    const intercept = 128 * (1 - factor);
    for (let p = 0; p < d.length; p += 4) {
      d[p] = Math.min(255, Math.max(0, d[p] * factor + intercept));
      d[p + 1] = Math.min(255, Math.max(0, d[p + 1] * factor + intercept));
      d[p + 2] = Math.min(255, Math.max(0, d[p + 2] * factor + intercept));
    }
    wctx.putImageData(img, 0, 0);
    const blob: Blob = await new Promise((res) =>
      work.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const jpg = await out.embedJpg(bytes);
    const base = page.getViewport({ scale: 1 });
    // Keep original page size; image may be slightly larger after rotate
    const pdfPage = out.addPage([base.width, base.height]);
    pdfPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: base.width,
      height: base.height,
    });
    page.cleanup();
  }
  doc.destroy();
  out.setProducer("InstantPDFEdit");
  return { bytes: await out.save({ useObjectStreams: true }), angles };
}

export async function scanEnhance(
  source: ArrayBuffer,
  mode: "contrast" | "threshold" | "deskew-approx" = "contrast"
): Promise<Uint8Array> {
  if (mode === "deskew-approx") {
    const { bytes } = await deskewPdf(source);
    return bytes;
  }
  return canvasFilterPdf(
    source,
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      if (mode === "threshold") {
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = g > 160 ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
      } else {
        const factor = 1.45;
        const intercept = 128 * (1 - factor);
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.min(255, Math.max(0, d[i] * factor + intercept));
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * factor + intercept));
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * factor + intercept));
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    0.9,
    1.6
  );
}

export async function removeAnnotations(
  source: ArrayBuffer
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  for (const page of src.getPages()) {
    try {
      const node = page.node;
      node.delete(PDFName.of("Annots"));
    } catch {
      /* */
    }
  }
  try {
    const form = src.getForm();
    const fields = form.getFields();
    for (const f of fields) {
      try {
        form.removeField(f);
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
  return src.save({ useObjectStreams: true });
}

export async function extractEmbeddedImages(
  source: ArrayBuffer
): Promise<{ name: string; bytes: Uint8Array; mime: string }[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const results: { name: string; bytes: Uint8Array; mime: string }[] = [];
  let imgIdx = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ops: any = await page.getOperatorList();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const common: any = await (page as any).commonObjs;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objs: any = (page as any).objs;
      const fns: number[] = ops.fnArray || [];
      const args: unknown[] = ops.argsArray || [];
      const OPS = pdfjs.OPS;
      const paintOps = new Set([
        OPS.paintImageXObject,
        OPS.paintInlineImageXObject,
        OPS.paintImageMaskXObject,
        OPS.paintImageXObjectRepeat,
        OPS.paintInlineImageXObjectGroup,
      ]);
      const seen = new Set<string>();
      for (let k = 0; k < fns.length; k++) {
        const fn = fns[k];
        if (!paintOps.has(fn)) continue;
        {
          const arg = args[k];
          const name =
            Array.isArray(arg) && typeof arg[0] === "string"
              ? arg[0]
              : typeof arg === "string"
                ? arg
                : null;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          let imgData: { data?: Uint8ClampedArray; width?: number; height?: number; kind?: number } | null = null;
          try {
            imgData = await new Promise((resolve) => {
              try {
                if (objs?.has?.(name)) {
                  objs.get(name, (data: unknown) => resolve(data as typeof imgData));
                } else if (common?.has?.(name)) {
                  common.get(name, (data: unknown) => resolve(data as typeof imgData));
                } else {
                  resolve(null);
                }
              } catch {
                resolve(null);
              }
            });
          } catch {
            /* */
          }
          if (imgData?.data && imgData.width && imgData.height) {
            const c = document.createElement("canvas");
            c.width = imgData.width;
            c.height = imgData.height;
            const ctx = c.getContext("2d")!;
            const rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
            const src = imgData.data;
            // kind 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP (pdf.js ImageKind)
            const kind = imgData.kind ?? (src.length >= imgData.width * imgData.height * 4 ? 3 : 2);
            if (kind === 3 || src.length >= imgData.width * imgData.height * 4) {
              rgba.set(src.subarray(0, rgba.length));
            } else if (kind === 2 || src.length >= imgData.width * imgData.height * 3) {
              for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) {
                rgba[p] = src[q];
                rgba[p + 1] = src[q + 1];
                rgba[p + 2] = src[q + 2];
                rgba[p + 3] = 255;
              }
            } else {
              for (let p = 0, q = 0; p < rgba.length; p += 4, q++) {
                const v = src[q] ?? 0;
                rgba[p] = rgba[p + 1] = rgba[p + 2] = v;
                rgba[p + 3] = 255;
              }
            }
            ctx.putImageData(new ImageData(rgba, imgData.width, imgData.height), 0, 0);
            const blob: Blob = await new Promise((res) =>
              c.toBlob((b) => res(b!), "image/png")
            );
            imgIdx++;
            results.push({
              name: `img_p${i}_${imgIdx}.png`,
              bytes: new Uint8Array(await blob.arrayBuffer()),
              mime: "image/png",
            });
          }
        }
      }
    } catch {
      /* fall through to page render */
    }
    page.cleanup();
  }
  doc.destroy();

  // Always include page renders so the ZIP is never empty for image-less text PDFs
  if (results.length === 0) {
    const pages = await renderPdfPages(source, { format: "png", scale: 1.5 });
    return pages.map((p, i) => ({
      name: `page_${i + 1}.png`,
      bytes: p.bytes,
      mime: "image/png",
    }));
  }
  return results;
}

export type TextHit = {
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  str: string;
};

export async function findTextPositions(
  source: ArrayBuffer,
  query: string
): Promise<TextHit[]> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const q = query.toLowerCase();
  const hits: TextHit[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      if (!item.str.toLowerCase().includes(q) && item.str.toLowerCase() !== q)
        continue;
      // For partial match within item, still cover whole item
      if (!item.str.toLowerCase().includes(q)) continue;
      const tx = item.transform;
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;
      const x = tx[4];
      const y = tx[5];
      const w = item.width || fontSize * item.str.length * 0.5;
      hits.push({
        pageIndex: i - 1,
        x,
        y: y - 2,
        w: w + 4,
        h: fontSize + 4,
        str: item.str,
      });
    }
    page.cleanup();
  }
  doc.destroy();
  return hits;
}

export async function replaceTextOverlay(
  source: ArrayBuffer,
  find: string,
  replace: string
): Promise<{ bytes: Uint8Array; count: number }> {
  const hits = await findTextPositions(source, find);
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.Helvetica);
  const pages = src.getPages();
  for (const hit of hits) {
    const page = pages[hit.pageIndex];
    if (!page) continue;
    page.drawRectangle({
      x: hit.x - 1,
      y: hit.y - 1,
      width: Math.max(hit.w, font.widthOfTextAtSize(replace, hit.h - 4) + 4),
      height: hit.h,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawText(replace, {
      x: hit.x,
      y: hit.y + 2,
      size: Math.max(8, hit.h - 4),
      font,
      color: rgb(0, 0, 0),
    });
  }
  return { bytes: await src.save(), count: hits.length };
}

export async function sanitizePdf(
  source: ArrayBuffer
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => {
    try {
      p.node.delete(PDFName.of("Annots"));
    } catch {
      /* */
    }
    out.addPage(p);
  });
  out.setTitle("");
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  // Strip JS / OpenAction best-effort from catalog if accessible
  try {
    const catalog = out.catalog;
    catalog.delete(PDFName.of("OpenAction"));
    catalog.delete(PDFName.of("AA"));
    catalog.delete(PDFName.of("JavaScript"));
    catalog.delete(PDFName.of("JS"));
    catalog.delete(PDFName.of("EmbeddedFiles"));
    catalog.delete(PDFName.of("Names"));
  } catch {
    /* */
  }
  return out.save({ useObjectStreams: true });
}

export async function getMetadata(source: ArrayBuffer) {
  const src = await loadPdf(source);
  return {
    title: src.getTitle() || "",
    author: src.getAuthor() || "",
    subject: src.getSubject() || "",
    keywords: (src.getKeywords() || "").toString(),
    creator: src.getCreator() || "",
    producer: src.getProducer() || "",
    pageCount: src.getPageCount(),
  };
}

export async function setMetadata(
  source: ArrayBuffer,
  meta: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  if (meta.title !== undefined) src.setTitle(meta.title);
  if (meta.author !== undefined) src.setAuthor(meta.author);
  if (meta.subject !== undefined) src.setSubject(meta.subject);
  if (meta.keywords !== undefined)
    src.setKeywords(meta.keywords.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
  src.setModificationDate(new Date());
  return src.save();
}

export async function attachFilesToPdf(
  source: ArrayBuffer,
  files: { name: string; bytes: Uint8Array; mime?: string }[]
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  for (const f of files) {
    await src.attach(f.bytes, f.name, {
      mimeType: f.mime || "application/octet-stream",
      description: `Attached via InstantPDFEdit`,
      creationDate: new Date(),
      modificationDate: new Date(),
    });
  }
  return src.save();
}

export async function extractAttachments(
  source: ArrayBuffer
): Promise<{ name: string; bytes: Uint8Array }[]> {
  // pdf-lib doesn't have a great attachment enumerator — best-effort via Names
  const src = await loadPdf(source);
  const results: { name: string; bytes: Uint8Array }[] = [];
  try {
    const names = src.catalog.lookup(PDFName.of("Names"), PDFDict);
    if (names) {
      const ef = names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
      if (ef) {
        const namesArr = ef.lookup(PDFName.of("Names"), PDFArray);
        if (namesArr) {
          for (let i = 0; i < namesArr.size(); i += 2) {
            const nameObj = namesArr.lookup(i);
            const name =
              nameObj instanceof PDFString || nameObj instanceof PDFHexString
                ? nameObj.decodeText()
                : `file_${i}`;
            // Skipping deep stream extract if complex — note in UI
            results.push({
              name,
              bytes: new TextEncoder().encode(
                `Attachment name found: ${name}\nFull binary extract is limited in this free local build.`
              ),
            });
          }
        }
      }
    }
  } catch {
    /* */
  }
  if (!results.length) {
    results.push({
      name: "readme.txt",
      bytes: new TextEncoder().encode(
        "No enumerable attachments found (or PDF uses a structure we cannot list client-side)."
      ),
    });
  }
  return results;
}

export async function addVisualSeal(
  source: ArrayBuffer,
  opts: {
    name: string;
    org?: string;
    date?: string;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  const fontSm = await src.embedFont(StandardFonts.Helvetica);
  const page = src.getPages()[0];
  if (!page) throw new Error("Empty PDF");
  const { width } = page.getSize();
  const sealW = 160;
  const sealH = 70;
  const x = width - sealW - 36;
  const y = 36;
  page.drawRectangle({
    x,
    y,
    width: sealW,
    height: sealH,
    borderColor: rgb(0.7, 0.15, 0.15),
    borderWidth: 2,
    color: rgb(1, 0.95, 0.95),
    opacity: 0.9,
  });
  page.drawText("VISUAL SEAL", {
    x: x + 12,
    y: y + 48,
    size: 10,
    font,
    color: rgb(0.7, 0.15, 0.15),
  });
  page.drawText(opts.name.slice(0, 28), {
    x: x + 12,
    y: y + 30,
    size: 9,
    font: fontSm,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText((opts.org || "").slice(0, 28), {
    x: x + 12,
    y: y + 16,
    size: 8,
    font: fontSm,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(opts.date || new Date().toISOString().slice(0, 10), {
    x: x + 12,
    y: y + 4,
    size: 7,
    font: fontSm,
    color: rgb(0.4, 0.4, 0.4),
  });
  return src.save();
}

export async function addDateStamp(
  source: ArrayBuffer,
  opts?: {
    date?: string;
    position?:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    fontSize?: number;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.Helvetica);
  const text = opts?.date || new Date().toLocaleString();
  const size = opts?.fontSize ?? 10;
  const pos = opts?.position ?? "bottom-right";
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    const tw = font.widthOfTextAtSize(text, size);
    const pad = 28;
    let x = pad;
    let y = pad;
    if (pos.includes("right")) x = width - tw - pad;
    if (pos.includes("top")) y = height - size - pad;
    page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
  }
  return src.save();
}

export async function addInitialsStamp(
  source: ArrayBuffer,
  initials: string,
  opts?: {
    pageIndex?: number;
    x?: number;
    y?: number;
  }
): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const font = await src.embedFont(StandardFonts.HelveticaBoldOblique);
  const pages = src.getPages();
  const page = pages[opts?.pageIndex ?? pages.length - 1];
  if (!page) throw new Error("No pages");
  const { width } = page.getSize();
  const text = initials.toUpperCase().slice(0, 4);
  const size = 18;
  const x = opts?.x ?? width - 80;
  const y = opts?.y ?? 48;
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0.1, 0.2, 0.55),
  });
  page.drawLine({
    start: { x: x - 4, y: y - 4 },
    end: { x: x + font.widthOfTextAtSize(text, size) + 4, y: y - 4 },
    thickness: 1,
    color: rgb(0.1, 0.2, 0.55),
  });
  return src.save();
}

export async function posterTile(
  source: ArrayBuffer,
  cols: number,
  rows: number
): Promise<Uint8Array> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source);
  const page = await doc.getPage(1);
  const scale = Math.max(cols, rows) * 1.2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({
    canvasContext: canvas.getContext("2d")!,
    viewport,
  }).promise;
  page.cleanup();
  doc.destroy();

  const out = await PDFDocument.create();
  const tileW = Math.floor(canvas.width / cols);
  const tileH = Math.floor(canvas.height / rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement("canvas");
      tile.width = tileW;
      tile.height = tileH;
      tile
        .getContext("2d")!
        .drawImage(
          canvas,
          c * tileW,
          r * tileH,
          tileW,
          tileH,
          0,
          0,
          tileW,
          tileH
        );
      const blob: Blob = await new Promise((res) =>
        tile.toBlob((b) => res(b!), "image/jpeg", 0.9)
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const img = await out.embedJpg(bytes);
      const p = out.addPage([img.width, img.height]);
      p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
  }
  return out.save();
}

export async function businessCardSheet(
  imageBytes: Uint8Array,
  imageType: "png" | "jpg",
  opts?: { cols?: number; rows?: number }
): Promise<Uint8Array> {
  const cols = opts?.cols ?? 2;
  const rows = opts?.rows ?? 5;
  const out = await PDFDocument.create();
  const [pageW, pageH] = PageSizes.A4;
  const page = out.addPage([pageW, pageH]);
  const img =
    imageType === "jpg"
      ? await out.embedJpg(imageBytes)
      : await out.embedPng(imageBytes);
  const margin = 20;
  const gap = 8;
  const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = (pageH - margin * 2 - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const scale = Math.min(cellW / img.width, cellH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = margin + c * (cellW + gap) + (cellW - w) / 2;
      const y = pageH - margin - (r + 1) * cellH - r * gap + (cellH - h) / 2;
      page.drawImage(img, { x, y, width: w, height: h });
    }
  }
  return out.save();
}

export async function pdfInfoStats(source: ArrayBuffer) {
  const meta = await getMetadata(source);
  const pages = await extractTextFromPdf(source);
  const text = pages.map((p) => p.text).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  return {
    ...meta,
    words,
    chars,
    bytes: source.byteLength,
  };
}

export async function buildSignRequestPack(
  pdfBytes: Uint8Array,
  opts: {
    signerEmail: string;
    message: string;
    requesterName: string;
  }
): Promise<{ zipBytes: Uint8Array; mailto: string }> {
  const zip = new JSZip();
  zip.file("document.pdf", pdfBytes);
  const instructions = {
    type: "instantpdfedit-signature-request",
    version: 1,
    requester: opts.requesterName,
    signerEmail: opts.signerEmail,
    message: opts.message,
    createdAt: new Date().toISOString(),
    howTo:
      "Open document.pdf in InstantPDFEdit → Sign tool, add your signature, then reply with the signed PDF. This pack is NOT DocuSign — no paid e-sign service.",
  };
  zip.file("request.json", JSON.stringify(instructions, null, 2));
  zip.file(
    "README.txt",
    `Signature request from ${opts.requesterName}\n\n${opts.message}\n\n1. Open document.pdf\n2. Sign with InstantPDFEdit (free, in-browser)\n3. Email the signed file back\n`
  );
  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  const subject = encodeURIComponent(
    `Signature requested: ${opts.requesterName}`
  );
  const body = encodeURIComponent(
    `${opts.message}\n\nPlease sign the attached document.pdf using InstantPDFEdit (free) and reply with the signed file.\n\n(This is a free local signature request pack — not a paid e-sign service.)`
  );
  const mailto = `mailto:${opts.signerEmail}?subject=${subject}&body=${body}`;
  return { zipBytes, mailto };
}

/** Extractive QA — keyword/sentence ranking, no paid LLM */
export function extractiveAnswer(
  pages: { page: number; text: string }[],
  question: string
): { answer: string; evidence: { page: number; sentence: string; score: number }[] } {
  const qWords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const evidence: { page: number; sentence: string; score: number }[] = [];
  for (const p of pages) {
    const sentences = p.text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    for (const s of sentences) {
      const lower = s.toLowerCase();
      let score = 0;
      for (const w of qWords) {
        if (lower.includes(w)) score += 1 + (w.length > 5 ? 0.5 : 0);
      }
      if (score > 0) evidence.push({ page: p.page, sentence: s, score });
    }
  }
  evidence.sort((a, b) => b.score - a.score);
  const top = evidence.slice(0, 5);
  const answer = top.length
    ? top.map((t) => `(p.${t.page}) ${t.sentence}`).join("\n\n")
    : "No strong matches found. Try different keywords, or run OCR if this is a scan.";
  return { answer, evidence: top };
}

/** Prefer Chrome Translator → Marian on-device → glossary stub (see translate-ondevice). */
export async function translateTextLocal(
  text: string,
  targetLang: string
): Promise<{ text: string; method: string }> {
  const { translateOnDevice } = await import("@/lib/ai/translate-ondevice");
  const out = await translateOnDevice(text, {
    targetLang,
    sourceLang: "en",
  });
  return { text: out.text, method: out.method };
}

export { imagesToPdf };
