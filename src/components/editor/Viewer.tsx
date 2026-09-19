"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PageView } from "./PageView";
import { cn } from "@/lib/utils";

export function Viewer() {
  const pages = useEditorStore((s) => s.pages);
  const zoom = useEditorStore((s) => s.zoom);
  const zoomMode = useEditorStore((s) => s.zoomMode);
  const setZoom = useEditorStore((s) => s.setZoom);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const searchIndex = useEditorStore((s) => s.searchIndex);
  const tool = useEditorStore((s) => s.tool);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, sl: 0, st: 0 });

  // Fit width / fit page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pages.length) return;
    if (zoomMode === "percent") return;
    const page = pages[currentPage] || pages[0];
    const pad = 48;
    const availW = el.clientWidth - pad;
    const availH = el.clientHeight - pad;
    if (zoomMode === "fit-width") {
      setZoom(availW / page.width, "fit-width");
    } else if (zoomMode === "fit-page") {
      const zx = availW / page.width;
      const zy = availH / page.height;
      setZoom(Math.min(zx, zy), "fit-page");
    }
  }, [zoomMode, pages, currentPage, setZoom]);

  // Scroll current page into view when jumping / search match changes
  useEffect(() => {
    const node = document.getElementById(`page-${currentPage}`);
    if (node && scrollRef.current) {
      const parent = scrollRef.current;
      const parentRect = parent.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      if (
        nodeRect.top < parentRect.top ||
        nodeRect.bottom > parentRect.bottom ||
        searchIndex >= 0
      ) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentPage, searchIndex]);

  // Track visible page via IntersectionObserver
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const ratios = new Map<number, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.page);
          ratios.set(idx, e.intersectionRatio);
        }
        let best = currentPage;
        let bestR = 0;
        ratios.forEach((r, i) => {
          if (r > bestR) {
            bestR = r;
            best = i;
          }
        });
        if (bestR > 0.2 && best !== useEditorStore.getState().currentPage) {
          setCurrentPage(best);
        }
      },
      { root, threshold: [0.2, 0.5, 0.8] }
    );
    pages.forEach((_, i) => {
      const el = document.getElementById(`page-${i}`);
      if (el) {
        el.dataset.page = String(i);
        obs.observe(el);
      }
    });
    return () => obs.disconnect();
  }, [pages, setCurrentPage, currentPage, zoom]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool !== "pan" && !(e.button === 1 || e.altKey)) return;
      const el = scrollRef.current;
      if (!el) return;
      isPanning.current = true;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        sl: el.scrollLeft,
        st: el.scrollTop,
      };
      el.setPointerCapture(e.pointerId);
    },
    [tool]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current || !scrollRef.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    scrollRef.current.scrollLeft = panStart.current.sl - dx;
    scrollRef.current.scrollTop = panStart.current.st - dy;
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative h-full flex-1 overflow-auto overscroll-contain editor-canvas-scroll bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/80 via-zinc-925 to-zinc-950",
        tool === "pan" && "cursor-grab active:cursor-grabbing"
      )}
      style={{
        backgroundColor: "#0c0c0e",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex min-h-full flex-col items-center px-6 py-8">
        {pages.map((_, i) => (
          <PageView key={pages[i].id} pageIndex={i} scale={zoom} />
        ))}
      </div>
    </div>
  );
}
