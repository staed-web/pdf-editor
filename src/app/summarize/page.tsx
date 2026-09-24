"use client";

import dynamic from "next/dynamic";
import { ToolPageLoading } from "@/components/tools/ToolPageLoading";

const ToolClient = dynamic(() => import("./ToolClient"), {
  ssr: false,
  loading: () => <ToolPageLoading label="Loading Summarize…" />,
});

export default function Page() {
  return <ToolClient />;
}
