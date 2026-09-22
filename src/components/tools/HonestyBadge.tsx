import { cn } from "@/lib/utils";
import {
  HONESTY_BADGE_LABELS,
  HONESTY_BADGE_TONE,
  type HonestyBadgeId,
} from "@/lib/honesty";

const TONE_CLASS: Record<
  (typeof HONESTY_BADGE_TONE)[HonestyBadgeId],
  string
> = {
  model:
    "bg-emerald-500/12 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300",
  api: "bg-sky-500/12 text-sky-800 ring-sky-500/25 dark:text-sky-300",
  rules:
    "bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:text-zinc-300",
  cloud:
    "bg-violet-500/12 text-violet-800 ring-violet-500/25 dark:text-violet-300",
};

export function HonestyBadge({
  id,
  label,
  className,
}: {
  id?: HonestyBadgeId;
  /** Override / runtime label (e.g. method-specific badge text) */
  label?: string;
  className?: string;
}) {
  const resolved =
    label ?? (id ? HONESTY_BADGE_LABELS[id] : undefined);
  if (!resolved) return null;
  const tone = id ? HONESTY_BADGE_TONE[id] : "rules";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ring-1",
        TONE_CLASS[tone],
        className
      )}
    >
      {resolved}
    </span>
  );
}

export function HonestyBadgeRow({
  badges,
  className,
}: {
  badges?: HonestyBadgeId[];
  className?: string;
}) {
  if (!badges?.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((id) => (
        <HonestyBadge key={id} id={id} />
      ))}
    </div>
  );
}
