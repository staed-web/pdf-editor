export function endOcrWorker(
  worker: { terminate: () => Promise<unknown> } | null
): Promise<null>;
