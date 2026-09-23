"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-9372118866074955";

/**
 * Loads the Google AdSense script site-wide (auto ads + display units).
 * Uses a plain DOM script (not next/script) so we do not inject
 * data-nscript into <head>, which AdSense warns about.
 */
export function AdSenseScript() {
  useEffect(() => {
    const id = "adsense-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.body.appendChild(s);
  }, []);

  return null;
}
