import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstantPDFEdit",
    short_name: "InstantPDF",
    description:
      "Every PDF tool. Instantly. Private workspace — files stay in your browser.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Prefer fullscreen when the OS allows; fall back to standalone (edge-to-edge chrome).
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    background_color: "#f4f3ef",
    theme_color: "#f4f3ef",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  } as MetadataRoute.Manifest & { display_override?: string[] };
}

