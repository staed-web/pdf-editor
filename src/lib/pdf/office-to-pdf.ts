/**
 * Client-side Word/Excel → PDF for InstantPDFEdit.
 * Word: Mammoth HTML → html2canvas pages → jsPDF
 * Excel: SheetJS rows → pdf-lib table (no print dialog required)
 */
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import * as XLSX from "xlsx";

export async function excelToPdfBytes(source: ArrayBuffer): Promise<Uint8Array> {
  const wb = XLSX.read(source, { type: "array" });
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const [pageW, pageH] = PageSizes.A4;
  const margin = 36;
  const fontSize = 8;
  const lineH = fontSize * 1.45;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(
      sheet,
      { header: 1, defval: "" }
    ) as (string | number | boolean | null)[][];
    if (!rows.length) rows.push(["(empty sheet)"]);
    const cols = Math.max(...rows.map((r) => r.length), 1);
    const colW = (pageW - margin * 2) / cols;

    let page = out.addPage([pageW, pageH]);
    let y = pageH - margin;

    // Sheet title
    page.drawText(String(sheetName).slice(0, 80), {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 18;

    for (let ri = 0; ri < rows.length; ri++) {
      if (y < margin + lineH) {
        page = out.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      const row = rows[ri];
      for (let c = 0; c < cols; c++) {
        const raw = row[c];
        const cell = raw === null || raw === undefined ? "" : String(raw);
        const text = cell.slice(0, 48);
        try {
          page.drawText(text, {
            x: margin + c * colW,
            y,
            size: fontSize,
            font: ri === 0 ? bold : font,
            color: rgb(0.12, 0.12, 0.12),
            maxWidth: colW - 4,
          });
        } catch {
          /* skip unencodable glyphs */
        }
      }
      // light grid line
      page.drawLine({
        start: { x: margin, y: y - 2 },
        end: { x: pageW - margin, y: y - 2 },
        thickness: 0.3,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= lineH;
    }
  }

  out.setProducer("InstantPDFEdit");
  out.setCreator("InstantPDFEdit");
  return out.save({ useObjectStreams: true });
}

/**
 * Render DOCX HTML into a multi-page PDF via html2canvas + jsPDF.
 * Falls back to plain-text pdf-lib if canvas capture fails.
 */
export async function docxToPdfBytes(
  source: ArrayBuffer,
  opts?: { fileName?: string }
): Promise<Uint8Array> {
  const mammoth = (await import("mammoth")).default;
  const res = await mammoth.convertToHtml({ arrayBuffer: source });
  const html = res.value || "<p>(empty document)</p>";

  try {
    return await htmlDocumentToPdf(html, opts?.fileName || "document");
  } catch {
    // Fallback: raw text
    const raw = await mammoth.extractRawText({ arrayBuffer: source });
    const { textToPdf } = await import("./extra-ops");
    return textToPdf(raw.value || "(empty)", {
      title: opts?.fileName || "Word export",
      fontSize: 11,
    });
  }
}

async function htmlDocumentToPdf(
  html: string,
  title: string
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;padding:48px;background:#fff;color:#111;font-family:Georgia,serif;font-size:12pt;line-height:1.55;z-index:-1;";
  host.innerHTML = `<style>
    img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #ccc;padding:6px 8px} h1,h2,h3{font-family:system-ui,sans-serif}
  </style>${html}`;
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageCanvas = document.createElement("canvas");
    const pageCtx = pageCanvas.getContext("2d")!;
    const sliceH = Math.floor((pageH * canvas.width) / imgW);
    pageCanvas.width = canvas.width;
    let y = 0;
    let first = true;
    while (y < canvas.height) {
      const h = Math.min(sliceH, canvas.height - y);
      pageCanvas.height = h;
      pageCtx.fillStyle = "#fff";
      pageCtx.fillRect(0, 0, pageCanvas.width, h);
      pageCtx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      const data = pageCanvas.toDataURL("image/jpeg", 0.92);
      if (!first) pdf.addPage();
      first = false;
      const drawH = (h * imgW) / canvas.width;
      pdf.addImage(data, "JPEG", 0, 0, imgW, drawH);
      y += h;
    }
    pdf.setProperties({
      title,
      creator: "InstantPDFEdit",
    });
    const ab = pdf.output("arraybuffer");
    return new Uint8Array(ab);
  } finally {
    host.remove();
  }
}
