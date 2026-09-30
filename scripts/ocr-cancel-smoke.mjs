/**
 * Cheap cancel smoke: fake Tesseract worker must terminate on cancel
 * and must not keep incrementing a download counter afterward.
 * Run: node scripts/ocr-cancel-smoke.mjs
 */
import { endOcrWorker } from "../src/lib/pdf/ocr-worker-stop.mjs";

function fakeWorker() {
  let terminated = false;
  let downloads = 0;
  let timer = null;
  const worker = {
    downloads: () => downloads,
    terminated: () => terminated,
    startDownload() {
      timer = setInterval(() => {
        if (!terminated) downloads += 1;
      }, 5);
    },
    async recognize() {
      worker.startDownload();
      await new Promise((r) => setTimeout(r, 40));
      if (terminated) throw new DOMException("Aborted", "AbortError");
      return { data: { text: "ok" } };
    },
    async terminate() {
      terminated = true;
      if (timer) clearInterval(timer);
    },
  };
  return worker;
}

let worker = fakeWorker();
const job = worker.recognize();
const downloadsAtCancelStart = worker.downloads();
worker = await endOcrWorker(worker);
let aborted = false;
try {
  await job;
} catch (err) {
  aborted = err instanceof DOMException && err.name === "AbortError";
}
await new Promise((r) => setTimeout(r, 30));

if (worker !== null) {
  console.error("FAIL: worker reference not cleared");
  process.exit(1);
}
if (!aborted) {
  console.error("FAIL: recognize did not abort after terminate");
  process.exit(1);
}
if (downloadsAtCancelStart > 2) {
  console.error("FAIL: download ticks ran away before cancel", downloadsAtCancelStart);
  process.exit(1);
}

if ((await endOcrWorker(null)) !== null) {
  console.error("FAIL: null worker");
  process.exit(1);
}

const boom = {
  async terminate() {
    throw new Error("already terminated");
  },
};
if ((await endOcrWorker(boom)) !== null) {
  console.error("FAIL: throwing terminate");
  process.exit(1);
}

console.log("ocr-cancel-smoke: pass (terminate on cancel, no orphan download ticks)");
