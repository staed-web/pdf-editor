export type Tool =
  | "select"
  | "pan"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "pen"
  | "note"
  | "textbox"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "stamp"
  | "signature"
  | "form";

export type ZoomMode = "fit-width" | "fit-page" | "percent";

export type AnnotationType =
  | "highlight"
  | "underline"
  | "strikethrough"
  | "pen"
  | "note"
  | "textbox"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "stamp"
  | "signature";

/** Normalized page coords: origin top-left, units = PDF points at 72dpi scale=1 */
export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  pageIndex: number;
  type: AnnotationType;
  color: string;
  opacity: number;
  strokeWidth: number;
  createdAt: number;
}

export interface MarkupAnnotation extends BaseAnnotation {
  type: "highlight" | "underline" | "strikethrough";
  rects: { x: number; y: number; w: number; h: number }[];
  /** Selected text captured from the text layer (optional) */
  text?: string;
}

export interface PenAnnotation extends BaseAnnotation {
  type: "pen";
  points: Point[];
}

export interface NoteAnnotation extends BaseAnnotation {
  type: "note";
  x: number;
  y: number;
  text: string;
}

export interface TextBoxAnnotation extends BaseAnnotation {
  type: "textbox";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: "rect" | "ellipse" | "arrow" | "line";
  x: number;
  y: number;
  w: number;
  h: number;
  filled: boolean;
  fillColor: string;
}

export interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: "signature";
  x: number;
  y: number;
  w: number;
  h: number;
  /** data URL PNG or typed text */
  dataUrl?: string;
  text?: string;
  fontSize?: number;
}

export type Annotation =
  | MarkupAnnotation
  | PenAnnotation
  | NoteAnnotation
  | TextBoxAnnotation
  | ShapeAnnotation
  | StampAnnotation
  | SignatureAnnotation;

export interface PageMeta {
  id: string;
  /** Original PDF page index before ops; -1 for blank inserted */
  sourceIndex: number;
  rotation: number; // 0|90|180|270 cumulative
  width: number;
  height: number;
}

export interface FormFieldValue {
  name: string;
  value: string;
  type: string;
  pageIndex: number;
}

export interface EditorSettings {
  theme: "light" | "dark";
  defaultColor: string;
  defaultStrokeWidth: number;
  defaultOpacity: number;
  flattenFormsOnExport: boolean;
  showThumbnails: boolean;
  showProperties: boolean;
}

export interface RecentFileMeta {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  lastOpened: number;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: "light",
  defaultColor: "#F59E0B",
  defaultStrokeWidth: 2,
  defaultOpacity: 0.4,
  flattenFormsOnExport: false,
  showThumbnails: true,
  showProperties: true,
};

export const STAMP_PRESETS = [
  "APPROVED",
  "REJECTED",
  "CONFIDENTIAL",
  "DRAFT",
  "FINAL",
  "REVIEWED",
  "SIGNED",
  "VOID",
] as const;
