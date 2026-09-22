/**
 * Honesty badges — label how a tool actually works.
 * Never call a rules/heuristic path "AI". Do not invent cloud/BYOK badges.
 */

export type HonestyBadgeId =
  | "on-device-model"
  | "browser-translator"
  | "browser-prompt-api"
  | "browser-summarizer-api"
  | "rules-heuristic"
  | "optional-cloud-byok";

export const HONESTY_BADGE_LABELS: Record<HonestyBadgeId, string> = {
  "on-device-model": "On-device model",
  "browser-translator": "Browser Translator API",
  "browser-prompt-api": "Browser Prompt API",
  "browser-summarizer-api": "Browser Summarizer API",
  "rules-heuristic": "Rules / heuristic",
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
