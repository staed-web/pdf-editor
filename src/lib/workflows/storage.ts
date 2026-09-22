import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SavedWorkflow } from "./types";
import { getStarterWorkflows } from "./starters";

interface WorkflowsDB extends DBSchema {
  workflows: {
    key: string;
    value: SavedWorkflow;
    indexes: { "by-updated": number };
  };
}

let dbPromise: Promise<IDBPDatabase<WorkflowsDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WorkflowsDB>("instantpdfedit-workflows", 1, {
      upgrade(db) {
        const store = db.createObjectStore("workflows", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return dbPromise;
}

async function ensureStarters(): Promise<void> {
  const db = await getDb();
  const starters = getStarterWorkflows();
  const tx = db.transaction("workflows", "readwrite");
  for (const s of starters) {
    const existing = await tx.store.get(s.id);
    if (!existing) await tx.store.put(s);
  }
  await tx.done;
}

export async function listWorkflows(): Promise<SavedWorkflow[]> {
  await ensureStarters();
  const db = await getDb();
  const all = await db.getAllFromIndex("workflows", "by-updated");
  const starterIds = getStarterWorkflows().map((s) => s.id);
  const byId = new Map(all.map((w) => [w.id, w]));
  const starterList = starterIds
    .map((id) => byId.get(id))
    .filter(Boolean) as SavedWorkflow[];
  const custom = all
    .filter((w) => !w.starter)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return [...starterList, ...custom];
}

export async function getWorkflow(
  id: string
): Promise<SavedWorkflow | undefined> {
  await ensureStarters();
  const db = await getDb();
  return db.get("workflows", id);
}

export async function saveWorkflow(
  workflow: Omit<SavedWorkflow, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  }
): Promise<SavedWorkflow> {
  const db = await getDb();
  const now = Date.now();
  const existing = await db.get("workflows", workflow.id);
  const row: SavedWorkflow = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    steps: workflow.steps,
    starter: workflow.starter ?? existing?.starter,
    createdAt: existing?.createdAt ?? workflow.createdAt ?? now,
    updatedAt: now,
  };
  await db.put("workflows", row);
  return row;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("workflows", id);
  if (row?.starter) {
    const template = getStarterWorkflows().find((s) => s.id === id);
    if (template) {
      await db.put("workflows", { ...template, updatedAt: Date.now() });
    }
    return;
  }
  await db.delete("workflows", id);
}

export async function resetStarter(id: string): Promise<SavedWorkflow | null> {
  const template = getStarterWorkflows().find((s) => s.id === id);
  if (!template) return null;
  const db = await getDb();
  const row = { ...template, updatedAt: Date.now() };
  await db.put("workflows", row);
  return row;
}

export function newWorkflowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `wf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
