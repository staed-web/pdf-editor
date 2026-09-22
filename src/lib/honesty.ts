/**
 * Honesty badges — privacy-first labels for tool cards / shells.
 * Implementation details (model IDs, Prompt API, etc.) stay out of UI copy.
 */

export type HonestyBadgeId =
  | "on-device-model"
  | "browser-translator"
  | "browser-prompt-api"
  | "browser-summarizer-api"
  | "rules-heuristic"
  | "optional-cloud-byok";

export const HONESTY_BADGE_LABELS: Record<HonestyBadgeId, string> = {
  "on-device-model": "Private · on your device",
  "browser-translator": "Private · on your device",
  "browser-prompt-api": "Private · in-browser · no upload",
  "browser-summarizer-api": "Private · on your device",
  "rules-heuristic": "Private · on your device",
  "optional-cloud-byok": "Optional cloud (BYOK)",
};

/** Tone for pill styling */
export const HONESTY_BADGE_TONE: Record<
  HonestyBadgeId,
  "model" | "api" | "rules" | "cloud"
> = {
  "on-device-model": "model",
  "browser-translator": "api",
  "browser-prompt-api": "api",
  "browser-summarizer-api": "api",
  "rules-heuristic": "rules",
  "optional-cloud-byok": "cloud",
};
