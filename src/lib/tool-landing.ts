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
  {
    slug: "pdf-to-word",
    path: "/pdf-to-word",
    title: "PDF to Word — free DOCX export, no upload",
    description:
      "Export PDF text to a Word .docx on your device. Fast text mode or Rich layout with page images when text is missing. Private approximation — not a perfect Word clone.",
    h1: "Convert PDF to Word on your device",
    intro:
      "Export a PDF into a Word-friendly .docx without uploading. Fast mode pulls extractable text into lines and paragraphs. Rich mode also embeds page JPEGs when a page has little or no text. Layout will not match Word perfectly — use OCR first on scans.",
    faqs: [
      {
        q: "How do I convert a PDF to Word here?",
        a: "Drop a PDF, choose Fast (text) or Rich (layout + images), then tap Export DOCX. You download a .docx built in your browser. Scanned pages need OCR first if there is no selectable text.",
      },
      {
        q: "Is this a perfect Word conversion?",
        a: "No. It is a free local approximation: text is clustered into lines and paragraphs with basic bold/italic/size detection. Complex tables, columns, and exact fonts often differ from Adobe or Word. Rich mode helps image-only pages.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Conversion runs on your device. The PDF is not sent to InstantPDFEdit for this tool.",
      },
      {
        q: "What is the difference between Fast and Rich?",
        a: "Fast exports extractable text only and is quicker. Rich also embeds JPEG snapshots of pages that lack text so you still see the page content in Word.",
      },
      {
        q: "My scan exported blank or garbled text. What should I do?",
        a: "Run OCR PDF first to add a text layer, then convert. Password-protected files should be unlocked before export.",
      },
    ],
  },
  {
    slug: "protect",
    path: "/protect",
    title: "Password protect PDF — encrypt in your browser",
    description:
      "Add a password to a PDF on your device. Encryption stays private — InstantPDFEdit never uploads your file and cannot recover a lost password.",
    h1: "Password-protect a PDF without uploading",
    intro:
      "Encrypt a PDF with a user password so opening it requires that password. Protection runs entirely in your browser. Keep the password safe — InstantPDFEdit cannot reset or recover it.",
    faqs: [
      {
        q: "How do I password-protect a PDF?",
        a: "Drop a PDF, enter a password and confirm it, then tap Protect PDF. Download the encrypted file. Recipients need the password to open it.",
      },
      {
        q: "Is my PDF uploaded when I protect it?",
        a: "No. Encryption runs on your device. The file and password never leave your browser for this tool.",
      },
      {
        q: "Can InstantPDFEdit recover my password?",
        a: "No. We never see your password. If you forget it, you will need an unprotected copy of the original file.",
      },
      {
        q: "What kind of protection is this?",
        a: "User-password encryption so opening the PDF requires the password. It is not a substitute for full enterprise DRM or permission policies beyond what the PDF encryption supports here.",
      },
      {
        q: "How do I remove a password later?",
        a: "Use Unlock PDF with the correct password to download an unprotected copy. Only do that if you are allowed to remove protection.",
      },
    ],
  },
  {
    slug: "ocr",
    path: "/ocr",
    title: "OCR PDF — make scans searchable, on-device",
    description:
      "Run OCR on a scanned PDF in your browser. Searchable mode keeps page images and adds a selectable text layer. Language packs download once and stay cached — nothing is uploaded.",
    h1: "Make a scanned PDF searchable on your device",
    intro:
      "Recognize text in scans without uploading. Choose a language (English, Hindi, and more). Searchable mode keeps the page images and adds a text layer you can select and search. Language data downloads once, then stays cached. Cancel stops the worker promptly.",
    faqs: [
      {
        q: "How does OCR work here?",
        a: "Pages are recognized on your device with an on-device OCR engine. You can download plain text or a searchable PDF that keeps the images and adds a selectable text layer.",
      },
      {
        q: "Is my PDF uploaded for OCR?",
        a: "No. Recognition runs locally. A language pack may download once to your browser cache; your PDF itself is not uploaded.",
      },
      {
        q: "Which language should I pick?",
        a: "Match the language of the scan. For mixed English and Hindi documents, pick the combined option when listed. Wrong language often yields little or garbled text.",
      },
      {
        q: "What if OCR finds little or no text?",
        a: "Try a clearer scan, a higher-resolution PDF, or another language. Failed pages keep their image so the rest of the document can still finish.",
      },
      {
        q: "Can I cancel a long OCR job?",
        a: "Yes. Cancel stops recognition and clears the OCR worker so it does not keep downloading language data in the background.",
      },
    ],
  },
  {
    slug: "rotate",
    path: "/rotate",
    title: "Rotate PDF pages — 90°, 180°, 270°, no upload",
    description:
      "Rotate all pages or selected pages of a PDF by 90°, 180°, or 270° in your browser. Private — files stay on your device.",
    h1: "Rotate PDF pages without uploading",
    intro:
      "Fix sideways or upside-down pages. Choose 90°, 180°, or 270°, optionally limit to pages like 1,3,5, then download the rotated PDF. Rotation runs on your device.",
    faqs: [
      {
        q: "How do I rotate a PDF?",
        a: "Drop a PDF, pick 90°, 180°, or 270°, optionally enter page numbers (or leave blank for all pages), then tap Rotate. Download the result.",
      },
      {
        q: "Can I rotate only some pages?",
        a: "Yes. Use the Pages field with a list such as 1,3,5. Leave it empty to rotate every page.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Rotation runs in your browser. Nothing is sent to a server for this tool.",
      },
      {
        q: "Does rotate change the file forever?",
        a: "You download a new PDF with the rotation applied. Your original file on disk is unchanged unless you overwrite it yourself.",
      },
      {
        q: "When should I use Organize instead?",
        a: "Use Organize pages if you also need to drag-reorder or delete pages visually. Rotate is the quick path when you only need a fixed angle.",
      },
    ],
  },
  {
    slug: "organize",
    path: "/organize",
    title: "Organize PDF pages — reorder, rotate, delete",
    description:
      "Visually reorder, rotate, or delete PDF pages in your browser. Drag thumbnails, then download the new PDF. Private — no upload.",
    h1: "Organize PDF pages on your device",
    intro:
      "See page thumbnails, drag to reorder, rotate individual pages, or remove ones you do not need. Apply the new order and download a fresh PDF. Everything stays in your browser.",
    faqs: [
      {
        q: "How do I reorder PDF pages?",
        a: "Drop a PDF, drag thumbnails into the order you want, optionally rotate or delete pages, then save. You download one reorganized PDF.",
      },
      {
        q: "Can I rotate and delete in the same pass?",
        a: "Yes. Organize lets you reorder, rotate, and remove pages before you download the result.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Organizing runs on your device. Pages are not sent to InstantPDFEdit.",
      },
      {
        q: "Is there a page limit?",
        a: "There is no hard cutoff. Very long PDFs use more memory for thumbnails. Prefer under about 50–100 pages for a smooth experience on phones.",
      },
      {
        q: "How is this different from Rotate or Split?",
        a: "Organize is visual multi-edit (reorder + rotate + delete). Rotate is a quick angle-only tool. Split pulls out page ranges into separate files.",
      },
    ],
  },

  {
    slug: "unlock",
    path: "/unlock",
    title: "Unlock PDF — remove password in your browser",
    description:
      "Remove a PDF password when you know it. Unlock runs on your device — InstantPDFEdit never uploads the file or sees your password.",
    h1: "Unlock a password-protected PDF",
    intro:
      "Enter the password you already know and download an unprotected copy. Unlocking stays in your browser. Only unlock files you are allowed to open.",
    faqs: [
      {
        q: "How do I unlock a PDF?",
        a: "Drop a protected PDF, type the password, then tap Unlock. You download a plain PDF without encryption.",
      },
      {
        q: "Do you upload my PDF or password?",
        a: "No. Unlocking runs on your device. The file and password never leave your browser for this tool.",
      },
      {
        q: "What if the password is wrong?",
        a: "You will see an error. InstantPDFEdit cannot guess or recover passwords. Try again only if you know the correct one.",
      },
      {
        q: "Does this work on every protected PDF?",
        a: "It works for common user-password encryption, including files protected here. Some uncommon or owner-only restrictions may not unlock.",
      },
      {
        q: "How do I add a password again later?",
        a: "Use Protect PDF to encrypt a copy with a new password. Keep that password somewhere safe — we cannot recover it.",
      },
    ],
  },
  {
    slug: "watermark",
    path: "/watermark",
    title: "Watermark PDF — text stamp, no upload",
    description:
      "Add a text watermark such as CONFIDENTIAL to every page. Set opacity, size, color, and position in your browser — files are not uploaded.",
    h1: "Add a text watermark to a PDF",
    intro:
      "Stamp wording like CONFIDENTIAL across pages. Choose opacity, font size, color, and position (diagonal, center, or corners). Watermarking runs on your device.",
    faqs: [
      {
        q: "How do I watermark a PDF?",
        a: "Drop a PDF, enter the stamp text, adjust opacity and position, then tap Add watermark. Download the stamped file.",
      },
      {
        q: "Can I use an image watermark here?",
        a: "This tool stamps text. For logos or seals, use Background or the editor tools that place images.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. The watermark is drawn in your browser. Nothing is sent to a server for this tool.",
      },
      {
        q: "Will the watermark cover the whole page?",
        a: "Diagonal and center place a large stamp; corner options sit in that corner. Lower opacity keeps the page easier to read.",
      },
      {
        q: "Can I remove a watermark later?",
        a: "Not automatically. Keep an unmarked original if you may need a clean copy again.",
      },
    ],
  },
  {
    slug: "sign",
    path: "/sign",
    title: "Sign PDF free — draw or type, no upload",
    description:
      "Sign a PDF in your browser. Draw, type, or upload a signature in the InstantPDFEdit editor. Files stay on your device — nothing is uploaded.",
    h1: "Sign a PDF on your device",
    intro:
      "Open the editor to draw, type, or upload a signature and place it on any page. For contracts, sign then flatten so forms cannot be edited. Everything stays in your browser.",
    faqs: [
      {
        q: "How do I sign a PDF here?",
        a: "Open the editor from this page, add your PDF, create a signature (draw, type, or upload), place it, then export. Export can flatten and lock when a signature is present.",
      },
      {
        q: "Is signing the same as DocuSign?",
        a: "No. This is a free visual signature on the PDF in your browser. It is not a paid e-sign workflow with identity checks or audit trails.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Signing runs locally. Your PDF stays on your device.",
      },
      {
        q: "Should I flatten after signing?",
        a: "For contracts, yes — flatten and lock so form fields and annotations are harder to change. Use Flatten after export if needed.",
      },
      {
        q: "Can I request someone else to sign?",
        a: "Use Request signature for a simple pack you can email. It is not a hosted signing portal.",
      },
    ],
  },
  {
    slug: "redact",
    path: "/redact",
    title: "Redact PDF — black out text privately",
    description:
      "Black out sensitive areas on a PDF in your browser. Soft boxes or hard wipe. Pattern hints for emails and phones. Files are not uploaded.",
    h1: "Redact a PDF without uploading",
    intro:
      "Mark regions to black out, or use pattern search for emails and similar text. Soft mode draws boxes; Hard wipe burns black into the page image so underlying text in those areas is destroyed (best-effort). Verify the preview before you download.",
    faqs: [
      {
        q: "How do I redact a PDF?",
        a: "Drop a PDF, draw black-out regions or select pattern matches, choose Soft or Hard wipe, then apply. Check the verify preview before downloading.",
      },
      {
        q: "What is Hard wipe vs soft boxes?",
        a: "Soft boxes cover the area visually but text may still be selectable underneath. Hard wipe redraws affected pages so black regions destroy the content there — still not full forensic sanitization.",
      },
      {
        q: "Is my PDF uploaded for redaction?",
        a: "No. Redaction runs on your device. Nothing is sent to InstantPDFEdit for this tool.",
      },
      {
        q: "Can patterns find every secret automatically?",
        a: "No. Pattern search is a helper for common shapes like emails or phone-like numbers. Always review pages yourself for names, IDs, and images.",
      },
      {
        q: "Is this enough for legal or classified data?",
        a: "Treat it as a careful local tool, not certified sanitization. Prefer Hard wipe, verify every page, and follow your own compliance rules.",
      },
    ],
  },
  {
    slug: "word-to-pdf",
    path: "/word-to-pdf",
    title: "Word to PDF — DOCX convert, no upload",
    description:
      "Convert a .docx to PDF in your browser. Free local conversion via HTML rendering. Layout is approximate — Print remains a high-fidelity fallback.",
    h1: "Convert Word to PDF on your device",
    intro:
      "Drop a .docx, preview the converted content, then download a PDF built in your browser. Layout will not match Word perfectly. Use Print / Save as PDF if you need a closer look. The file is not uploaded.",
    faqs: [
      {
        q: "How do I convert Word to PDF here?",
        a: "Drop a .docx file, wait for the preview, then tap Download PDF. If conversion struggles, use Print / Save as PDF from the preview.",
      },
      {
        q: "Is this a perfect Word conversion?",
        a: "No. It is a free local approximation: the document is turned into HTML, then into a PDF. Complex layouts, fonts, and floating objects often differ from Word.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Conversion runs in your browser. The .docx stays on your device.",
      },
      {
        q: "Does .doc (old Word) work?",
        a: "This page expects .docx. Save older .doc files as .docx in Word first, or use Print to PDF from another app.",
      },
      {
        q: "When should I use Print instead?",
        a: "When you need closer print fidelity. The built-in download is convenient; Print uses your browser’s print engine as a fallback.",
      },
    ],
  },
  {
    slug: "page-numbers",
    path: "/page-numbers",
    title: "Add page numbers to PDF — free, no upload",
    description:
      "Number PDF pages in the header or footer. Custom format with {n} and {total}. Private — numbering runs in your browser.",
    h1: "Add page numbers to a PDF",
    intro:
      "Stamp page numbers in the header or footer. Choose alignment and a format such as Page {n} of {total}. Numbering stays on your device — nothing is uploaded.",
    faqs: [
      {
        q: "How do I add page numbers?",
        a: "Drop a PDF, pick Header or Footer, set alignment and format, then tap Add numbers. Download the numbered PDF.",
      },
      {
        q: "What do {n} and {total} mean?",
        a: "{n} is the current page number. {total} is how many pages the PDF has. Example: Page {n} of {total}.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Page numbers are drawn in your browser. The file never leaves your device for this tool.",
      },
      {
        q: "Can I start numbering from a number other than 1?",
        a: "This tool uses the PDF’s own page order starting at 1. For Bates-style prefixes, use Bates numbering instead.",
      },
      {
        q: "Will numbers cover existing content?",
        a: "They sit in the header or footer margin area. Dense layouts may still overlap — check a few pages after download.",
      },
    ],
  },
];

const BY_SLUG = new Map(LANDINGS.map((l) => [l.slug, l]));

export function getToolLanding(slug: string): ToolLanding | null {
  return BY_SLUG.get(slug) ?? null;
}

export const TOOL_LANDING_SLUGS = LANDINGS.map((l) => l.slug);
