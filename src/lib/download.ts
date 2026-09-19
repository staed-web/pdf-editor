import JSZip from "jszip";

export function downloadBytes(
  data: Uint8Array | ArrayBuffer | Blob,
  filename: string,
  mime = "application/pdf"
) {
  const blob =
    data instanceof Blob
      ? data
      : new Blob(
          [data instanceof ArrayBuffer ? data : new Uint8Array(data)],
          { type: mime }
        );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadZip(
  files: { name: string; data: Uint8Array | Blob | ArrayBuffer }[],
  zipName: string
) {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.data);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBytes(blob, zipName, "application/zip");
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif)$/i.test(file.name)
  );
}

export async function fileToImageBytes(
  file: File
): Promise<{ bytes: Uint8Array; type: "png" | "jpg" | "webp" }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type.includes("png") || name.endsWith(".png"))
    return { bytes, type: "png" };
  if (file.type.includes("webp") || name.endsWith(".webp"))
    return { bytes, type: "webp" };
  return { bytes, type: "jpg" };
}
