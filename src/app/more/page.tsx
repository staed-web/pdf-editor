"use client";

import Link from "next/link";
import {
  Download,
  Info,
  Moon,
  Shield,
  Sparkles,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { InstallButton } from "@/components/pwa/InstallButton";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useStandalone } from "@/hooks/useStandalone";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

export default function MorePage() {
  const { standalone: installedStandalone, installed } = useInstallPrompt();
  const standalone = useStandalone();

  return (
    <MarketingShell>
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          standalone ? "max-w-lg py-4" : "max-w-lg py-8 md:max-w-2xl md:py-12"
        )}
      >
        {!standalone && (
          <div className="mb-6 flex items-center gap-3">
            <Logo size="md" href="/more" />
          </div>
        )}

        {standalone && (
          <p className="app-section-label mb-2 px-1">Settings</p>
        )}

        {/* Appearance + Install */}
        <section className="mb-4 overflow-hidden rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <Row
            icon={<Moon className="h-4 w-4" />}
            title="Appearance"
            subtitle="Light, dark, or system"
            trailing={<ThemeToggle />}
            tint="bg-violet-500/12 text-violet-700 dark:text-violet-300"
          />
          <Divider />
          <Row
            icon={<Download className="h-4 w-4" />}
            title="Install app"
            subtitle={
              installed || installedStandalone
                ? "Running as installed PWA"
                : "Add to Home Screen / desktop"
            }
            trailing={<InstallButton label="Install" />}
            tint="bg-amber-500/12 text-amber-700 dark:text-amber-300"
          />
        </section>

        <section className="mb-4 overflow-hidden rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <LinkRow
            href="/pricing"
            icon={<Sparkles className="h-4 w-4" />}
            title="Pricing"
            subtitle="Free client-side suite"
            tint="bg-rose-500/12 text-rose-700 dark:text-rose-300"
          />
          <Divider />
          <LinkRow
            href="/tools"
            icon={<Shield className="h-4 w-4" />}
            title="All tools"
            subtitle="Private · in-browser"
            tint="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          />
          <Divider />
          <LinkRow
            href="/edit"
            icon={<Pencil className="h-4 w-4" />}
            title="Open editor"
            subtitle="Annotate, sign, organize"
            tint="bg-sky-500/12 text-sky-700 dark:text-sky-300"
          />
        </section>

        <section className="overflow-hidden rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            About InstantPDFEdit
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            A private PDF suite that runs entirely in your browser. Files never
            upload to our servers for core tools.
            {standalone
              ? " You’re using the installed app."
              : " Install as a PWA for a native-feeling workspace with offline shell."}
          </p>
          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Display mode: {standalone ? "standalone" : "browser"} · v0.1.0
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}

function Divider() {
  return <div className="ml-[4.25rem] h-px bg-[var(--hairline)]" />;
}

function Row({
  icon,
  title,
  subtitle,
  trailing,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="flex min-h-[3.5rem] items-center gap-3 px-3.5 py-2.5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem]",
          tint
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
      {trailing}
    </div>
  );
}

function LinkRow({
  href,
  icon,
  title,
  subtitle,
  tint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[3.5rem] items-center gap-3 px-3.5 py-2.5 active:bg-black/[0.03] dark:active:bg-white/[0.04]"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem]",
          tint
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
    </Link>
  );
}
