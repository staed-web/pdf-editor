import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Scissors,
  LayoutGrid,
  RotateCw,
  FileOutput,
  Trash2,
  Minimize2,
  Wrench,
  Image as ImageIcon,
  FileImage,
  Images,
  FileType,
  FileText,
  FileSpreadsheet,
  Presentation,
  Code2,
  Pencil,
  Highlighter,
  Crop,
  Droplets,
  Hash,
  PanelTop,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  PenTool,
  FormInput,
  ScanText,
  Sparkles,
} from "lucide-react";

export type ToolCategory =
  | "organize"
  | "optimize"
  | "convert"
  | "edit"
  | "security"
  | "sign"
  | "ai"
  | "batch";

export interface ToolDef {
  slug: string;
  href: string;
  name: string;
  short: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  featured?: boolean;
  accept?: string;
  multiple?: boolean;
  status?: "full" | "partial";
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  organize: "Organize",
  optimize: "Optimize",
  convert: "Convert",
  edit: "Edit & Annotate",
  security: "Security",
  sign: "Sign & Forms",
  ai: "AI / Smart",
  batch: "Batch",
};

export const CATEGORY_ORDER: ToolCategory[] = [
  "organize",
  "optimize",
  "convert",
  "edit",
  "security",
  "sign",
  "ai",
];

