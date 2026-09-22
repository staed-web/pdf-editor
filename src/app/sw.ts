import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * InstantPDFEdit service worker (Serwist).
 *
 * Limitations documented for maintainers:
 * - PDF tool pages that need a user-selected file cannot work fully offline
 *   without that file already in memory / IndexedDB — we show /~offline shell.
 * - pdf.worker.min.mjs is excluded from precache (exclude in next.config) and
 *   cached at runtime via CacheFirst so builds don’t break worker registration.
 * - Large user PDFs are never cached by the SW (opaque / no request).
 * - /ads.txt uses NetworkOnly so AdSense verification is never stale-cached.
 * - Serwist uses webpack injectManifest; `next build` must use webpack
 *   (Next 16 default for production build). Turbopack `next dev` disables SW.
 */

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ads.txt must stay fresh for AdSense crawlers — never serve a stale offline copy
    {
      matcher: ({ url }) => url.pathname === "/ads.txt",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.includes("pdf.worker"),
      handler: new CacheFirst({
        cacheName: "pdf-worker",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
