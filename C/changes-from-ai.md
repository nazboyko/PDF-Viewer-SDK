## Plan correction — bonus tier scope
Cursor's first attempt at re-adding the WASM bonus tier brought back the
full spec list, including text-highlighter redaction and interactive form
widgets. These conflict with the scope cuts in `.cursorrules`. I caught
the contradiction during plan review and prompted Cursor to align the
plan with the rules. Three requirements were dropped or changed from
"interactive" to "read-only rendering."

## Phase 1 — Project Scaffold
No changes from AI output.

## Phase 4 — PdfEngine Interface + PDF.js Adapter (Loading)
- Cursor's first attempt set workerSrc to a string path. This silently
  fails in Vite's ESM dev server. I changed it to use the `?url` import
  pattern: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`.
  Verified by checking for "Setting up fake worker" warnings (none).