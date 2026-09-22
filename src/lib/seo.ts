import type { Metadata } from "next";
import { getTool } from "@/lib/tools";

export const SITE_URL = "https://instantpdfedit.com";
export const SITE_NAME = "InstantPDFEdit";
export const DEFAULT_DESCRIPTION =
  "Merge, split, compress, convert, edit, sign, and protect PDFs entirely in your browser. Private workspace — files never uploaded.";

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p === "/" ? "" : p}` || SITE_URL;
}

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle,
}: {
  title: string;
  description: string;
  path: string;
  /** When set, bypasses the root "%s · InstantPDFEdit" template */
  absoluteTitle?: string;
}): Metadata {
  const url = path === "/" ? SITE_URL : absoluteUrl(path);
  const ogTitle = absoluteTitle ?? `${title} · ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export function toolMetadata(slug: string): Metadata {
  const tool = getTool(slug);
  if (!tool) {
    return pageMetadata({
      title: "PDF tool",
      description: DEFAULT_DESCRIPTION,
      path: `/${slug}`,
    });
  }
  return pageMetadata({
    title: tool.name,
    description: tool.description,
    path: tool.href.startsWith("/") ? tool.href : `/${tool.href}`,
  });
}

export const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      description: DEFAULT_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/tools?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
    },
  ],
};

export function toolJsonLd(slug: string) {
  const tool = getTool(slug);
  if (!tool) return null;
  const url = absoluteUrl(tool.href);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${tool.name} · ${SITE_NAME}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: tool.description,
    url,
  };
}
