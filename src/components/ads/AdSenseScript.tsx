"use client";

import Script from "next/script";

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-9372118866074955";

/**
 * Loads the Google AdSense script site-wide (auto ads + display units).
 * Included from the root layout so marketing pages can show sponsored frames.
 */
export function AdSenseScript() {
  return (
    <Script
      id="adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
