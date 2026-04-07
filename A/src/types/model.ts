export interface PageDescriptor {
  /** Stable UUID for React keys + drag tracking */
  id: string;
  /** 0-indexed page in the current PDFDocument/PDFDocumentProxy */
  sourceIndex: number;
  /** Cumulative rotation applied in editor */
  rotation: 0 | 90 | 180 | 270;
}

export type FitMode = 'none' | 'width' | 'page';
export type ScrollMode = 'continuous' | 'single' | 'spread';
export type EnginePreference = 'pdfjs' | 'mupdf';
