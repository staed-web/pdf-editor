"use client";

import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Last updated: September 22, 2026 · Clear rules for a free, local-first toolkit."
    >
      <p>
        By using InstantPDFEdit at{" "}
        <a href="https://instantpdfedit.com">instantpdfedit.com</a>, you agree
        to these terms. If you do not agree, do not use the service.
      </p>

      <h2>What InstantPDFEdit is</h2>
      <p>
        InstantPDFEdit provides <strong>free, browser-based PDF tools</strong>{" "}
        and a client-side editor. Most processing happens on your device. We do
        not sell a hosted document-processing API as part of the free suite.
      </p>

      <h2>No account required</h2>
      <p>
        You can use the tools without creating an account. Optional install as a
        Progressive Web App is for convenience (home screen, app chrome, offline
        shell) and does not change these terms.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not abuse, scrape destructively, or attempt to disrupt the site.</li>
        <li>
          Do not use the tools for unlawful activity, including distributing
          malware via crafted PDFs or infringing others’ rights.
        </li>
        <li>
          Do not attempt to bypass security, rate limits, or advertising in ways
          that harm the service or other users.
        </li>
      </ul>

      <h2>Your content &amp; intellectual property</h2>
      <p>
        You retain all rights to files you open in InstantPDFEdit. Because local
        tools process files in your browser, we do not claim ownership of your
        documents. You are responsible for having the rights to process the
        files you choose.
      </p>
      <p>
        The InstantPDFEdit name, logo, site design, and software are owned by us
        or our licensors. You may not copy the product branding or redistribute
        the app as your own.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided <strong>“as is”</strong> and{" "}
        <strong>“as available”</strong> without warranties of any kind, express
        or implied — including merchantability, fitness for a particular
        purpose, and non-infringement. Client-side conversion and OCR are
        best-effort; always verify critical documents.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, InstantPDFEdit and its operators
        are not liable for any indirect, incidental, special, consequential, or
        punitive damages, or for lost profits, data, or goodwill, arising from
        your use of the tools. Our total liability for any claim relating to the
        service is limited to zero dollars for free use, or the amount you paid
        us (if any) in the three months before the claim.
      </p>

      <h2>Ads &amp; third parties</h2>
      <p>
        The marketing site may show third-party ads (for example Google
        AdSense). Third-party services have their own terms. We are not
        responsible for third-party sites or ad networks.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains local
        processing, storage, and ads.
      </p>

      <h2>Changes &amp; termination</h2>
      <p>
        We may update these terms or discontinue features at any time. Continued
        use after changes means you accept the updated terms. We may suspend
        access for abuse.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <Link href="/contact">Contact</Link>.
      </p>
    </LegalPage>
  );
}
