import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";
export const revalidate = 86400;

const BASE = "https://instantpdfedit.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/edit`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/more`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const corePaths = new Set(
    core.map((e) => new URL(e.url).pathname.replace(/\/$/, "") || "/")
  );

  const toolEntries: MetadataRoute.Sitemap = TOOLS.filter((t) => {
    const path = t.href.replace(/\/$/, "") || "/";
    return !corePaths.has(path);
  }).map((t) => ({
    url: `${BASE}${t.href.startsWith("/") ? t.href : `/${t.href}`}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...core, ...toolEntries];
}
