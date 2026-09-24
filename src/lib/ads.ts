/**
 * AdSense publisher + slot config.
 * Live display units only mount when a real slot ID is set via env.
 * Publisher stays ca-pub-9372118866074955 (see public/ads.txt).
 */

export type AdBannerVariant = "leaderboard" | "rectangle" | "infeed";

export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-9372118866074955";

const SLOT_ENV: Record<AdBannerVariant, string | undefined> = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
  infeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED,
  rectangle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE,
};

export function resolveAdSlot(
  variant: AdBannerVariant,
  override?: string
): string {
  return (override ?? SLOT_ENV[variant] ?? "").trim();
}

export function isAdSlotConfigured(
  variant: AdBannerVariant,
  override?: string
): boolean {
  return resolveAdSlot(variant, override).length > 0;
}
