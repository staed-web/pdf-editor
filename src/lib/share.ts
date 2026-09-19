/** Share a Blob via Web Share API Level 2 when available; otherwise download. */
export async function shareOrDownload(
  data: Blob | Uint8Array | ArrayBuffer,
  filename: string,
  mime = "application/pdf"
): Promise<"shared" | "downloaded"> {
  const blob =
    data instanceof Blob
      ? data
      : new Blob(
          [data instanceof ArrayBuffer ? data : new Uint8Array(data)],
          { type: mime }
        );

  const file = new File([blob], filename, { type: mime });
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
