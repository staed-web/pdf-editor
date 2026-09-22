import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { spawnSync } from "node:child_process";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  register: true,
  reloadOnOnline: true,
  cacheOnNavigation: true,
  // pdf.worker.min.mjs is ~1.3MB — allow precache; also used via runtime cache
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/icons/icon-192.png", revision },
    { url: "/icons/icon-512.png", revision },
  ],
  // Don't break large worker / wasm-like assets with aggressive transforms
  exclude: [
    /pdf\.worker/i,
    /\.map$/,
    /ads\.txt$/,
    /robots\.txt$/,
    /sitemap\.xml$/,
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  transpilePackages: ["@cantoo/pdf-lib"],
};

export default withSerwist(nextConfig);
