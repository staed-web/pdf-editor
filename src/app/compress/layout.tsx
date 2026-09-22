import type { Metadata } from "next";
import type { ReactNode } from "react";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("compress");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
