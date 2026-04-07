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
Cursor's first attempt set workerSrc to a string path. This silently 
fails in Vite's ESM dev server. I changed it to use the `?url` import
pattern: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`.
Verified by checking for "Setting up fake worker" warnings (none).

## Phase 12 — spread mode fix (second attempt)
First attempt at fixing spread mode addressed [whatever Cursor
patched the first time] but the bug was actually [the real cause].
Cursor's diagnostic trace showed [the broken link in the chain].
Fixed by [the actual fix]. Verified across 2/5/6-page documents
covering cover, midbook, and odd-tail cases.

## Phase 20 — architecture doc location fix
Cursor placed architecture.md at A/docs/architecture.md instead of B/.
Per the take-home spec, deliverable B is its own folder, and the doc
belongs there. Moved the file and updated internal relative links plus
the A/README.md reference to point at the new location.

## Phase 21 — mupdf top-level await build error
mupdf's distributed bundle uses top-level await (await import 'node:fs',
await libmupdf_wasm()). Vite's default esbuild target is es2020 which
predates TLA. Fixed by setting esbuild.target, optimizeDeps.esbuildOptions.target,
and build.target to 'es2022' in vite.config.ts, plus adding mupdf to
optimizeDeps.exclude so Vite's scanner skips it (mupdf is loaded lazily
via dynamic import in MuPdfEngine). Verified COOP/COEP headers preserved.
Verified mupdf.wasm only loads on engine selector toggle.

## Phase 24 — cursor log location fix
Cursor placed the cursor usage log inside A/docs/ instead of C/, even
though the spec is explicit that C is a separate top-level deliverable.
Moved to C/. The four pre-existing C/ files (cursor-plan.md,
cursor-transcript.md, changes-from-ai.md, validation.md) were preserved
unchanged — only the new file from A/ was relocated.
