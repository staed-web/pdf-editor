"use client";

import Link from "next/link";
import {
  Download,
  Info,
  Moon,
  Shield,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { InstallButton } from "@/components/pwa/InstallButton";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Logo } from "@/components/site/Logo";

export default function MorePage() {
  const { standalone, installed } = useInstallPrompt();

  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 md:max-w-2xl md:py-12">
        <div className="mb-6 flex items-center gap-3">
          <Logo size="md" href="/more" />
        </div>

        <section className="mb-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <Row
            icon={<Moon className="h-4 w-4" />}
            title="Appearance"
            subtitle="Light, dark, or system"
            trailing={<ThemeToggle />}
          />
          <Divider />
          <Row
            icon={<Download className="h-4 w-4" />}
            title="Install app"
            subtitle={
              installed || standalone
                ? "Running as installed PWA"
                : "Add to Home Screen / desktop"
            }
            trailing={<InstallButton label="Install" />}
          />
        </section>

        <section className="mb-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <LinkRow href="/pricing" icon={<Sparkles className="h-4 w-4" />} title="Pricing" subtitle="Free client-side suite" />
          <Divider />
          <LinkRow href="/tools" icon={<Shield className="h-4 w-4" />} title="All tools" subtitle="Private · in-browser" />
          <Divider />
          <LinkRow href="/edit" icon={<ExternalLink className="h-4 w-4" />} title="Open editor" subtitle="Annotate, sign, organize" />
        </section>

        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            About InstantPDFEdit
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            A private PDF suite that runs entirely in your browser. Files never
            upload to our servers for core tools. Install as a PWA for a
            native-feeling workspace with offline app shell.
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
  return <div className="mx-4 h-px bg-[var(--border)]" />;
}

function Row({
  icon,
  title,
  subtitle,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
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
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-black/[0.03] dark:active:bg-white/[0.04]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
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
