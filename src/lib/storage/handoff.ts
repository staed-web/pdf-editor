/**
 * Cross-tool result handoff via IndexedDB + sessionStorage pointer.
 * Keeps large PDFs off sessionStorage; destination tools consume once.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const META_KEY = "ipe:handoff";

export type HandoffIntent = "open" | "sign";

export type HandoffMeta = {
  id: string;
  name: string;
  mime: string;
  size: number;
  fromTool?: string;
  toHref: string;
  intent?: HandoffIntent;
  createdAt: number;
};

interface HandoffDB extends DBSchema {
  handoff: {
    key: string;
    value: { id: string; data: ArrayBuffer; meta: HandoffMeta };
  };
}

let dbPromise: Promise<IDBPDatabase<HandoffDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HandoffDB>("instantpdfedit-handoff", 1, {
      upgrade(db) {
        db.createObjectStore("handoff", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

async function blobToArrayBuffer(data: Blob | Uint8Array | ArrayBuffer): Promise<ArrayBuffer> {
  if (data instanceof ArrayBuffer) return data.slice(0);
  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
  }
  return data.arrayBuffer();
}

export async function storeHandoff(opts: {
  data: Blob | Uint8Array | ArrayBuffer;
  name: string;
  mime?: string;
  fromTool?: string;
  toHref: string;
  intent?: HandoffIntent;
}): Promise<HandoffMeta> {
  const buf = await blobToArrayBuffer(opts.data);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const meta: HandoffMeta = {
    id,
    name: opts.name || "document.pdf",
    mime: opts.mime || "application/pdf",
    size: buf.byteLength,
    fromTool: opts.fromTool,
    toHref: opts.toHref,
    intent: opts.intent || "open",
    createdAt: Date.now(),
  };
  const db = await getDb();
  // Clear older pending entries to avoid filling IDB
  const all = await db.getAll("handoff");
  const tx = db.transaction("handoff", "readwrite");
  for (const row of all) {
    await tx.store.delete(row.id);
  }
  await tx.store.put({ id, data: buf, meta });
  await tx.done;
  try {
    sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* private mode */
  }
  return meta;
}

export function peekHandoffMeta(): HandoffMeta | null {
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HandoffMeta;
  } catch {
    return null;
  }
}

export async function consumeHandoff(
  expectedHref?: string
): Promise<{ file: File; meta: HandoffMeta; intent: HandoffIntent } | null> {
  const meta = peekHandoffMeta();
  if (!meta) return null;
  if (expectedHref) {
    const wantPath = (expectedHref.split("?")[0] || "/").replace(/\/$/, "") || "/";
    const gotPath = (meta.toHref.split("?")[0] || "/").replace(/\/$/, "") || "/";
    if (wantPath !== gotPath) return null;
  }
  try {
    const db = await getDb();
    const row = await db.get("handoff", meta.id);
    // Clear pointer regardless
    try {
      sessionStorage.removeItem(META_KEY);
    } catch {
      /* */
    }
    if (row) await db.delete("handoff", meta.id);
    if (!row) return null;
    const file = new File([row.data], row.meta.name, {
      type: row.meta.mime || "application/pdf",
    });
    return {
      file,
      meta: row.meta,
      intent: row.meta.intent || "open",
    };
  } catch {
    try {
      sessionStorage.removeItem(META_KEY);
    } catch {
      /* */
    }
    return null;
  }
}

export async function clearHandoff(): Promise<void> {
  try {
    sessionStorage.removeItem(META_KEY);
  } catch {
    /* */
  }
  try {
    const db = await getDb();
    await db.clear("handoff");
  } catch {
    /* */
  }
}
