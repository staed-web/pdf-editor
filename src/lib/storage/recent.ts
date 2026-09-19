import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { RecentFileMeta } from "@/store/types";

interface PdfEditorDB extends DBSchema {
  recentMeta: {
    key: string;
    value: RecentFileMeta;
    indexes: { "by-lastOpened": number };
  };
  recentFiles: {
    key: string;
    value: { id: string; data: ArrayBuffer };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<PdfEditorDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PdfEditorDB>("instantpdfedit", 1, {
      upgrade(db) {
        const meta = db.createObjectStore("recentMeta", { keyPath: "id" });
        meta.createIndex("by-lastOpened", "lastOpened");
        db.createObjectStore("recentFiles", { keyPath: "id" });
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

const MAX_RECENT = 12;

export async function saveRecentFile(
  meta: RecentFileMeta,
  data: ArrayBuffer
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["recentMeta", "recentFiles"], "readwrite");
  await tx.objectStore("recentMeta").put(meta);
  await tx.objectStore("recentFiles").put({ id: meta.id, data });
  await tx.done;

  const all = await listRecentFiles();
  if (all.length > MAX_RECENT) {
    const toRemove = all.slice(MAX_RECENT);
    const tx2 = db.transaction(["recentMeta", "recentFiles"], "readwrite");
    for (const r of toRemove) {
      await tx2.objectStore("recentMeta").delete(r.id);
      await tx2.objectStore("recentFiles").delete(r.id);
    }
    await tx2.done;
  }
}

export async function listRecentFiles(): Promise<RecentFileMeta[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("recentMeta", "by-lastOpened");
  return all.reverse();
}

export async function loadRecentFile(
  id: string
): Promise<{ meta: RecentFileMeta; data: ArrayBuffer } | null> {
  const db = await getDb();
  const meta = await db.get("recentMeta", id);
  const file = await db.get("recentFiles", id);
  if (!meta || !file) return null;
  return { meta, data: file.data };
}

export async function removeRecentFile(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["recentMeta", "recentFiles"], "readwrite");
  await tx.objectStore("recentMeta").delete(id);
  await tx.objectStore("recentFiles").delete(id);
  await tx.done;
}

export async function saveSettings(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("settings", value, key);
}

export async function loadSettings<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("settings", key)) as T | undefined;
}