export const TOOLS: ToolDef[] = [
  {
    slug: "merge",
    href: "/merge",
    name: "Merge PDF",
    short: "Combine PDFs",
    description: "Merge multiple PDF files into one. Reorder freely before combining.",
    category: "organize",
    icon: Combine,
    featured: true,
    accept: "application/pdf",
    multiple: true,
  },
  {
    slug: "split",
    href: "/split",
    name: "Split PDF",
    short: "Extract or split",
    description: "Split by page ranges or save every page as its own PDF.",
    category: "organize",
    icon: Scissors,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "organize",
    href: "/organize",
    name: "Organize pages",
    short: "Reorder & rotate",
    description: "Visually reorder, rotate, or delete pages in your PDF.",
    category: "organize",
    icon: LayoutGrid,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "rotate",
    href: "/rotate",
    name: "Rotate PDF",
    short: "Rotate pages",
    description: "Rotate all pages or selected pages by 90°, 180°, or 270°.",
    category: "organize",
    icon: RotateCw,
    accept: "application/pdf",
  },
  {
    slug: "extract",
    href: "/extract",
    name: "Extract pages",
    short: "Pick pages",
    description: "Select pages and export them as a new PDF.",
    category: "organize",
    icon: FileOutput,
    accept: "application/pdf",
  },
  {
    slug: "delete-pages",
    href: "/delete-pages",
    name: "Delete pages",
    short: "Remove pages",
    description: "Remove selected pages from your PDF.",
    category: "organize",
    icon: Trash2,
    accept: "application/pdf",
  },
  {
    slug: "compress",
    href: "/compress",
    name: "Compress PDF",
    short: "Reduce size",
    description: "Shrink PDF size by downsampling embedded images. Honest about limits.",
    category: "optimize",
    icon: Minimize2,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "repair",
    href: "/repair",
    name: "Repair PDF",
    short: "Re-save & fix",
    description: "Best-effort repair by re-writing the PDF structure with pdf-lib.",
    category: "optimize",
    icon: Wrench,
    accept: "application/pdf",
  },
  {
    slug: "jpg-to-pdf",
    href: "/jpg-to-pdf",
    name: "JPG to PDF",
    short: "Images → PDF",
    description: "Convert JPG photos into a polished multi-page PDF.",
    category: "convert",
    icon: ImageIcon,
    featured: true,
    accept: "image/jpeg,.jpg,.jpeg",
    multiple: true,
  },
  {
    slug: "png-to-pdf",
    href: "/png-to-pdf",
    name: "PNG to PDF",
    short: "PNG → PDF",
    description: "Convert PNG images into a PDF document.",
    category: "convert",
    icon: FileImage,
    accept: "image/png,.png",
    multiple: true,
  },
  {
    slug: "images-to-pdf",
    href: "/images-to-pdf",
    name: "Images to PDF",
    short: "Any images",
    description: "Drop JPG, PNG, or WebP images and build a PDF.",
    category: "convert",
    icon: Images,
    accept: "image/*,.jpg,.jpeg,.png,.webp",
    multiple: true,
  },
  {
    slug: "pdf-to-jpg",
    href: "/pdf-to-jpg",
    name: "PDF to JPG",
    short: "Pages → JPG",
    description: "Render each PDF page to a high-quality JPG (ZIP if many).",
    category: "convert",
    icon: FileType,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "pdf-to-png",
    href: "/pdf-to-png",
    name: "PDF to PNG",
    short: "Pages → PNG",
    description: "Render each PDF page to a PNG image (ZIP if many).",
    category: "convert",
    icon: FileImage,
    accept: "application/pdf",
  },
  {
    slug: "word-to-pdf",
    href: "/word-to-pdf",
    name: "Word to PDF",
    short: "DOCX → PDF",
    description: "Convert .docx to PDF via HTML rendering in your browser.",
    category: "convert",
    icon: FileText,
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status: "partial",
  },
  {
    slug: "pdf-to-word",
    href: "/pdf-to-word",
    name: "PDF to Word",
    short: "Text extract",
    description: "Export PDF text to a Word-friendly HTML/DOCX approximation.",
    category: "convert",
    icon: FileText,
    accept: "application/pdf",
    status: "partial",
  },
  {
    slug: "excel-to-pdf",
    href: "/excel-to-pdf",
    name: "Excel to PDF",
    short: "XLSX → PDF",
    description: "Convert spreadsheet sheets into a printable PDF.",
    category: "convert",
    icon: FileSpreadsheet,
    accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    status: "partial",
  },
  {
    slug: "pdf-to-excel",
    href: "/pdf-to-excel",
    name: "PDF to Excel",
    short: "Tables → XLSX",
    description: "Best-effort table/text extraction into a spreadsheet.",
    category: "convert",
    icon: FileSpreadsheet,
    accept: "application/pdf",
    status: "partial",
  },
  {
    slug: "ppt-to-pdf",
    href: "/ppt-to-pdf",
    name: "PPT to PDF",
    short: "Slides → PDF",
    description: "Convert PowerPoint slides — best effort via images or note if limited.",
    category: "convert",
    icon: Presentation,
    accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    status: "partial",
  },
  {
    slug: "html-to-pdf",
    href: "/html-to-pdf",
    name: "HTML to PDF",
    short: "Paste HTML",
    description: "Turn pasted HTML into a PDF using browser print rendering.",
    category: "convert",
    icon: Code2,
  },
  {
    slug: "edit",
    href: "/edit",
    name: "Edit PDF",
    short: "Full editor",
    description: "Annotate, rearrange, sign, fill forms, search, and export — the flagship editor.",
    category: "edit",
    icon: Pencil,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "annotate",
    href: "/annotate",
    name: "Annotate PDF",
    short: "Markup",
    description: "Highlight, underline, draw, and note — opens the full editor.",
    category: "edit",
    icon: Highlighter,
    accept: "application/pdf",
  },
  {
    slug: "crop",
    href: "/crop",
    name: "Crop PDF",
    short: "Crop pages",
    description: "Crop page margins uniformly or per-page.",
    category: "edit",
    icon: Crop,
    accept: "application/pdf",
  },
  {
    slug: "watermark",
    href: "/watermark",
    name: "Watermark",
    short: "Stamp pages",
    description: "Add text or image watermarks with opacity and position controls.",
    category: "edit",
    icon: Droplets,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "page-numbers",
    href: "/page-numbers",
    name: "Page numbers",
    short: "Number pages",
    description: "Add page numbers to headers or footers.",
    category: "edit",
    icon: Hash,
    accept: "application/pdf",
  },
  {
    slug: "header-footer",
    href: "/header-footer",
    name: "Header & footer",
    short: "Custom text",
    description: "Add custom header and footer text across pages.",
    category: "edit",
    icon: PanelTop,
    accept: "application/pdf",
  },
  {
    slug: "redact",
    href: "/redact",
    name: "Redact PDF",
    short: "Black-box",
    description: "Cover sensitive regions with black boxes and flatten.",
    category: "edit",
    icon: EyeOff,
    accept: "application/pdf",
    status: "partial",
  },
  {
    slug: "protect",
    href: "/protect",
    name: "Protect PDF",
    short: "Add password",
    description: "Encrypt your PDF with a password (user permissions).",
    category: "security",
    icon: Lock,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "unlock",
    href: "/unlock",
    name: "Unlock PDF",
    short: "Remove password",
    description: "Decrypt a password-protected PDF when you know the password.",
    category: "security",
    icon: Unlock,
    accept: "application/pdf",
  },
  {
    slug: "flatten",
    href: "/flatten",
    name: "Flatten PDF",
    short: "Flatten forms",
    description: "Flatten form fields and annotations into page content.",
    category: "security",
    icon: Layers,
    accept: "application/pdf",
  },
  {
    slug: "sign",
    href: "/sign",
    name: "Sign PDF",
    short: "Add signature",
    description: "Draw, type, or upload a signature and place it on your PDF.",
    category: "sign",
    icon: PenTool,
    featured: true,
    accept: "application/pdf",
  },
  {
    slug: "fill-form",
    href: "/fill-form",
    name: "Fill PDF form",
    short: "AcroForms",
    description: "Fill interactive AcroForm fields and download the result.",
    category: "sign",
    icon: FormInput,
    accept: "application/pdf",
  },
  {
    slug: "ocr",
    href: "/ocr",
    name: "OCR PDF",
    short: "Make searchable",
    description: "Run Tesseract.js OCR on scanned pages → text layer or TXT/DOCX.",
    category: "ai",
    icon: ScanText,
    accept: "application/pdf",
    status: "partial",
  },
  {
    slug: "summarize",
    href: "/summarize",
    name: "Summarize PDF",
    short: "Extract & outline",
    description: "Extract text and generate a simple local outline/summary.",
    category: "ai",
    icon: Sparkles,
    accept: "application/pdf",
    status: "partial",
  },
];

export function getTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsByCategory(cat: ToolCategory) {
  return TOOLS.filter((t) => t.category === cat);
}

export function featuredTools() {
  return TOOLS.filter((t) => t.featured);
}

export function relatedTools(slug: string, limit = 4) {
  const tool = getTool(slug);
  if (!tool) return TOOLS.filter((t) => t.slug !== slug).slice(0, limit);
  return TOOLS.filter(
    (t) => t.slug !== slug && t.category === tool.category
  )
    .concat(TOOLS.filter((t) => t.slug !== slug && t.featured))
    .filter((t, i, arr) => arr.findIndex((x) => x.slug === t.slug) === i)
    .slice(0, limit);
}
