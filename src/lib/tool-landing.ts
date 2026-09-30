/**
 * Search-intent landing copy for high-traffic tool routes.
 * Card blurbs in tools.ts stay short; these strings are page-only.
 * Keep claims aligned with what the tool actually does.
 */

export type ToolFaqItem = { q: string; a: string };

export type ToolLanding = {
  slug: string;
  path: string;
  /** Metadata title (root template appends · InstantPDFEdit) */
  title: string;
  description: string;
  h1: string;
  intro: string;
  faqs: ToolFaqItem[];
};

const LANDINGS: ToolLanding[] = [
  {
    slug: "merge",
    path: "/merge",
    title: "Merge PDF files free — no upload",
    description:
      "Combine PDFs into one file in your browser. Reorder before merging and optionally add a bookmark from each file name. Private — InstantPDFEdit never uploads your PDFs.",
    h1: "Merge PDF files without uploading",
    intro:
      "Join two or more PDFs into a single file. Drag to set the order, then merge. You can add a bookmark named after each file. Merging runs on your device — your PDFs are not sent to a server.",
    faqs: [
      {
        q: "How do I merge PDF files?",
        a: "Add at least two PDFs, drag them into the order you want, then tap Merge. You download one combined PDF. A switch can add a bookmark from each file name at the start of that file’s pages.",
      },
      {
        q: "Are my PDFs uploaded when I merge them?",
        a: "No. Merge runs in your browser. Files stay on your device and are not sent to InstantPDFEdit for this tool.",
      },
      {
        q: "Is there a file size or page limit?",
        a: "There is no hard cutoff. For a smooth merge, stay around 20 files and about 100 MB combined. Larger sets can slow or freeze the tab, especially on a phone. You will see a warning, not a block.",
      },
      {
        q: "Are existing bookmarks and form fields kept?",
        a: "Pages are copied into a new PDF. The optional bookmarks are new ones made from file names — bookmarks already inside the source files are not copied. Interactive forms may not behave the same after merge.",
      },
      {
        q: "What is merge useful for?",
        a: "Joining chapters, invoices, or scanned pages into one PDF you can download and share. Password-protected files should be unlocked first.",
      },
    ],
  },
  {
    slug: "compress",
    path: "/compress",
    title: "Compress PDF online — private, in your browser",
    description:
      "Shrink a PDF for email or the web. Presets redraw pages as JPEG images, so it is lossy and text can look softer. Files stay in your browser — nothing is uploaded.",
    h1: "Compress a PDF on your device",
    intro:
      "Make a PDF smaller for email or sharing. Choose Email, Web, High quality, or Smallest. Every preset redraws pages as JPEG images, so pictures and text can look softer — this is not a lossless shrink. A text-only PDF may not get much smaller. Compression stays in your browser.",
    faqs: [
      {
        q: "How does PDF compression work here?",
        a: "Each page is drawn again as a JPEG and saved into a new PDF. Email and Smallest use stronger shrink and softer detail. Web is the default balance. High quality keeps more detail and a larger file.",
      },
      {
        q: "Is compression lossless?",
        a: "No. All presets are lossy. Fine text and line art can look soft, and a PDF that is already small or mostly text might barely shrink — sometimes it can even grow. If you need the original sharpness, keep the original file.",
      },
      {
        q: "Do you upload my PDF to compress it?",
        a: "No. Compression runs on your device. The file is not uploaded to a server.",
      },
      {
        q: "How large a PDF can I compress?",
        a: "There is no strict limit. Prefer under about 20 MB and about 50 pages for a comfortable run (harder past about 80 MB or 200 pages). Phones do better under about 8 MB and 20 pages. You get a warning if a file looks heavy.",
      },
      {
        q: "When should I compress a PDF?",
        a: "Photo-heavy scans and files that are too big to email. For a document you still need to read closely, try High quality or skip compression.",
      },
    ],
  },
  {
    slug: "split",
    path: "/split",
    title: "Split PDF by pages — free, no upload",
    description:
      "Split a PDF by page ranges or save every page as its own PDF. One result downloads as a PDF; several files come as a ZIP. Private — splitting stays in your browser.",
    h1: "Split a PDF by page ranges",
    intro:
      "Pull out the pages you need. Type ranges such as 1-3, 5, or split every page into its own PDF. One result downloads as a PDF. More than one file downloads as a ZIP. Splitting runs on your device — nothing is uploaded.",
    faqs: [
      {
        q: "How do I split a PDF?",
        a: "Drop one PDF, choose Ranges, and enter pages like 1-3, 5 or 4-6. Each range becomes its own PDF. If you only make one file, you download that PDF. If you make several, you download a ZIP.",
      },
      {
        q: "Can I save every page as its own PDF?",
        a: "Yes. Switch mode to Every page. Each page is written as a separate PDF and, when there is more than one, packed into a ZIP.",
      },
      {
        q: "Is my PDF uploaded to split it?",
        a: "No. Split runs in your browser. The file stays on your device.",
      },
      {
        q: "Are there page or size limits?",
        a: "No hard limit. Prefer under about 20 MB and about 50 pages so the tab stays responsive (harder past about 80 MB or 200 pages). Splitting every page of a very long PDF uses more memory.",
      },
      {
        q: "What is this useful for?",
        a: "Pulling a chapter out of a packet, separating a form from the rest of a scan, or sending someone only the pages they need. Unlock a password-protected PDF first.",
      },
    ],
  },
  {
    slug: "pdf-to-jpg",
    path: "/pdf-to-jpg",
    title: "PDF to JPG — convert pages in your browser",
    description:
      "Turn each PDF page into a JPG. One page downloads as an image; several pages come as a ZIP. Choose 1.5×, 2×, or 3×. Private — no upload.",
    h1: "Convert PDF pages to JPG",
    intro:
      "Render each page of a PDF as a JPG picture. Choose 1.5×, 2× (the default), or 3× for a sharper image. A single page downloads as a JPG. More than one page downloads as a ZIP. Conversion runs in your browser — the PDF is not uploaded.",
    faqs: [
      {
        q: "How do I convert a PDF to JPG?",
        a: "Drop a PDF, pick a resolution, and tap Convert. Each page becomes a JPG named page_1.jpg, page_2.jpg, and so on. One page downloads alone; several pages download together in a ZIP.",
      },
      {
        q: "What does the resolution setting do?",
        a: "1.5×, 2×, and 3× control how large the picture is compared with the PDF page. Higher looks sharper and makes a bigger file. JPG quality is high (about 92%). This is a picture of the page, not a separate text file.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Pages are rendered on your device. Nothing is sent to a server for this conversion.",
      },
      {
        q: "How many pages can I convert?",
        a: "There is no fixed cap. Long PDFs and 3× resolution use more memory. Prefer under about 20 MB and about 50 pages. If the tab struggles, try a lower resolution or split the PDF first.",
      },
      {
        q: "When should I use PDF to JPG?",
        a: "Sharing a slide or a form page as a picture, or making a preview image. Text in the JPG cannot be selected. For a PNG instead, use PDF to PNG.",
      },
    ],
  },
  {
    slug: "jpg-to-pdf",
    path: "/jpg-to-pdf",
    title: "JPG to PDF — photos to one PDF, no upload",
    description:
      "Turn JPG photos into a multi-page PDF in your browser. Page size can match the photo, A4, or Letter. Reorder images first. Files are not uploaded.",
    h1: "Turn JPG photos into a PDF",
    intro:
      "Add one or more JPG images, reorder them, and build a PDF. Page size can follow each photo, or fit the photo onto A4 or Letter. This page accepts JPG and JPEG only. The PDF is created on your device — photos are not uploaded.",
    faqs: [
      {
        q: "How do I convert JPG to PDF?",
        a: "Drop one or more JPG files, drag to set the page order, choose a page size, and tap Create PDF. You download one PDF with one page per image.",
      },
      {
        q: "What page sizes can I pick?",
        a: "Auto uses the photo’s own pixel size. A4 and Letter fit the image onto that paper size with the whole photo visible. Margins are not added in Auto mode.",
      },
      {
        q: "Can I use PNG, WebP, or HEIC here?",
        a: "This tool accepts JPG and JPEG. Use PNG to PDF, WebP to PDF, HEIC to PDF, or Images to PDF for other picture types.",
      },
      {
        q: "Are photos uploaded?",
        a: "No. The PDF is built in your browser. Images stay on your device.",
      },
      {
        q: "How many images can I add?",
        a: "For a smooth run, stay around 20 images and about 100 MB total. More can slow the tab, especially on a phone. You will see a warning rather than a hard stop. Handy for receipt photos, scans, and homework pictures.",
      },
    ],
  },
];

const BY_SLUG = new Map(LANDINGS.map((l) => [l.slug, l]));

export function getToolLanding(slug: string): ToolLanding | null {
  return BY_SLUG.get(slug) ?? null;
}

export const TOOL_LANDING_SLUGS = LANDINGS.map((l) => l.slug);
