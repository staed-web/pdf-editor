# Staed PDF Editor

A polished, privacy-first PDF editor that runs entirely in your browser. Annotate, rearrange pages, fill forms, sign, search, and export — no uploads, no account required.

**Live repo:** https://github.com/staed-web/pdf-editor

## Features

| Area | Capabilities |
|------|----------------|
| **Open / import** | Drag & drop, file picker, recent files (IndexedDB) |
| **Viewer** | Multi-page, zoom (fit width / fit page / %), pan, keyboard shortcuts, thumbnails, page jump |
| **Annotations** | Highlight, underline, strikethrough, pen, sticky notes, text boxes, shapes (rect / ellipse / arrow / line), stamps, signature (draw or type) — burned into export via pdf-lib |
| **Page tools** | Rotate, delete, reorder (drag thumbnails), insert blank, extract page, merge another PDF |
| **Forms** | Fill AcroForm fields when present; optional flatten on export |
| **Search** | Text search with match navigation |
| **Export** | Download edited PDF; print |
| **History** | Undo / redo; select & delete annotations |
| **Settings** | Theme (system / light / dark), default colors, shortcuts cheat sheet |

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Radix UI** primitives (shadcn-style)
- **pdf.js** for rendering · **pdf-lib** for export / page ops
- **Zustand** + Immer for editor state · **Framer Motion** · **Sonner** toasts
- **IndexedDB** (`idb`) for recent files & settings

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build (must pass)
npm start       # serve production build
```

A sample PDF is available at `/sample.pdf` (also via the empty-state “Try sample PDF” button).

## Architecture notes

- All processing is **client-side**. The PDF never leaves the browser for editing.
- Annotations are stored in page coordinates and composited onto pages at export time with pdf-lib.
- Page ops (rotate / delete / reorder / blank insert) are applied when building the export document.
- Form field values are written back with pdf-lib; enable **Flatten forms on export** in Settings to burn values into page content.

## Known gaps (v1)

- Markup tools (highlight / underline / strikethrough) use drag rectangles rather than true text-selection quads.
- Free-text editing of existing PDF content (content stream rewrite) is not supported — overlay / burn-in model only.
- Complex XFA forms and encrypted PDFs have limited support.
- Thumbnail reorder is drag-and-drop within the sidebar; large documents may feel heavier in memory.

## License

MIT
