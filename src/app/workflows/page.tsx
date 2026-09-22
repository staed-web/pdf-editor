"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSummary,
  ProcessProgress,
  ProcessError,
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { getTool } from "@/lib/tools";
import { useProcessJob } from "@/hooks/useProcessJob";
import { useHandoffIntake } from "@/hooks/useHandoffIntake";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  classifyProcessError,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import { cn } from "@/lib/utils";
import {
  listWorkflows,
  saveWorkflow,
  deleteWorkflow,
  resetStarter,
  newWorkflowId,
} from "@/lib/workflows/storage";
import {
  runWorkflow,
  workflowNeedsPassword,
} from "@/lib/workflows/runner";
import {
  STEP_KIND_META,
  type SavedWorkflow,
  type WorkflowStep,
  type WorkflowStepKind,
} from "@/lib/workflows/types";
import { COMPRESS_PRESETS } from "@/lib/pdf/compress-presets";
import { DEFAULT_OCR_LANG, OCR_LANGS } from "@/lib/pdf/ocr-langs";

const tool = getTool("workflows")!;

const KIND_OPTIONS = Object.entries(STEP_KIND_META) as [
  WorkflowStepKind,
  (typeof STEP_KIND_META)[WorkflowStepKind],
][];

function newStep(kind: WorkflowStepKind): WorkflowStep {
  const meta = STEP_KIND_META[kind];
  const step: WorkflowStep = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    label: meta.label,
  };
  if (kind === "compress") {
    step.params = { compressPreset: "balanced" };
    step.label = "Compress (Balanced)";
  }
  if (kind === "ocr") {
    step.params = { ocrLang: DEFAULT_OCR_LANG };
  }
  if (kind === "scan-enhance") {
    step.params = { scanMode: "contrast" };
  }
  return step;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [password, setPassword] = useState("");
  const [ocrLang, setOcrLang] = useState(DEFAULT_OCR_LANG);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SavedWorkflow | null>(null);
  const job = useProcessJob();

  const reload = useCallback(async () => {
    const list = await listWorkflows();
    setWorkflows(list);
    setSelectedId((prev) => {
      if (prev && list.some((w) => w.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = useMemo(
    () => workflows.find((w) => w.id === selectedId) ?? null,
    [workflows, selectedId]
  );

  const active = editing && draft ? draft : selected;
  const needsPassword = active ? workflowNeedsPassword(active) : false;

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setResult(null);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/workflows", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setResult(null);
    job.resetError();
  };

  const startCreate = () => {
    const id = newWorkflowId();
    setDraft({
      id,
      name: "My workflow",
      description: "",
      steps: [newStep("compress")],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setEditing(true);
    setSelectedId(id);
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft({
      ...selected,
      steps: selected.steps.map((s) => ({ ...s, params: { ...s.params } })),
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const persistDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Name your workflow");
      return;
    }
    if (!draft.steps.length) {
      toast.error("Add at least one step");
      return;
    }
    const saved = await saveWorkflow(draft);
    setEditing(false);
    setDraft(null);
    await reload();
    setSelectedId(saved.id);
    toast.success("Workflow saved locally");
  };

  const removeWorkflow = async () => {
    if (!selected) return;
    await deleteWorkflow(selected.id);
    await reload();
    toast.message(selected.starter ? "Starter reset" : "Workflow deleted");
  };

  const resetSelectedStarter = async () => {
    if (!selected?.starter) return;
    await resetStarter(selected.id);
    await reload();
    toast.success("Starter restored");
  };

  const run = async () => {
    if (!file || !active) return;
    if (needsPassword && !password) {
      job.setError(classifyProcessError(new Error("Enter a password for Protect")));
      return;
    }
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Running workflow…");
      setProgress(5);
      const { bytes } = await runWorkflow(active, await file.arrayBuffer(), {
        password: password || undefined,
        ocrLang,
        onProgress: (pct, label) => {
          setProgress(pct);
          setLabel(label);
        },
        isCancelled,
      });
      return bytes;
    });
    if (!out) return;
    const name = suggestedName(file.name, "workflow");
    setResult({ bytes: out, name });
    toast.success(`Finished “${active.name}”`);
  };

  const updateDraftStep = (idx: number, patch: Partial<WorkflowStep>) => {
    if (!draft) return;
    const steps = draft.steps.slice();
    steps[idx] = { ...steps[idx], ...patch };
    setDraft({ ...draft, steps });
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sequences run 100% in your browser. Saved in IndexedDB — nothing
              is uploaded. Multi-file? Use{" "}
              <Link href="/batch" className="underline underline-offset-2">
                Batch
              </Link>{" "}
              with the same ops one at a time, or run a workflow per file here.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Workflows</Label>
                {!editing && (
                  <Button size="sm" variant="outline" onClick={startCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </Button>
                )}
              </div>
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                {workflows.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    disabled={editing}
                    onClick={() => {
                      setSelectedId(w.id);
                      setResult(null);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      selectedId === w.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[var(--hairline)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="font-medium">
                      {w.name}
                      {w.starter ? (
                        <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          starter
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)] line-clamp-2">
                      {w.steps.map((s) => s.label).join(" → ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {active && !editing && (
              <div className="space-y-2 rounded-xl border border-[var(--hairline)] p-3">
                <p className="text-sm font-semibold">{active.name}</p>
                {active.description ? (
                  <p className="text-[11px] text-[var(--muted)]">
                    {active.description}
                  </p>
                ) : null}
                <ol className="space-y-1 text-xs">
                  {active.steps.map((s, i) => (
                    <li key={s.id} className="flex gap-2">
                      <span className="tabular-nums text-[var(--muted)]">
                        {i + 1}.
                      </span>
                      <span>{s.label}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    Edit
                  </Button>
                  {active.starter ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void resetSelectedStarter()}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void removeWorkflow()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}

            {editing && draft && (
              <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Steps</Label>
                  {draft.steps.map((s, idx) => (
                    <div
                      key={s.id}
                      className="space-y-1.5 rounded-lg border border-[var(--hairline)] p-2"
                    >
                      <div className="flex items-center gap-1">
                        <select
                          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={s.kind}
                          onChange={(e) => {
                            const kind = e.target.value as WorkflowStepKind;
                            const next = newStep(kind);
                            next.id = s.id;
                            updateDraftStep(idx, next);
                          }}
                        >
                          {KIND_OPTIONS.map(([k, meta]) => (
                            <option key={k} value={k}>
                              {meta.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={idx === 0}
                          onClick={() => {
                            const steps = draft.steps.slice();
                            [steps[idx - 1], steps[idx]] = [
                              steps[idx],
                              steps[idx - 1],
                            ];
                            setDraft({ ...draft, steps });
                          }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={idx === draft.steps.length - 1}
                          onClick={() => {
                            const steps = draft.steps.slice();
                            [steps[idx + 1], steps[idx]] = [
                              steps[idx],
                              steps[idx + 1],
                            ];
                            setDraft({ ...draft, steps });
                          }}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setDraft({
                              ...draft,
                              steps: draft.steps.filter((_, i) => i !== idx),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {s.kind === "compress" && (
                        <select
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={s.params?.compressPreset ?? "balanced"}
                          onChange={(e) => {
                            const compressPreset = e.target
                              .value as NonNullable<
                              WorkflowStep["params"]
                            >["compressPreset"];
                            const label =
                              COMPRESS_PRESETS.find((p) => p.id === compressPreset)
                                ?.label ?? "Compress";
                            updateDraftStep(idx, {
                              params: { ...s.params, compressPreset },
                              label: `Compress (${label})`,
                            });
                          }}
                        >
                          {COMPRESS_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {s.kind === "scan-enhance" && (
                        <select
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={s.params?.scanMode ?? "contrast"}
                          onChange={(e) =>
                            updateDraftStep(idx, {
                              params: {
                                ...s.params,
                                scanMode: e.target.value as
                                  | "contrast"
                                  | "threshold"
                                  | "deskew-approx",
                              },
                            })
                          }
                        >
                          <option value="contrast">Contrast</option>
                          <option value="threshold">Threshold</option>
                          <option value="deskew-approx">Deskew</option>
                        </select>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        steps: [...draft.steps, newStep("compress")],
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add step
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => void persistDraft()}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {needsPassword && (
              <div className="space-y-2">
                <Label>Password (for Protect)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={job.busy || editing}
                />
              </div>
            )}

            {active?.steps.some((s) => s.kind === "ocr") && (
              <div className="space-y-2">
                <Label>OCR language</Label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={ocrLang}
                  onChange={(e) => setOcrLang(e.target.value)}
                  disabled={job.busy || editing}
                >
                  {OCR_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || !active || job.busy || editing}
              onClick={() => void run()}
            >
              <Play className="h-4 w-4" />
              {job.busy ? "Running…" : "Run workflow"}
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/batch">
                <FolderKanban className="h-4 w-4" />
                Open Batch workspace
              </Link>
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF to run a workflow"}
        />
        <FileSummary summary={summary} />
        {job.busy && (
          <ProcessProgress
            value={job.progress}
            label={job.progressLabel}
            onCancel={job.cancel}
          />
        )}
        <ProcessError error={job.error} onDismiss={job.resetError} />
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.bytes.byteLength}
            blob={result.bytes}
            fromTool="workflows"
            meta={active ? active.name : undefined}
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
