"use client";

import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="Last updated: September 22, 2026 · InstantPDFEdit is privacy-first by design."
    >
      <p>
        InstantPDFEdit (“we”, “us”) provides browser-based PDF tools at{" "}
        <a href="https://instantpdfedit.com">instantpdfedit.com</a>. This policy
        explains what we do — and do not — collect.
      </p>

      <h2>The short version</h2>
      <p>
        For core PDF tools, your files are processed <strong>locally in your
        browser</strong>. We do not operate a file-upload pipeline for those
        tools, and we do not keep copies of your PDFs on our servers.
      </p>

      <h2>How tools handle your files</h2>
      <h3>100% local / never uploaded</h3>
      <p>
        Most InstantPDFEdit tools (merge, split, compress, organize, annotate,
        sign, protect, OCR via Tesseract.js in-browser, and similar) read and
        process files entirely on your device using libraries such as pdf.js and
        pdf-lib. Bytes stay in page memory (and, if you use Recents, optionally
        in IndexedDB on your device). They are <strong>never uploaded</strong>{" "}
        to InstantPDFEdit servers for processing.
      </p>
      <h3>Print / best-effort (still local)</h3>
      <p>
        Some flows use your browser’s print dialog, canvas export, or
        “best-effort” converters (for example PDF↔Office approximations). These
        still run client-side. Output quality varies; we label imperfect paths
        honestly rather than claiming pixel-perfect conversion.
      </p>
      <h3>Browser / device APIs (not our servers)</h3>
      <p>
        A few tools may call <strong>APIs provided by your browser or OS</strong>{" "}
        when available (for example the experimental Translator API for
        Translate). Those requests go to the browser vendor’s implementation —
        not to an InstantPDFEdit upload backend. If the API is unavailable, the
        tool falls back to a local/offline mode where documented.
      </p>
      <h3>External third-party services we do not use for PDFs</h3>
      <p>
        InstantPDFEdit does not send your PDF contents to paid cloud OCR, LLM,
        or e-sign backends for the shipped free tools. Summarize and OCR use
        on-device models in your browser; Translate uses the Browser Translator
        API and/or on-device Marian MT; Ask PDF prefers the Browser Prompt API
        and does not download Xenova chat/RAG models. Heuristic paths are
        labeled Rules / heuristic — not AI. There is no optional cloud (BYOK)
        upload path today.
      </p>

      <h2>Browser storage</h2>
      <ul>
        <li>
          <strong>localStorage / sessionStorage</strong> — preferences such as
          theme, install-prompt dismiss state, and similar UI flags.
        </li>
        <li>
          <strong>IndexedDB</strong> — optional “Recent files” cache on your
          device so you can reopen work quickly. You can clear site data in your
          browser to remove it.
        </li>
        <li>
          <strong>Service worker cache</strong> — app shell assets for faster
          loads / offline shell. User PDFs are not intentionally precached.
        </li>
      </ul>

      <h2>Server-side retention</h2>
      <p>
        For local tools there is <strong>no server-side retention</strong> of
        your documents: we have nothing to delete because we never received the
        file. Hosting logs from our CDN/host (for example Vercel) may include
        standard request metadata (IP, URL, user agent) for security and
        reliability — not your PDF contents.
      </p>

      <h2>Analytics</h2>
      <p>
        We do not currently ship a first-party product analytics SDK that tracks
        your document contents. If we add privacy-respecting analytics later, we
        will update this page. Platform-level metrics from our host or ad
        partner may exist independently of document processing.
      </p>

      <h2>Advertising (Google AdSense)</h2>
      <p>
        On the marketing website (not inside the installed PWA shell), we may
        show ads via <strong>Google AdSense</strong>. AdSense uses cookies or
        similar technologies as described in Google’s policies. We do not pass
        your PDF bytes to AdSense. If ad slots are empty or unfilled, we hide
        the sponsored chrome rather than leave large blank frames.
      </p>
      <p>
        See{" "}
        <a
          href="https://policies.google.com/technologies/ads"
          rel="noopener noreferrer"
          target="_blank"
        >
          Google’s advertising policies
        </a>{" "}
        for how ads personalization works and how to control ad settings.
      </p>

      <h2>Third-party libraries</h2>
      <p>
        The app loads open-source libraries (for example pdf.js, pdf-lib,
        Tesseract.js, Serwist) in your browser to do the work. Those libraries
        run locally with your file bytes unless a specific tool documents a
        browser API call.
      </p>

      <h2>Support expectations</h2>
      <p>
        We provide documentation pages and a contact path (see{" "}
        <Link href="/contact">Contact</Link>). There is no ticket portal or
        human review of your PDFs — please do not email confidential file
        attachments unless you accept email transport risk and we have asked for
        them.
      </p>

      <h2>Children</h2>
      <p>
        InstantPDFEdit is a general-purpose utility, not directed at children
        under 13. Do not use the service to upload or process data about
        children in ways that violate applicable law.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy as the product evolves. The “Last updated”
        date at the top will change when we do.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions: see <Link href="/contact">Contact</Link>.
      </p>
    </LegalPage>
  );
}
