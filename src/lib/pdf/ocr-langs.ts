/** Tesseract.js language packs used by InstantPDFEdit OCR. */

export type OcrLangOption = {
  /** Tesseract lang code(s), e.g. "eng" or "eng+hin" */
  id: string;
  label: string;
  /** Shown first in the picker */
  prominent?: boolean;
};

export const OCR_LANGS: OcrLangOption[] = [
  { id: "eng", label: "English", prominent: true },
  { id: "hin", label: "Hindi", prominent: true },
  { id: "eng+hin", label: "English + Hindi", prominent: true },
  { id: "spa", label: "Spanish" },
  { id: "fra", label: "French" },
  { id: "deu", label: "German" },
  { id: "ita", label: "Italian" },
  { id: "por", label: "Portuguese" },
  { id: "rus", label: "Russian" },
  { id: "ara", label: "Arabic" },
  { id: "chi_sim", label: "Chinese (Simplified)" },
  { id: "jpn", label: "Japanese" },
  { id: "kor", label: "Korean" },
];

export const DEFAULT_OCR_LANG = "eng+hin";
