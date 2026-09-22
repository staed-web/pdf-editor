import type { Metadata } from "next";
import type { ReactNode } from "react";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("split-by-bookmarks");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
