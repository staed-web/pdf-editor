# InstantPDFEdit

**Every PDF tool. Instantly.**

A premium, privacy-first PDF suite that runs entirely in your browser — merge, split, compress, convert, annotate, sign, protect, OCR, and more. The full editor is one tool among many.

**Repo:** https://github.com/staed-web/pdf-editor

## Highlights

- **Private by design** — processed in-browser with pdf.js / pdf-lib; files are not uploaded for core tools
- **Tool hub** — categorized grid, search/filter, consistent tool shells
- **Flagship editor** at `/edit` — annotations, signatures, forms, search, page ops, export
- **Light & dark** — light-first with system toggle; preference persisted
- **Real downloads** — no fake progress bars without results
- **Honest labels** — on-device models vs Rules / heuristic; never fake “AI” or invent cloud BYOK

## Tool categories

| Category | Tools |
|----------|--------|
| Organize | Merge, Split, Organize, Rotate, Extract, Delete pages |
| Optimize | Compress, Repair |
| Convert | JPG/PNG/Images↔PDF, Word/Excel/PPT/HTML paths, PDF→Word/Excel |
| Edit | Full editor, Annotate, Crop, Watermark, Page numbers, Header/footer, Redact |
| Security | Protect, Unlock, Flatten |
| Sign & Forms | Sign, Fill form |
| On-device models | OCR (Tesseract.js), Summarize (Browser Summarizer / opt-in DistilBART), Translate (Marian / Browser Translator), Ask PDF (Browser Prompt API — no MiniLM/DistilBERT) |

## Stack

- Next.js App Router · TypeScript · Tailwind CSS · Radix / shadcn-style UI
- pdf.js · pdf-lib · JSZip · Mammoth · SheetJS · Tesseract.js
- Zustand · Framer Motion · Sonner · IndexedDB

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

Sample PDF: `/sample.pdf`.

## Architecture

Shared toolkit in `src/lib/pdf/` (ops + loader + editor export). Marketing chrome in `src/components/site/`. Reusable tool UI in `src/components/tools/`. Tool registry in `src/lib/tools.ts`.

## Known limits

- Markup in the editor uses drag rects (not full text-selection quads)
- Word/Excel/PPT conversions are best-effort client-side
- Compress works best on image-heavy PDFs
- Redact draws black boxes (not cryptographic content removal)
- Encrypted PDF unlock depends on pdf-lib support for the encryption scheme

## License

MIT
