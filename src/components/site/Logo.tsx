import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = "md",
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  showWordmark?: boolean;
}) {
  const box =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-11 w-11 text-lg" : "h-8 w-8 text-sm";
  const text =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-[15px]";
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 font-black text-zinc-950 shadow-md shadow-amber-500/20",
          box
        )}
      >
        I
      </span>
      {showWordmark && (
        <span className={cn("text-zinc-900 dark:text-zinc-50", text)}>
          InstantPDF<span className="text-amber-600 dark:text-amber-400">Edit</span>
        </span>
      )}
    </Link>
  );
}
