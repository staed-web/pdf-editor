/**
 * Best-effort table detection from aligned pdf.js text columns.
 */
import * as XLSX from "xlsx";
import { ensurePdfWorker, loadPdfDocument } from "./loader";

type Cell = { x: number; y: number; w: number; h: number; str: string };

function clusterY(items: Cell[], tol: number): Cell[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Cell[][] = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(it.y - last[0].y) <= tol) last.push(it);
    else rows.push([it]);
  }
  for (const r of rows) r.sort((a, b) => a.x - b.x);
  return rows;
}

/** Infer column boundaries from x positions across rows */
function inferColumns(rows: Cell[][]): number[] {
  const xs: number[] = [];
  for (const row of rows) {
    for (const c of row) xs.push(c.x);
  }
  xs.sort((a, b) => a - b);
  if (!xs.length) return [0];
  const gaps: number[] = [];
  for (let i = 1; i < xs.length; i++) gaps.push(xs[i] - xs[i - 1]);
  const medianGap =
    gaps.length === 0
      ? 40
      : [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 40;
  const colTol = Math.max(12, medianGap * 0.6);
  const cols: number[] = [xs[0]];
  for (const x of xs) {
    if (x - cols[cols.length - 1] > colTol) cols.push(x);
  }
  return cols;
}

function assignColumn(x: number, cols: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < cols.length; i++) {
    const d = Math.abs(x - cols[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export async function convertPdfToExcel(source: ArrayBuffer): Promise<Uint8Array> {
  ensurePdfWorker();
  const doc = await loadPdfDocument(source.slice(0));
  const wb = XLSX.utils.book_new();

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ includeMarkedContent: true });
    const cells: Cell[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str?.trim()) continue;
      const tx = raw.transform as number[];
      const fontSize = Math.hypot(tx[0], tx[1]) || 12;
      const x = tx[4];
      const y = viewport.height - tx[5] - fontSize;
      const w = (raw as { width?: number }).width ?? fontSize * String(raw.str).length * 0.5;
      cells.push({ x, y, w, h: fontSize, str: String(raw.str).trim() });
    }
    page.cleanup();

    const avgH =
      cells.reduce((s, c) => s + c.h, 0) / Math.max(1, cells.length) || 12;
    const rows = clusterY(cells, Math.max(3, avgH * 0.4));
    const cols = inferColumns(rows);
    const aoa: string[][] = [];
    for (const row of rows) {
      const line = new Array(cols.length).fill("");
      for (const c of row) {
        const ci = assignColumn(c.x, cols);
        line[ci] = line[ci] ? `${line[ci]} ${c.str}` : c.str;
      }
      if (line.some((v) => v)) aoa.push(line);
    }
    if (!aoa.length) aoa.push(["(no text)"]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const name = `Page ${i}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  doc.destroy();
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
