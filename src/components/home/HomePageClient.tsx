"use client";

import Link from "next/link";
import {
  Shield,
  Zap,
  Lock,
  ArrowRight,
  Pencil,
  Sparkles,
} from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { MobileHome } from "@/components/mobile/MobileHome";
import { ToolCard } from "@/components/tools/ToolCard";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useStandalone } from "@/hooks/useStandalone";
import { AdBanner } from "@/components/ads/AdBanner";
import {
  homeSpotlightTools,
  TOOLS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  toolsByCategory,
} from "@/lib/tools";

const FAQS = [
  {
    q: "Do my files leave my device?",
    a: "No. InstantPDFEdit processes PDFs entirely in your browser with pdf.js and pdf-lib. Nothing is uploaded to our servers for the core tools.",
  },
  {
    q: "Is InstantPDFEdit free?",
    a: "Yes — the client-side tool suite is free to use. No account required.",
  },
  {
    q: "What browsers are supported?",
    a: "Modern Chromium, Firefox, and Safari. Install as a PWA for a native-feeling workspace with offline app shell.",
  },
  {
    q: "How accurate are conversions like PDF↔Word?",
    a: "Layout fidelity varies. We ship usable downloads with honest “best effort” labels where pixel-perfect conversion isn’t possible client-side.",
  },
  {
    q: "Do you claim “AI” for every smart-looking tool?",
    a: "No. Only tools that run an on-device model (OCR/Tesseract, Summarize, Translate Marian, Ask PDF) or the Browser Translator API are labeled that way. Pattern finders, compress tips, and glossary stubs are Rules / heuristic — never marketed as AI. There is no cloud BYOK path today.",
  },
];

export default function HomePageClient() {
  const standalone = useStandalone();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <MarketingShell>
      {!mounted ? (
        <div className="min-h-[40vh]" aria-hidden />
      ) : standalone ? (
        <MobileHome />
      ) : (
        <WebHome />
      )}
    </MarketingShell>
  );
}

function WebHome() {
  const featured = homeSpotlightTools();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Every PDF tool. Instantly.
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The private PDF suite that{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                never uploads your files
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Merge, split, compress, convert, annotate, sign, and protect —
              all in one polished workspace. InstantPDFEdit runs locally in your
              browser.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/edit">
                  <Pencil className="h-4 w-4" />
                  Open PDF editor
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tools">
                  Browse all tools
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-600" /> Privacy-first
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Instant results
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-sky-600" /> No account needed
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Batch & top tools
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Batch workspace plus the eight tools most people need — everything else lives on the tools hub.
            </p>
          </div>
          <Link
            href="/tools"
            className="hidden text-sm font-medium text-amber-700 hover:underline sm:inline dark:text-amber-400"
          >
            See all {TOOLS.length} tools →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AdBanner variant="leaderboard" className="w-full max-w-none" />
      </div>

      <section className="bg-[var(--panel)] py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Browse by category
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Full catalog lives on the tools hub — start here.
              </p>
            </div>
            <Link
              href="/tools"
              className="hidden text-sm font-medium text-amber-700 hover:underline sm:inline dark:text-amber-400"
            >
              All tools →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.map((cat) => {
              const list = toolsByCategory(cat);
              if (!list.length) return null;
              return (
                <Link
                  key={cat}
                  href={`/tools#${cat}`}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition hover:border-amber-500/40 hover:shadow-[var(--shadow)]"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {list.length} tool{list.length === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-foreground">
          How it works
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Pick a tool",
              d: "Choose merge, compress, edit, or any converter from the hub.",
            },
            {
              n: "2",
              t: "Drop your files",
              d: "Drag & drop stays local. Configure options in a clear side panel.",
            },
            {
              n: "3",
              t: "Download instantly",
              d: "Real client-side processing — then save your result. No waiting on a server.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-[var(--shadow)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-zinc-950">
                {s.n}
              </span>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {s.t}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AdBanner variant="infeed" className="w-full max-w-none" />
      </div>

      <section id="faq" className="border-t border-[var(--hairline)] bg-[var(--card)] py-12 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            FAQ
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl bg-zinc-900 px-8 py-12 text-center shadow-[var(--shadow-lg)] dark:bg-[var(--card-elevated)] dark:ring-1 dark:ring-amber-500/20">
          <h2 className="text-2xl font-semibold text-white">
            Ready to edit a PDF?
          </h2>
          <p className="mt-2 max-w-md text-sm text-zinc-300">
            Jump into the flagship editor or pick a focused tool. Your files stay
            on your device.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/edit">Open editor</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/merge">Merge PDFs</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
