/**
 * Lazy-loads the MuPDF WASM module so it is not pulled into the initial bundle
 * when the user keeps the PDF.js engine selected.
 */
export async function loadMuPdf(): Promise<typeof import('mupdf')> {
  return import('mupdf');
}
