import type { SavedWorkflow } from "./types";

function sid(prefix: string, i: number) {
  return `${prefix}-step-${i}`;
}

/** Three built-in Action Wizard starters. */
export function getStarterWorkflows(): SavedWorkflow[] {
  const now = Date.now();
  return [
    {
      id: "starter-email-ready",
      name: "Email-ready",
      description:
        "Web/Mobile compress → structure optimize → protect (password at run).",
      starter: true,
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: sid("email", 1),
          kind: "compress",
          label: "Compress (Web/Mobile)",
          params: { compressPreset: "web" },
        },
        {
          id: sid("email", 2),
          kind: "linearize",
          label: "Optimize structure",
        },
        {
          id: sid("email", 3),
          kind: "protect",
          label: "Protect",
        },
      ],
    },
    {
      id: "starter-scan-cleanup",
      name: "Scan cleanup",
      description: "Enhance scan → OCR (searchable) → balanced compress.",
      starter: true,
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: sid("scan", 1),
          kind: "scan-enhance",
          label: "Scan enhance",
          params: { scanMode: "contrast" },
        },
        {
          id: sid("scan", 2),
          kind: "ocr",
          label: "OCR (searchable)",
          params: { ocrLang: "eng+hin" },
        },
        {
          id: sid("scan", 3),
          kind: "compress",
          label: "Compress (Balanced)",
          params: { compressPreset: "balanced" },
        },
      ],
    },
    {
      id: "starter-sign-lock",
      name: "Sign & lock",
      description:
        "After signing in the editor: flatten forms → protect. Sign interactively first, then run this on the signed PDF.",
      starter: true,
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: sid("sign", 1),
          kind: "flatten",
          label: "Flatten forms",
        },
        {
          id: sid("sign", 2),
          kind: "protect",
          label: "Protect / lock",
        },
      ],
    },
  ];
}
