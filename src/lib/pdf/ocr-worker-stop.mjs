/**
 * Terminate an OCR worker and return null so callers drop the reference.
 * Swallows terminate races (cancel during recognize or language download).
 * Plain JS so a node smoke can import the same function the app uses.
 * @param {{ terminate: () => Promise<unknown> } | null} worker
 * @returns {Promise<null>}
 */
export async function endOcrWorker(worker) {
  if (!worker) return null;
  try {
    await worker.terminate();
  } catch {
    /* ignore terminate races on cancel */
  }
  return null;
}
