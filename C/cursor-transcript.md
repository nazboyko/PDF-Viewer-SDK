# PDF viewer SDK web app planning
_Exported on 06/04/2026 at 23:07:45 GMT-5 from Cursor (3.0.12)_

---

**User**

I'm starting a take-home assignment to build a PDF viewer SDK web app. We're going to plan this together in Plan mode before I write a single line of code. I'll ask you a series of focused questions. For each one, give me a precise, specific answer — no hand-waving, no "the system will handle X." Name every file, type every field, signature every function.
Here is the full assignment specification. Read it carefully. After reading, respond only with: (1) a one-paragraph summary of what we're building, (2) a numbered list of every distinct functional requirement you can extract from the spec, and (3) any questions you have about ambiguous requirements. Do not propose a solution yet.

SPEC:
Create a PDF viewer SDK web app inspired by a demo video. The video shows the viewer integrated with a client application — a records management UI where users drill into a record, see attached PDF files, and click to open them in an inline viewer. Required deliverables are a working web app (MVP), an architecture document, and a Cursor AI usage log.
A. Working web app (MVP) — must include:

PDF Viewing and Navigation

Renders PDFs in the browser with high fidelity via WebAssembly (bonus)
Supports zoom (in/out, fit-to-width, fit-to-viewport), scroll modes (continuous vs per-spread), and page navigation
Supports linearization loading for fast display of large documents


PDF Editing (Document Editor)

Full document editor mode with a toolbar for page manipulation
Page rotation, reordering, import/merge of documents, and page extraction
Export edited PDFs


Printing

Provide a Print action (browser print acceptable)


Export and Conversion

Export PDFs with operations (keep specific pages, import documents)
Save PDF to local


(BONUS) If using WebAssembly:

Redaction annotations (rectangle and text-highlighter based)
Text annotations
Signature form fields and widget annotations
Bookmarks read/write



B. Architecture & design — short doc with: 1 component diagram, state management approach, key tradeoffs, and an "if I had 1 more day" roadmap.
C. Cursor AI usage log — Plan mode output, exported transcript, notes on what was changed from AI output, and how correctness was validated.
Stack: TypeScript + React + Vite. PDF.js for default rendering, pdf-lib for editing/export, mupdf-wasm for the bonus WASM tier. No backend.

---

**Cursor**

Let me first check what's already in the repository before responding.

Good — the repo is essentially empty (just a git init with a README). Here's my analysis of the spec:

---

## (1) Summary

We are building a client-side-only (no backend) web application in TypeScript + React + Vite that serves as a PDF viewer SDK. The app has two layers: a **host "records management" UI** where users browse records and see attached PDF files, and an **inline PDF viewer/editor component** that opens when a user clicks a file. The viewer must support rendering, navigation, zoom, scroll modes, a document editor mode (rotate, reorder, import/merge, extract, export pages), printing, and local save. A bonus WASM tier (via `mupdf-wasm`) adds redaction annotations, text annotations, signature form fields, widget annotations, and bookmark read/write. Deliverables also include an architecture doc and a Cursor AI usage log.

---

## (2) Distinct Functional Requirements

### Host / Shell Application
1. **Records list view** — display a list of records the user can drill into.
2. **Record detail view** — show a single record's metadata and a list of attached PDF files.
3. **PDF file open** — clicking an attached PDF opens it in an inline viewer (not a new tab/page; embedded in the same UI).

### PDF Viewing & Navigation
4. **High-fidelity PDF rendering** in the browser (baseline: PDF.js; bonus: WebAssembly via mupdf-wasm).
5. **Zoom in / zoom out** controls.
6. **Fit-to-width** zoom mode.
7. **Fit-to-viewport** (fit-to-page) zoom mode.
8. **Continuous scroll mode** — all pages in a single scrollable column.
9. **Per-spread scroll mode** — pages displayed as spreads (pairs), navigated discretely.
10. **Page navigation** — jump to a specific page by number, previous/next page controls.
11. **Linearization / progressive loading** — display the first page(s) of a large PDF before the entire file is downloaded.

### PDF Editing (Document Editor)
12. **Document editor mode** — a distinct mode with its own toolbar, separate from the viewing mode.
13. **Page rotation** — rotate individual pages (90/180/270 degrees).
14. **Page reordering** — drag-and-drop or similar UI to change page order.
15. **Page import / document merge** — import pages from another PDF into the current document.
16. **Page extraction** — extract selected pages into a new PDF.
17. **Export edited PDF** — save the result of editing operations as a new/modified PDF file.

### Printing
18. **Print action** — trigger browser print for the current PDF (browser-native print dialog is acceptable).

### Export & Conversion
19. **Export with selective pages** — export a PDF keeping only specific user-selected pages.
20. **Save PDF to local filesystem** — download the (potentially edited) PDF to the user's machine.

### Bonus — WebAssembly Tier (mupdf-wasm)
21. **Redaction annotations (rectangle-based)** — draw a rectangle over content to redact it.
22. **Redaction annotations (text-highlighter-based)** — select text and mark it for redaction.
23. **Text annotations** — add free-text annotations to pages.
24. **Signature form fields** — render and interact with signature fields in a PDF form.
25. **Widget annotations** — render and interact with generic widget annotations (checkboxes, text inputs, etc.).
26. **Bookmarks read** — parse and display the PDF's bookmark/outline tree.
27. **Bookmarks write** — create/edit/delete bookmarks and persist them in the PDF.

### Non-Functional / Deliverable Requirements
28. **No backend** — everything runs client-side; PDFs are loaded from local files or bundled assets.
29. **Stack constraint** — TypeScript, React, Vite, PDF.js (default), pdf-lib (editing/export), mupdf-wasm (bonus WASM).
30. **Architecture document** — one component diagram, state management approach, key tradeoffs, "if I had 1 more day" roadmap.
31. **Cursor AI usage log** — Plan mode output, exported transcript, notes on AI-output changes, correctness validation notes.

---

## (3) Questions on Ambiguous Requirements

**Clarifications on Spec Ambiguities**

> **The bonus WASM features (redaction, text annotations, signatures, widget annotations, bookmarks) are substantial. Do you want to attempt the full bonus tier, skip it entirely, or pick specific bonus items to include?**
> - Attempt the full WASM bonus tier
> - Pick specific bonus items (I'll tell you which)
> - Skip the bonus tier entirely, focus on core MVP ✔

> **Since there's no backend, where do PDFs come from? The spec mentions 'attached PDF files' on records. Should we bundle a few sample PDFs as static assets AND allow the user to open local files via a file picker, or just one of those?**
> - Bundle sample PDFs + allow file picker upload ✔
> - Bundle sample PDFs only (simpler)
> - File picker only, no bundled samples

> **The spec says 'per-spread' scroll mode. A spread is typically two facing pages (like an open book). Should we support single-page mode AND two-page spread mode, or interpret 'per-spread' as just single-page (non-continuous) navigation?**
> - Both: single-page AND two-page spread mode
> - Just single-page (non-continuous) is fine
>
> Answer: Implement three modes, not two. The spec literally says "continuous vs per-spread," which implies a binary toggle, but the standard interpretation in commercial PDF SDKs (Nutrient, Apryse, even Adobe Reader) is three modes

> **Linearization (progressive loading) requires a linearized PDF served over HTTP with range requests. With no backend, true linearization is hard to demo. Should we simulate it (e.g., render page 1 immediately, lazy-load remaining pages), or skip this requirement?**
> - Simulate progressive loading (lazy render pages)
> - Skip linearization, note it in tradeoffs doc
>
> Answer: Implement it for real. It's not hard without a backend, because Vite's dev server is the backend — it serves static files over HTTP with full Range request support, which is all linearization needs.

Excellent — those answers sharpen the scope significantly. Let me update the requirements based on your answers:

**Updated requirement list (changes only):**

- **Bonus WASM tier**: Dropped entirely. We build with PDF.js (rendering) + pdf-lib (editing/export) only.
- **PDF source**: Bundle 2-3 sample PDFs as static assets in `public/` AND provide a file-picker to open local PDFs. Records in the host UI reference the bundled samples; the file picker allows ad-hoc opening.
- **Scroll/layout modes**: Three modes, matching commercial SDK conventions:
  - **Continuous** — all pages in a single scrollable column
  - **Single page** — one page at a time, discrete navigation
  - **Two-page spread** — two facing pages side-by-side, discrete navigation
- **Linearization**: Real implementation. We place a linearized PDF in `public/`, Vite's dev server supports HTTP Range requests natively, and PDF.js's `getDocument({ url, rangeChunkSize, disableAutoFetch: true, disableStream: false })` handles progressive page rendering out of the box.

Requirements 21-27 (all WASM bonus items) are now **out of scope**. The active requirement count is **20 functional + 4 deliverable/constraint** requirements.

I'm ready for your next question.

---

**User**

Good. Now confirm the technical stack and the core architectural decisions before we get into specifics.
Answer each of these questions in a sentence or two:

Why TypeScript over plain JavaScript for this project?
Why React over a vanilla DOM approach or Vue/Svelte?
Why Vite over Webpack or Next.js?
Why PDF.js as the default rendering engine instead of building on mupdf-wasm directly from the start?
Why pdf-lib for editing instead of using PDF.js or mupdf for the same purpose?
Why split rendering (PdfEngine) and editing (DocumentModel) into separate abstractions instead of one unified PDF API?
What state management approach will we use, and why not Redux/Zustand/MobX?
What styling approach (Tailwind, CSS Modules, styled-components, plain CSS), and why?

Be opinionated. Each answer should make a clear case, not list pros and cons.

---

**Cursor**

Here are the decisions, one by one:

**1. Why TypeScript over plain JavaScript?**
This project is an SDK — its primary consumers are other developers embedding it. TypeScript gives us compile-time guarantees on the public API surface (every prop, callback, and configuration option is a contract), makes refactoring safe across the viewer/editor boundary, and gives IDE users autocomplete on every `PdfViewerProps` field without reading docs. For a take-home assignment, it also signals engineering rigor.

**2. Why React over vanilla DOM or Vue/Svelte?**
The host app (records management UI) and the viewer SDK both need component composition, lifecycle management, and reactive state propagation — React gives us all three with a single mental model. Vanilla DOM would mean hand-rolling a component system for the toolbar, thumbnail sidebar, and page canvas orchestration. Vue/Svelte are viable but React is the spec's explicit stack requirement, and its ecosystem (react-dnd for page reordering, refs for canvas management) is the deepest.

**3. Why Vite over Webpack or Next.js?**
Vite gives us sub-second HMR, native ESM dev serving, and — critically for this project — a dev server that handles HTTP Range requests on static files out of the box, which we need for real linearization loading. Next.js adds SSR machinery we don't need (no backend, no SEO). Webpack would work but requires more config for the same result. Vite is also the spec's explicit choice.

**4. Why PDF.js as the default renderer instead of going straight to mupdf-wasm?**
PDF.js is Mozilla's battle-tested renderer, works without WASM compilation, handles progressive/linearized loading natively via its `PDFDocumentLoadingTask` with range requests, and renders to a `<canvas>` with a text layer and annotation layer already built. mupdf-wasm would give us higher fidelity and access to annotation/form APIs, but it requires compiling a ~5 MB WASM binary, has no built-in React integration, and its linearization story is "load the whole blob then render" — the opposite of what we want. Since we dropped the bonus tier, PDF.js gives us 100% of what we need with zero WASM overhead.

**5. Why pdf-lib for editing instead of PDF.js or mupdf?**
PDF.js is a *read-only* library — it parses and renders but cannot write modified PDFs back to bytes. pdf-lib is purpose-built for PDF *manipulation*: it can copy pages between documents (`PDFDocument.copyPages`), remove pages, rotate pages (`page.setRotation`), and serialize to `Uint8Array` — exactly the operations our Document Editor needs. It operates on the PDF object model, not on rendered pixels, so it complements PDF.js perfectly: PDF.js renders, pdf-lib mutates, and we re-render after mutation.

**6. Why split rendering (PdfEngine) and editing (DocumentModel) into separate abstractions?**
Because they have different lifecycles, different data models, and different consumers. The `PdfEngine` holds a `PDFDocumentProxy` (PDF.js), manages canvas rendering, viewport transforms, and page visibility — it's hot-path, frame-rate-sensitive code. The `DocumentModel` holds a `PDFDocument` (pdf-lib), tracks an ordered list of page descriptors with rotation/origin metadata, and only materializes bytes on export. Merging them would force every zoom/scroll event to touch the editing data structure. Separating them means the viewer works without the editor (SDK flexibility), the editor can batch mutations without triggering re-renders, and we can test each in isolation.

**7. What state management approach, and why not Redux/Zustand/MobX?**
React Context + `useReducer` for two scoped stores: `ViewerContext` (current page, zoom level, scroll mode, viewport dimensions) and `EditorContext` (page list, selection, dirty flag). The state shapes are small, the update patterns are predictable (dispatch an action, reduce, re-render), and the scope is limited to the viewer subtree — no global app-wide store needed. Redux adds boilerplate and a dependency for state that never leaves one component subtree. Zustand is lighter but still an external dependency for something `useReducer` handles in ~40 lines. MobX's observable model is overkill when we have fewer than 15 state fields total.

**8. What styling approach, and why?**
CSS Modules (`.module.css` files). Vite supports them natively with zero config — `import styles from './Toolbar.module.css'` just works. They give us scoped class names (no collisions between the host app and SDK components), zero runtime cost (unlike styled-components), no extra build tooling (unlike Tailwind's PostCSS pipeline), and straightforward debugging (real class names in dev, hashed in prod). For a project this size, the simplicity-to-power ratio of CSS Modules is unbeatable.

---

**User**

Now sketch the React component tree. I want every component named, with its parent, what state it owns vs receives as props, and one sentence describing its responsibility.
Format your answer as a nested list:
- <App>
  - <FilePicker>      [owns: nothing | props: onFileSelected]
    Renders the empty-state file picker before any document is loaded.
  - <LoadingScreen>   [owns: nothing | props: filename, progress]
    ...
Cover both the viewer flow and the editor flow. Include the bonus annotations and bookmarks panels even though they're WASM-tier — mark them with [bonus] so we know which ones are gated.
Aim for 15–25 components total. Keep individual responsibilities small.

---

**Cursor**

Here is the full component tree. 22 core components + 3 bonus = 25 total.

---

- **`<App>`** — owns: `currentView: 'list' | 'detail' | 'viewer'`, `selectedRecord`, `selectedFile` | props: none
  Routes between the records management UI and the PDF workspace; holds the top-level navigation state.

  - **`<RecordListView>`** — owns: nothing | props: `records`, `onSelectRecord`
    Renders the browsable list of all records as a grid of cards.

    - **`<RecordCard>`** — owns: nothing | props: `record`, `onSelect`
      Displays a single record's summary: title, date, and attachment count.

  - **`<RecordDetailView>`** — owns: nothing | props: `record`, `onOpenFile`, `onBack`
    Shows one record's metadata and its list of attached PDF files, plus a file picker for local uploads.

    - **`<FileCard>`** — owns: nothing | props: `file: { name, sizeBytes, url }`, `onOpen`
      Displays a single PDF attachment with filename, human-readable size, and an "Open" button.

    - **`<FilePickerButton>`** — owns: nothing | props: `onFileSelected: (file: File) => void`
      Renders a styled button that opens the browser's native file input for loading a local PDF.

  - **`<PdfWorkspace>`** — owns: `viewerState` (via `useReducer`+`ViewerContext`), `editorState` (via `useReducer`+`EditorContext`), `activeMode: 'viewer' | 'editor'`, `pdfEngine: PDFDocumentProxy`, `documentModel: PDFDocument` | props: `fileSource: string | File`
    Top-level PDF container. Initializes PDF.js and pdf-lib document instances, provides both contexts to all children, and switches between viewer and editor layouts.

    - **`<ViewerToolbar>`** — owns: nothing | reads: `ViewerContext` | props: `activeMode`, `onToggleMode`, `onPrint`
      Horizontal bar at the top of the workspace; composes the control clusters below and the mode/print actions.

      - **`<ZoomControls>`** — owns: nothing | reads+dispatches: `ViewerContext`
        Three buttons (zoom-in, zoom-out, fit-dropdown) that dispatch `SET_ZOOM` / `SET_FIT_MODE` actions to `ViewerContext`.

      - **`<PageNavigator>`** — owns: `inputValue: string` (local controlled input) | reads+dispatches: `ViewerContext`
        Shows "Page N of M" with an editable input and prev/next arrows; dispatches `GO_TO_PAGE`.

      - **`<ScrollModeSelector>`** — owns: nothing | reads+dispatches: `ViewerContext`
        Three-way toggle (continuous / single-page / two-page spread) that dispatches `SET_SCROLL_MODE`.

    - **`<ThumbnailSidebar>`** — owns: `thumbnailRefs: Map<number, HTMLCanvasElement>` | reads: `ViewerContext` (pageCount, currentPage)
      Collapsible left sidebar listing thumbnail previews of every page; clicking a thumbnail navigates.

      - **`<ThumbnailPage>`** — owns: `canvasRef` | props: `pageNumber`, `isActive`, `onClick`, `pdfEngine`
        Renders a single low-resolution thumbnail by calling `pdfEngine.getPage(n).render()` into a small canvas.

    - **`<PageViewport>`** — owns: `scrollContainerRef`, `visiblePages: Set<number>` (via IntersectionObserver) | reads: `ViewerContext` (scrollMode, zoom, fitMode)
      The main scrollable area. In continuous mode, renders all `<PageCanvas>` components in a column. In single-page mode, renders one. In spread mode, renders pairs. Dispatches `SET_CURRENT_PAGE` as the user scrolls.

      - **`<PageCanvas>`** — owns: `canvasRef`, `textLayerRef`, `renderTaskRef` | props: `pageNumber`, `scale`, `rotation`; reads: `ViewerContext` (via context for pdfEngine)
        Renders one PDF page: a `<canvas>` for the painted content and an absolutely-positioned `<div>` for the selectable text layer. Cancels and re-renders when scale/rotation/page changes.

    - **`<EditorPanel>`** — owns: nothing | reads: `EditorContext` | visible only when `activeMode === 'editor'`
      Replaces the `PageViewport` in editor mode; contains the editor toolbar and the draggable page grid.

      - **`<EditorToolbar>`** — owns: nothing | reads+dispatches: `EditorContext`
        Action bar with buttons for Rotate CW, Rotate CCW, Delete Page, Import, Extract, and Export; each dispatches to `EditorContext` or opens a dialog.

      - **`<PageGrid>`** — owns: `dragState: { sourceIndex, overIndex } | null` | reads: `EditorContext` (pageList)
        Displays all pages as a reorderable grid; handles drag-and-drop via pointer events and dispatches `REORDER_PAGES` on drop.

        - **`<DraggablePageCard>`** — owns: nothing | props: `page: PageDescriptor`, `index`, `isSelected`, `onSelect`, `onDragStart`, `onDragOver`, `onDrop`
          A single card in the editor grid showing a thumbnail, page number, rotation badge, and selection checkbox.

      - **`<ImportDialog>`** — owns: `importedDoc: PDFDocument | null`, `selectedPages: Set<number>` | props: `isOpen`, `onClose`, `onImport: (pages: number[]) => void`
        Modal dialog: user picks a second PDF via file input, sees its page thumbnails, selects which pages to merge, and confirms.

    - **`<PrintButton>`** — owns: nothing | props: `pdfEngine`
      Triggers printing by rendering all pages into a hidden iframe and calling `iframe.contentWindow.print()`.

    - **`<SaveButton>`** — owns: `isSaving: boolean` | reads: `EditorContext` (documentModel)
      Serializes the current `documentModel` to bytes via `pdfDocument.save()` and triggers a browser download.

    - **`<BookmarkPanel>`** **[bonus]** — owns: `bookmarkTree` | reads: `ViewerContext`
      Collapsible right sidebar that parses the PDF outline and renders it as a navigable tree; supports add/edit/delete and persists via mupdf-wasm.

    - **`<AnnotationToolbar>`** **[bonus]** — owns: `activeTool: 'text' | 'redactRect' | 'redactHighlight' | 'signature' | null` | reads: `ViewerContext`
      Floating secondary toolbar that lets the user pick an annotation tool; selection state is consumed by PageCanvas to attach pointer event handlers.

    - **`<RedactionOverlay>`** **[bonus]** — owns: `rects: Rect[]` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles or highlight text selections.

---

**Total: 22 core + 3 bonus = 25 components.**

**Context provider boundaries:**
- `ViewerContext` is provided by `<PdfWorkspace>` and consumed by everything inside it that reads/dispatches viewer state (zoom, page, scroll mode).
- `EditorContext` is provided by `<PdfWorkspace>` and consumed only by `<EditorPanel>` and its children plus `<SaveButton>`.
- No context crosses the `<App>` boundary — the records management views are pure props-down.

---

**User**

Define the complete application state. I want a TypeScript interface called AppState with every field listed and typed precisely. Then list every action type for the reducer that mutates it.
Constraints:

Use useReducer + Context. No external state library.
State must cover: the current engine instance, the current document model instance, filename, page count, current page (1-indexed), zoom level, fit mode (none/width/page), view mode (continuous/spread), editor mode flag, the set of selected pages in the editor, undo/redo history, loading progress, error state.
Bonus state: annotation tool selection, redaction overlays per page, user-added bookmarks.
Mark bonus fields with a comment.

Output two TypeScript code blocks:

The full AppState interface
The full AppAction discriminated union

For each action, also note in a comment which component dispatches it.

---

**Cursor**

Here are the two code blocks.

**Block 1 — State**

```typescript
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFDocument } from 'pdf-lib';

// ────────────────────────────────────────────
// Supporting types
// ────────────────────────────────────────────

export interface PageDescriptor {
  id: string;                          // stable UUID for React keys + drag tracking
  sourceIndex: number;                 // 0-indexed page in the current PDFDocument/PDFDocumentProxy
  rotation: 0 | 90 | 180 | 270;       // cumulative rotation applied in editor
}

export type FitMode    = 'none' | 'width' | 'page';
export type ScrollMode = 'continuous' | 'single' | 'spread';

// [bonus]
export type AnnotationTool = 'text' | 'redact-rect' | 'redact-highlight' | 'signature' | null;

// [bonus]
export interface RedactionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// [bonus]
export interface Bookmark {
  id: string;
  title: string;
  pageIndex: number;      // 0-indexed target page
  children: Bookmark[];
}

// ────────────────────────────────────────────
// Application state
// ────────────────────────────────────────────

export interface AppState {
  // ── Document instances ──
  pdfEngine: PDFDocumentProxy | null;       // PDF.js parsed document (rendering)
  documentModel: PDFDocument | null;        // pdf-lib parsed document (editing/export)
  filename: string | null;                  // display name of the open file

  // ── Viewer ──
  pageCount: number;                        // total pages in the loaded document
  currentPage: number;                      // 1-indexed visible page
  zoomLevel: number;                        // scale factor: 1.0 = 100%. authoritative when fitMode is 'none'
  fitMode: FitMode;                         // 'none': manual zoom; 'width'/'page': computed by PageViewport
  scrollMode: ScrollMode;                   // layout strategy for PageViewport

  // ── Editor ──
  isEditorMode: boolean;                    // true = show EditorPanel, false = show PageViewport
  pages: PageDescriptor[];                  // ordered page list; source of truth for page order/rotation
  selectedPages: Set<number>;               // indices into pages[] currently selected in editor
  undoStack: ReadonlyArray<PageDescriptor[]>; // previous page-list snapshots (most recent last)
  redoStack: ReadonlyArray<PageDescriptor[]>; // undone snapshots available for redo

  // ── Loading / Error ──
  isLoading: boolean;                       // true while PDF bytes are being fetched/parsed
  loadingProgress: number;                  // 0..1 fraction; updated by PDF.js onProgress callback
  error: string | null;                     // non-null = display error banner

  // ── [bonus] Annotations ──
  activeAnnotationTool: AnnotationTool;              // currently selected annotation tool
  redactionOverlays: Map<number, RedactionRect[]>;   // page number (1-indexed) → rects drawn on that page
  bookmarks: Bookmark[];                             // user-created bookmark tree
}

// ────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────

export const initialState: AppState = {
  pdfEngine: null,
  documentModel: null,
  filename: null,

  pageCount: 0,
  currentPage: 1,
  zoomLevel: 1.0,
  fitMode: 'width',
  scrollMode: 'continuous',

  isEditorMode: false,
  pages: [],
  selectedPages: new Set(),
  undoStack: [],
  redoStack: [],

  isLoading: false,
  loadingProgress: 0,
  error: null,

  activeAnnotationTool: null,
  redactionOverlays: new Map(),
  bookmarks: [],
};
```

**Block 2 — Actions**

```typescript
export type AppAction =
  // ═══════════════════════════════════════════
  // Document lifecycle — dispatched by <PdfWorkspace>
  // ═══════════════════════════════════════════

  // Sets filename, isLoading: true, loadingProgress: 0, clears error
  | { type: 'DOCUMENT_LOAD_START'; filename: string }

  // Updates loadingProgress (0..1) during fetch
  | { type: 'DOCUMENT_LOAD_PROGRESS'; progress: number }

  // Stores engine + model, initialises pages[], sets pageCount, clears loading/error,
  // resets undoStack/redoStack/selectedPages
  | {
      type: 'DOCUMENT_LOADED';
      engine: PDFDocumentProxy;
      model: PDFDocument;
      pageCount: number;
      pages: PageDescriptor[];
    }

  // Sets error, clears isLoading
  | { type: 'DOCUMENT_LOAD_ERROR'; error: string }

  // Resets entire state to initialState (calls engine.destroy() as a side-effect before dispatch)
  | { type: 'DOCUMENT_CLOSED' }                              // dispatched by ViewerToolbar / App

  // ═══════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════

  // Clamps to [1, pageCount]. Dispatched by scroll observer AND by explicit nav.
  | { type: 'SET_CURRENT_PAGE'; page: number }                // PageViewport, PageNavigator, ThumbnailPage

  // ═══════════════════════════════════════════
  // Zoom
  // ═══════════════════════════════════════════

  // Steps zoomLevel to the next preset above current (presets: 0.25…5.0). Sets fitMode → 'none'.
  | { type: 'ZOOM_IN' }                                       // ZoomControls

  // Steps zoomLevel to the next preset below current. Sets fitMode → 'none'.
  | { type: 'ZOOM_OUT' }                                      // ZoomControls

  // Sets zoomLevel to an explicit value. Sets fitMode → 'none'.
  | { type: 'SET_ZOOM'; level: number }                       // ZoomControls (preset dropdown)

  // Sets fitMode. Does NOT change zoomLevel — PageViewport computes effective scale on render.
  | { type: 'SET_FIT_MODE'; mode: FitMode }                   // ZoomControls (fit buttons)

  // ═══════════════════════════════════════════
  // Scroll / view mode
  // ═══════════════════════════════════════════

  | { type: 'SET_SCROLL_MODE'; mode: ScrollMode }             // ScrollModeSelector

  // ═══════════════════════════════════════════
  // Editor mode toggle
  // ═══════════════════════════════════════════

  // Switches to editor layout. Clears selectedPages.
  | { type: 'ENTER_EDITOR' }                                  // ViewerToolbar (mode toggle)

  // Switches to viewer layout. Clears selectedPages. Resets currentPage to 1 if pages changed.
  | { type: 'EXIT_EDITOR' }                                   // ViewerToolbar (mode toggle)

  // ═══════════════════════════════════════════
  // Page selection (editor) — none of these touch undoStack
  // ═══════════════════════════════════════════

  // Adds or removes a single index from selectedPages.
  | { type: 'TOGGLE_PAGE_SELECTION'; index: number }          // DraggablePageCard

  // Replaces selectedPages entirely (used for shift-click range select).
  | { type: 'SET_SELECTED_PAGES'; indices: Set<number> }      // PageGrid

  // Selects all indices 0..pages.length-1.
  | { type: 'SELECT_ALL_PAGES' }                              // EditorToolbar

  // Empties selectedPages.
  | { type: 'CLEAR_SELECTION' }                               // EditorToolbar

  // ═══════════════════════════════════════════
  // Page manipulation (editor) — all push to undoStack, clear redoStack
  // ═══════════════════════════════════════════

  // Adds delta to rotation of each page at indices[], wrapping mod 360.
  | { type: 'ROTATE_PAGES'; indices: number[]; delta: 90 | -90 }       // EditorToolbar

  // Removes page at fromIndex, inserts it at toIndex. Clears selectedPages.
  | { type: 'REORDER_PAGE'; fromIndex: number; toIndex: number }        // PageGrid (on drop)

  // Removes pages at indices[]. Clears selectedPages. Updates pageCount.
  | { type: 'DELETE_PAGES'; indices: number[] }                          // EditorToolbar

  // Inserts newPages into pages[] at atIndex. Updates pageCount.
  // Side-effect before dispatch: caller copies pages into documentModel via pdf-lib,
  // then reloads pdfEngine; a follow-up DOCUMENT_LOADED may be dispatched to refresh engine.
  | { type: 'IMPORT_PAGES'; newPages: PageDescriptor[]; atIndex: number } // ImportDialog

  // ═══════════════════════════════════════════
  // Undo / Redo
  // ═══════════════════════════════════════════

  // Pops undoStack → pages, pushes current pages → redoStack. No-op if undoStack is empty.
  | { type: 'UNDO' }                                          // EditorToolbar

  // Pops redoStack → pages, pushes current pages → undoStack. No-op if redoStack is empty.
  | { type: 'REDO' }                                          // EditorToolbar

  // ═══════════════════════════════════════════
  // [bonus] Annotations
  // ═══════════════════════════════════════════

  | { type: 'SET_ANNOTATION_TOOL'; tool: AnnotationTool }     // AnnotationToolbar

  | { type: 'ADD_REDACTION'; pageNumber: number; rect: RedactionRect }    // RedactionOverlay
  | { type: 'REMOVE_REDACTION'; pageNumber: number; rectIndex: number }   // RedactionOverlay

  | { type: 'ADD_BOOKMARK'; bookmark: Bookmark }                          // BookmarkPanel
  | { type: 'UPDATE_BOOKMARK'; id: string; updates: Partial<Pick<Bookmark, 'title' | 'pageIndex'>> }
                                                                          // BookmarkPanel
  | { type: 'REMOVE_BOOKMARK'; id: string };                              // BookmarkPanel
```

---

**Key design notes on non-obvious choices:**

- **`zoomLevel` vs `fitMode` duality**: When `fitMode` is `'width'` or `'page'`, `zoomLevel` is *not* the effective rendering scale — `PageViewport` computes the effective scale on every render from viewport dimensions and page dimensions. `zoomLevel` only becomes authoritative when `fitMode === 'none'`. Any manual zoom action (`ZOOM_IN`, `ZOOM_OUT`, `SET_ZOOM`) resets `fitMode` to `'none'`, making the user's explicit choice stick.

- **Undo/redo stores full snapshots of `pages[]`**, not inverse operations. For a typical PDF (< 1000 pages), each snapshot is an array of ~40-byte objects — negligible memory. This avoids the complexity of computing and applying inverse diffs for rotation, reorder, delete, and import.

- **`pdfEngine` and `documentModel` are object references in state, not serializable data.** The reducer stores them but never deep-clones them. Mutations happen in side-effect code (event handlers); the reducer only swaps references on `DOCUMENT_LOADED` / `DOCUMENT_CLOSED`.

- **`selectedPages` is `Set<number>`** — indices into `pages[]`, not page IDs. This means selection must be cleared or remapped after any operation that changes array indices (reorder, delete, import). The reducer handles this: `DELETE_PAGES` and `REORDER_PAGE` both reset `selectedPages` to `new Set()`.

- **23 core actions + 6 bonus = 29 total.** Every state transition is explicit and traceable to a single dispatching component.

---

**User**

Now design the rendering engine abstraction. Output a TypeScript interface called PdfEngine that both adapters (PDF.js and mupdf-wasm) will implement.
Requirements for the interface:

Async loading from either ArrayBuffer or URL string.
Progress callback during load (for the linearized loading bar).
Synchronous page count and page dimensions (so the virtualized scroller can compute layout without awaiting every page).
Async page rendering into a caller-supplied canvas, with abort support.
Async outline (bookmark tree) retrieval.
Method to retrieve the original document bytes (for the edit pipeline).
Cleanup method.

Also define supporting types: PageDimensions, OutlineNode, LoadProgress, RenderOptions, and an error class PdfEngineError with discriminated error codes.
Output as one TypeScript code block. Add JSDoc comments on every method explaining what it does, what it throws, and which engines support which features (some features will be MuPDF-only).

---

**Cursor**

```typescript
// ────────────────────────────────────────────
// Supporting types
// ────────────────────────────────────────────

/** Unscaled (CSS-point) dimensions of a single PDF page, as declared in the page's MediaBox. */
export interface PageDimensions {
  /** Width in PDF points (1 point = 1/72 inch). */
  readonly widthPt: number;
  /** Height in PDF points. */
  readonly heightPt: number;
  /** Inherent page rotation declared in the PDF (0, 90, 180, 270). */
  readonly rotation: 0 | 90 | 180 | 270;
}

/** A single node in the PDF outline (bookmark) tree. */
export interface OutlineNode {
  /** Display title of the bookmark. */
  readonly title: string;
  /** 0-indexed destination page, or null if the bookmark is a named action / external link. */
  readonly pageIndex: number | null;
  /** Child bookmarks. Empty array if leaf node. */
  readonly children: ReadonlyArray<OutlineNode>;
}

/** Progress report emitted during document loading. */
export interface LoadProgress {
  /** Bytes received so far. */
  readonly loaded: number;
  /** Total bytes if known (Content-Length header present), otherwise undefined. */
  readonly total: number | undefined;
  /** Fraction 0..1 if total is known, otherwise undefined. */
  readonly fraction: number | undefined;
}

/** Options passed to renderPage(). */
export interface RenderOptions {
  /** 0-indexed page number. */
  readonly pageIndex: number;
  /** Device-pixel scale factor (e.g. 2.0 for Retina). Applied on top of `scale`. */
  readonly devicePixelRatio: number;
  /** Viewport scale factor (1.0 = 100%). */
  readonly scale: number;
  /**
   * Additional rotation to apply on top of the page's inherent rotation.
   * Additive with PageDimensions.rotation: effective = (inherent + this) % 360.
   */
  readonly rotation: 0 | 90 | 180 | 270;
  /** Target canvas. The engine sizes and paints into this canvas. Caller must not reuse it until the returned promise settles. */
  readonly canvas: HTMLCanvasElement;
  /** AbortSignal — when aborted, the engine cancels any in-flight render and the promise rejects with PdfEngineError('RENDER_CANCELLED'). */
  readonly signal?: AbortSignal;
}

// ────────────────────────────────────────────
// Error type
// ────────────────────────────────────────────

/**
 * Discriminated error codes for PdfEngine operations.
 *
 * - LOAD_FAILED:       the document could not be parsed (corrupt / not a PDF)
 * - PASSWORD_REQUIRED: the document is encrypted and no password was supplied
 * - PAGE_NOT_FOUND:    pageIndex is out of range [0, pageCount)
 * - RENDER_CANCELLED:  the render was aborted via AbortSignal
 * - NETWORK_ERROR:     fetch/range-request failure during URL loading
 * - ENGINE_DESTROYED:  method called after destroy()
 * - UNSUPPORTED:       feature not available in this engine adapter
 */
export type PdfEngineErrorCode =
  | 'LOAD_FAILED'
  | 'PASSWORD_REQUIRED'
  | 'PAGE_NOT_FOUND'
  | 'RENDER_CANCELLED'
  | 'NETWORK_ERROR'
  | 'ENGINE_DESTROYED'
  | 'UNSUPPORTED';

export class PdfEngineError extends Error {
  readonly code: PdfEngineErrorCode;

  constructor(code: PdfEngineErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'PdfEngineError';
    this.code = code;
  }
}

// ────────────────────────────────────────────
// Engine interface
// ────────────────────────────────────────────

export interface PdfEngine {
  // ── Identity ──

  /**
   * Human-readable engine name for diagnostics and UI display.
   * @example "pdfjs" | "mupdf-wasm"
   */
  readonly name: string;

  // ── Loading ──

  /**
   * Load a PDF document from raw bytes.
   *
   * After the returned promise resolves, `pageCount` and `getPageDimensions`
   * are available synchronously.
   *
   * @param data - Complete PDF file as an ArrayBuffer.
   * @param onProgress - Optional progress callback. For ArrayBuffer loads this
   *   fires once with loaded === total === data.byteLength.
   *
   * @throws {PdfEngineError} code 'LOAD_FAILED' if the buffer is not a valid PDF.
   * @throws {PdfEngineError} code 'PASSWORD_REQUIRED' if the PDF is encrypted.
   *
   * Supported: PDF.js, MuPDF.
   */
  loadFromBuffer(data: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void>;

  /**
   * Load a PDF document from a URL.
   *
   * Uses HTTP Range requests when the server supports them, enabling
   * linearized (progressive) rendering: the first page can be painted
   * before the full file has arrived.
   *
   * After the returned promise resolves the first page is guaranteed renderable.
   * Remaining pages stream in the background; `pageCount` and
   * `getPageDimensions` return best-known values that may update as data arrives.
   *
   * @param url - Absolute or relative URL to a PDF resource.
   * @param onProgress - Fires repeatedly as chunks arrive.
   *
   * @throws {PdfEngineError} code 'NETWORK_ERROR' on fetch failure.
   * @throws {PdfEngineError} code 'LOAD_FAILED' if the response is not a valid PDF.
   * @throws {PdfEngineError} code 'PASSWORD_REQUIRED' if the PDF is encrypted.
   *
   * Supported: PDF.js (full linearization), MuPDF (loads entire blob first — no progressive rendering).
   */
  loadFromUrl(url: string, onProgress?: (p: LoadProgress) => void): Promise<void>;

  // ── Synchronous accessors (available after load resolves) ──

  /**
   * Total number of pages in the document.
   *
   * Available synchronously after `loadFromBuffer` / `loadFromUrl` resolves.
   * For linearized loads via `loadFromUrl`, this returns the value declared in
   * the linearization dictionary; it is stable and does not change as pages stream in.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  readonly pageCount: number;

  /**
   * Returns the unscaled dimensions of the given page.
   *
   * Synchronous — dimensions are parsed from the page tree during load,
   * not during rendering. This lets the virtualised scroller compute layout
   * for all pages without awaiting individual page fetches.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getPageDimensions(pageIndex: number): PageDimensions;

  // ── Rendering ──

  /**
   * Render a single page into the supplied canvas.
   *
   * The engine sizes the canvas (`width`/`height` attributes and CSS dimensions)
   * to match the page at the requested scale and rotation, then paints the
   * rasterised content. The caller must not draw into or resize the canvas
   * until the returned promise settles.
   *
   * Abort support: pass `options.signal` from an `AbortController`. On abort
   * the engine cancels any in-flight rasterisation work and the promise rejects
   * with `PdfEngineError('RENDER_CANCELLED')`. The canvas contents are undefined
   * after cancellation.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'RENDER_CANCELLED' if signal is aborted.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  renderPage(options: RenderOptions): Promise<void>;

  // ── Text layer ──

  /**
   * Returns the text content of a page as an array of positioned items.
   *
   * Each item contains the string, its transform matrix, and bounding box
   * in PDF-point coordinates. Used by PageCanvas to build the selectable
   * text overlay div.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (native), MuPDF (via mupdf structured-text API).
   */
  getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>>;

  // ── Outline ──

  /**
   * Returns the document's outline (bookmark tree).
   *
   * Returns an empty array if the PDF has no outline dictionary.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (read-only), MuPDF (read/write — write via separate mupdf-specific API).
   */
  getOutline(): Promise<ReadonlyArray<OutlineNode>>;

  // ── Raw bytes ──

  /**
   * Returns the original (unmodified) PDF bytes that were loaded.
   *
   * Used to initialise the pdf-lib DocumentModel for the editing pipeline.
   * Returns a fresh copy; mutations to the returned buffer do not affect
   * the engine's internal state.
   *
   * For URL loads the full document must have finished downloading before
   * this method is called; it blocks until all data is available.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getDocumentBytes(): Promise<Uint8Array>;

  // ── Lifecycle ──

  /**
   * Releases all resources held by the engine: WASM memory, canvas contexts,
   * Web Workers, cached page data, and network connections.
   *
   * After calling destroy(), every other method throws
   * `PdfEngineError('ENGINE_DESTROYED')`. Calling destroy() more than once
   * is a safe no-op.
   *
   * Supported: PDF.js (terminates worker), MuPDF (frees WASM heap).
   */
  destroy(): void;
}

// ────────────────────────────────────────────
// Text content types (used by getTextContent)
// ────────────────────────────────────────────

/** A single text span positioned on a page. */
export interface TextItem {
  /** The unicode string content. */
  readonly str: string;
  /** Bounding box in PDF-point coordinates, origin at bottom-left of the page. */
  readonly rect: Readonly<{ x: number; y: number; width: number; height: number }>;
  /** 6-element transform matrix [a, b, c, d, tx, ty] mapping from glyph space to page space. */
  readonly transform: readonly [number, number, number, number, number, number];
  /** Font name as declared in the PDF (e.g. "Helvetica", "TimesNewRoman"). */
  readonly fontName: string;
}
```

---

**Design rationale for the non-obvious parts:**

- **Synchronous `pageCount` and `getPageDimensions`**: The virtualized scroller needs to compute total scroll height and each page's position *before* any page is rendered. Making these synchronous (populated during load) avoids a waterfall of `await getPageDimensions(i)` calls. PDF.js already exposes `pdfDocument.numPages` synchronously, and page dimensions can be prefetched from the page tree in a single pass after load.

- **`renderPage` takes a caller-owned canvas**: This lets `PageCanvas` own its `<canvas>` element and pass it down, avoiding the engine creating DOM nodes (which would break React's ownership model). The engine writes pixels; React manages the DOM.

- **`AbortSignal` for render cancellation**: When the user scrolls rapidly through a 500-page document, dozens of render calls fire. Without cancellation, stale renders queue up and burn CPU. `AbortSignal` lets `PageViewport` cancel off-screen renders instantly. PDF.js's `RenderTask.cancel()` maps directly to this; MuPDF's synchronous rendering would check `signal.aborted` before starting.

- **`getDocumentBytes` is async**: For URL loads with linearization, the full file may not be in memory when the user opens the editor. This method waits for the background download to complete, then returns a copy. The edit pipeline calls it exactly once when `ENTER_EDITOR` is dispatched.

- **`getTextContent` returns `TextItem[]`**: This is a simplified projection of PDF.js's `TextContent.items`. The interface normalizes the format so the MuPDF adapter can produce the same shape from its structured-text API, and `PageCanvas` builds the selectable text overlay without knowing which engine is active.

- **No `renderToImage` / `renderToBlob`**: Thumbnails use the same `renderPage` with a lower `scale` (e.g., 0.2) and a small offscreen canvas. No separate API needed.

---

**User**

Now design the editing layer. This is a class called DocumentModel that wraps pdf-lib and is the only place edit operations happen. Render is the engine's job; edit is the model's job.
Output the full TypeScript class signature (no implementation bodies, just signatures with JSDoc). Methods:

Static factory fromBytes(bytes: Uint8Array): Promise<DocumentModel>
pageCount(): number
rotatePages(pageNumbers: number[], deltaDegrees: 90 | -90 | 180): Promise<void>
deletePages(pageNumbers: number[]): Promise<void>
reorderPages(fromIndex: number, toIndex: number): Promise<void>
extractPages(pageNumbers: number[]): Promise<DocumentModel> — returns a new model containing just those pages
mergePdf(otherBytes: Uint8Array, atPageIndex: number): Promise<void> — inserts another PDF's pages at the given index
save(): Promise<Uint8Array> — serializes back to PDF bytes

For each method, document:

What pdf-lib API it uses
Edge cases (empty arrays, out-of-range indices, duplicate page numbers, attempting to delete all pages)
Whether it mutates this or returns a new instance

Page numbers in the public API are 1-indexed throughout. pdf-lib uses 0-indexed internally — note this in a class-level comment.

---

**Cursor**

```typescript
import { PDFDocument, degrees } from 'pdf-lib';

/**
 * DocumentModel — the single mutation point for PDF editing operations.
 *
 * Wraps a `pdf-lib` `PDFDocument` instance and exposes every edit operation
 * the editor panel needs: rotation, deletion, reordering, extraction, merge,
 * and serialisation.
 *
 * ## Indexing convention
 *
 * The **public API** uses **1-indexed** page numbers to match the user-facing
 * page numbering in the UI (page 1 is the first page). Internally, `pdf-lib`
 * uses **0-indexed** page indices. This class handles the conversion; callers
 * never need to subtract 1.
 *
 * ## Mutation model
 *
 * Every method (except `extractPages`) **mutates `this`** — there is no
 * copy-on-write. The caller is responsible for snapshotting `pages` into the
 * `undoStack` *before* dispatching a mutation action so that `UNDO` can
 * restore the previous state.
 *
 * `extractPages` is the one exception: it returns a **new** `DocumentModel`
 * containing only the requested pages, leaving `this` unchanged.
 *
 * ## Thread safety
 *
 * `pdf-lib` is synchronous under the hood (all operations happen on an
 * in-memory object graph). Methods are declared `async` to keep a uniform
 * API surface and to allow future engines (e.g. mupdf-wasm) to drop in
 * without changing call sites.
 */
export class DocumentModel {
  /** The underlying pdf-lib document. Access sparingly — prefer class methods. */
  private pdfDoc: PDFDocument;

  private constructor(pdfDoc: PDFDocument);

  // ──────────────────────────────────────────
  // Factory
  // ──────────────────────────────────────────

  /**
   * Create a `DocumentModel` from raw PDF bytes.
   *
   * ### pdf-lib API used
   * - `PDFDocument.load(bytes, { ignoreEncryption: true })`
   *
   * ### Edge cases
   * - Throws `Error` if `bytes` is empty or not a valid PDF.
   * - Encrypted PDFs are loaded in read-only-structure mode
   *   (`ignoreEncryption: true`); editing encrypted content is
   *   best-effort and not guaranteed.
   *
   * ### Mutation
   * Returns a **new** `DocumentModel` instance.
   *
   * @param bytes - Complete PDF file bytes.
   */
  static fromBytes(bytes: Uint8Array): Promise<DocumentModel>;

  // ──────────────────────────────────────────
  // Accessors
  // ──────────────────────────────────────────

  /**
   * Returns the current number of pages in the document.
   *
   * ### pdf-lib API used
   * - `pdfDoc.getPageCount()`
   *
   * Synchronous. O(1).
   */
  pageCount(): number;

  // ──────────────────────────────────────────
  // Rotation
  // ──────────────────────────────────────────

  /**
   * Rotate one or more pages by a relative angle.
   *
   * The rotation is **additive**: if a page is already rotated 90° and
   * `deltaDegrees` is 90, the resulting rotation is 180°.
   *
   * ### pdf-lib API used
   * - `pdfDoc.getPage(index)` to retrieve each page.
   * - `page.getRotation()` to read the current angle.
   * - `page.setRotation(degrees(newAngle))` to write the updated angle.
   *
   * ### Edge cases
   * - **Empty array**: No-op, returns immediately.
   * - **Duplicate page numbers**: Duplicates are deduplicated; each unique
   *   page is rotated exactly once.
   * - **Out-of-range page number** (< 1 or > pageCount): Throws `RangeError`
   *   before any mutation occurs (all-or-nothing).
   *
   * ### Mutation
   * Mutates `this`. Does not return a new instance.
   *
   * @param pageNumbers - 1-indexed page numbers to rotate.
   * @param deltaDegrees - Rotation increment: 90 (clockwise), -90 (counter-clockwise), or 180.
   */
  rotatePages(pageNumbers: number[], deltaDegrees: 90 | -90 | 180): Promise<void>;

  // ──────────────────────────────────────────
  // Deletion
  // ──────────────────────────────────────────

  /**
   * Remove one or more pages from the document.
   *
   * Pages are removed in descending index order internally so that earlier
   * indices remain stable during the loop.
   *
   * ### pdf-lib API used
   * - `pdfDoc.removePage(index)` for each page, called from highest index to lowest.
   *
   * ### Edge cases
   * - **Empty array**: No-op.
   * - **Duplicate page numbers**: Deduplicated.
   * - **Out-of-range page number**: Throws `RangeError` before any mutation.
   * - **Deleting all pages**: Throws `Error('Cannot delete all pages — document
   *   must retain at least one page')` before any mutation. pdf-lib does not
   *   enforce this but a zero-page PDF is invalid per the spec.
   *
   * ### Mutation
   * Mutates `this`.
   *
   * @param pageNumbers - 1-indexed page numbers to remove.
   */
  deletePages(pageNumbers: number[]): Promise<void>;

  // ──────────────────────────────────────────
  // Reordering
  // ──────────────────────────────────────────

  /**
   * Move a single page from one position to another.
   *
   * Semantics match `Array.splice`: the page at `fromIndex` is removed, then
   * inserted at `toIndex` (post-removal numbering). Both indices are 1-indexed.
   *
   * ### pdf-lib API used
   * - `pdfDoc.removePage(from0)` to detach the page.
   * - `pdfDoc.insertPage(to0, page)` to reinsert it at the target position.
   *
   * Note: `removePage` returns `void` in pdf-lib, so we must call
   * `pdfDoc.getPage(from0)` and cache the `PDFPage` reference *before*
   * removing it, then pass that reference to `insertPage`.
   *
   * ### Edge cases
   * - **fromIndex === toIndex**: No-op.
   * - **Either index out of range** (< 1 or > pageCount): Throws `RangeError`.
   *
   * ### Mutation
   * Mutates `this`.
   *
   * @param fromIndex - 1-indexed current position of the page.
   * @param toIndex - 1-indexed desired position after removal.
   */
  reorderPages(fromIndex: number, toIndex: number): Promise<void>;

  // ──────────────────────────────────────────
  // Extraction
  // ──────────────────────────────────────────

  /**
   * Extract a subset of pages into a **new** `DocumentModel`.
   *
   * The original document is **not modified**. The returned model is an
   * independent copy that can be saved separately (e.g. "Extract 3 pages
   * as new PDF").
   *
   * Page order in the new document matches the order of `pageNumbers` as
   * provided by the caller, allowing reordering during extraction.
   *
   * ### pdf-lib API used
   * - `PDFDocument.create()` to create a blank target document.
   * - `targetDoc.copyPages(this.pdfDoc, indices)` to deep-copy pages
   *   (including fonts, images, and other shared resources).
   * - `targetDoc.addPage(copiedPage)` for each copied page, in order.
   *
   * ### Edge cases
   * - **Empty array**: Throws `Error('Must extract at least one page')`.
   *   A zero-page PDF is invalid.
   * - **Duplicate page numbers**: Allowed — the same page appears multiple
   *   times in the output (intentional; enables "duplicate page" workflow).
   * - **Out-of-range page number**: Throws `RangeError` before any work.
   *
   * ### Mutation
   * Returns a **new** `DocumentModel`. Does **not** mutate `this`.
   *
   * @param pageNumbers - 1-indexed page numbers to include, in desired output order.
   */
  extractPages(pageNumbers: number[]): Promise<DocumentModel>;

  // ──────────────────────────────────────────
  // Merge / Import
  // ──────────────────────────────────────────

  /**
   * Insert all pages of another PDF into this document at a given position.
   *
   * The imported pages are deep-copied (fonts, images, resources are
   * embedded), so the source bytes can be discarded after this call.
   *
   * ### pdf-lib API used
   * - `PDFDocument.load(otherBytes)` to parse the source document.
   * - `this.pdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())` to
   *   deep-copy every page.
   * - `this.pdfDoc.insertPage(index, copiedPage)` for each copied page,
   *   inserted sequentially starting at `atPageIndex`.
   *
   * ### Edge cases
   * - **atPageIndex < 1**: Throws `RangeError`.
   * - **atPageIndex > pageCount + 1**: Throws `RangeError`. The maximum
   *   valid value is `pageCount() + 1` (append at end).
   * - **otherBytes is not a valid PDF**: Throws `Error` from `PDFDocument.load`.
   * - **otherBytes is an empty/zero-page PDF**: No-op (nothing to insert).
   *
   * ### Mutation
   * Mutates `this`. The page count increases by the source document's page count.
   *
   * @param otherBytes - Raw bytes of the PDF to import.
   * @param atPageIndex - 1-indexed insertion point. Pages currently at this
   *   index and beyond shift right. Use `pageCount() + 1` to append.
   */
  mergePdf(otherBytes: Uint8Array, atPageIndex: number): Promise<void>;

  // ──────────────────────────────────────────
  // Serialisation
  // ──────────────────────────────────────────

  /**
   * Serialise the current document state to PDF bytes.
   *
   * The returned `Uint8Array` is a complete, valid PDF file that can be
   * saved to disk or loaded into a `PdfEngine` for re-rendering.
   *
   * ### pdf-lib API used
   * - `pdfDoc.save()` — returns `Promise<Uint8Array>`.
   *
   * ### Edge cases
   * - If the document was loaded with `ignoreEncryption: true` and contains
   *   encrypted streams that pdf-lib cannot re-encode, `save()` may produce
   *   a partially readable PDF. This is a known pdf-lib limitation.
   *
   * ### Mutation
   * Does **not** mutate `this`. The internal state is unchanged after save;
   * further edits and additional saves are allowed.
   *
   * @returns Fresh PDF bytes.
   */
  save(): Promise<Uint8Array>;
}
```

---

**Why every method is `async`** even though pdf-lib is synchronous: it keeps the public contract future-proof for a MuPDF-WASM editing adapter (where operations post messages to a Worker and actually are async). Call sites always `await`, so swapping the backing implementation requires zero refactoring.

**Why `extractPages` is the only non-mutating method**: every other operation corresponds to a user action in the editor panel that modifies the current document in place (matching the user's mental model of "I'm editing this PDF"). Extraction is semantically different — the user explicitly wants a *second* file, so a new instance is the correct return type.

**Why validation is all-or-nothing**: every method validates *all* inputs before touching any state. If page numbers `[2, 5, 999]` are passed to `rotatePages` and `999` is out of range, the method throws without rotating pages 2 and 5. This avoids partial mutations that would be impossible to undo cleanly.

---

**User**

Now produce the build order. I want a numbered list of phases — each phase is a chunk of work small enough to complete in one Cursor Composer session (roughly 30–60 minutes of focused work).
Constraints:

Phase 1 is the project scaffold (Vite + React + TS + folder structure).
The PdfEngine interface comes before the PDF.js adapter, which comes before any rendering UI.
The DocumentModel class is built and unit-tested before any editor UI is wired to it.
Linearized loading is its own phase, after basic single-page rendering works.
WASM tier (mupdf adapter, annotations, bookmarks) comes after the core MVP is complete and tested.
Architecture doc and Cursor log are the final phases.

For each phase, output:
## Phase N: <name>
Goal: <one sentence>
Depends on: <list of earlier phases>
Files created/modified: <bullet list>
Acceptance: <what works at the end of this phase>
Aim for 18–22 phases. Don't merge unrelated work into a single phase.

---

**Cursor**

## Phase 1: Project Scaffold
**Goal:** Bootstrap the Vite + React + TypeScript project with folder structure, dev tooling, and sample PDFs.
**Depends on:** nothing
**Files created/modified:**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- `eslint.config.js`, `.prettierrc`
- `src/main.tsx`, `src/App.tsx`, `src/App.module.css`
- `src/types/` (empty barrel `index.ts`)
- `src/engine/`, `src/model/`, `src/hooks/`, `src/components/`, `src/context/` (empty dirs with barrel files)
- `public/samples/sample-basic.pdf`, `public/samples/sample-large.pdf` (bundled test PDFs)
- `README.md`

**Acceptance:** `npm run dev` serves a blank React page at `localhost:5173`. ESLint and TypeScript compile cleanly. Both sample PDFs are accessible at `/samples/*.pdf`.

---

## Phase 2: Core Types
**Goal:** Define all shared TypeScript types, interfaces, and the `AppState` / `AppAction` discriminated union.
**Depends on:** Phase 1
**Files created/modified:**
- `src/types/state.ts` — `AppState`, `AppAction`, `initialState`
- `src/types/engine.ts` — `PdfEngine`, `PageDimensions`, `OutlineNode`, `LoadProgress`, `RenderOptions`, `TextItem`, `PdfEngineError`
- `src/types/model.ts` — `PageDescriptor`, `FitMode`, `ScrollMode`
- `src/types/index.ts` — barrel re-exports

**Acceptance:** All types compile. No runtime code yet — this is a pure type-definition phase. Importing any type from `@/types` works.

---

## Phase 3: App State & Context
**Goal:** Implement the `useReducer`-based state management and Context providers.
**Depends on:** Phase 2
**Files created/modified:**
- `src/context/appReducer.ts` — full reducer implementation for all 23 core actions
- `src/context/AppContext.tsx` — `ViewerContext`, `EditorContext`, provider components, typed hooks (`useViewer`, `useEditor`)
- `src/context/index.ts`

**Acceptance:** Unit test (or a throwaway component) can mount the provider, dispatch `DOCUMENT_LOAD_START` / `SET_CURRENT_PAGE` / `ENTER_EDITOR`, and assert state transitions.

---

## Phase 4: PdfEngine Interface + PDF.js Adapter (Loading)
**Goal:** Implement the PDF.js adapter's `loadFromBuffer`, `loadFromUrl`, `pageCount`, `getPageDimensions`, and `destroy`.
**Depends on:** Phase 2
**Files created/modified:**
- `src/engine/PdfJsEngine.ts` — class implementing `PdfEngine` (loading + accessors only; `renderPage` stubbed)
- `src/engine/index.ts`
- `package.json` — add `pdfjs-dist` dependency

**Acceptance:** A test script loads `sample-basic.pdf` via URL, logs `pageCount` and dimensions for every page, and calls `destroy()` without error.

---

## Phase 5: PDF.js Adapter (Rendering)
**Goal:** Implement `renderPage`, `getTextContent`, `getOutline`, and `getDocumentBytes` on the PDF.js adapter.
**Depends on:** Phase 4
**Files created/modified:**
- `src/engine/PdfJsEngine.ts` — complete all remaining methods
- `src/engine/renderUtils.ts` — helper to size a canvas for a given viewport (shared between page rendering and thumbnails)

**Acceptance:** A minimal test component renders page 1 of `sample-basic.pdf` into a visible `<canvas>`. Aborting a render via `AbortController` rejects with `RENDER_CANCELLED`.

---

## Phase 6: DocumentModel (Implementation)
**Goal:** Build the `DocumentModel` class wrapping pdf-lib with all edit operations.
**Depends on:** Phase 2
**Files created/modified:**
- `src/model/DocumentModel.ts` — full implementation of `fromBytes`, `pageCount`, `rotatePages`, `deletePages`, `reorderPages`, `extractPages`, `mergePdf`, `save`
- `src/model/index.ts`
- `package.json` — add `pdf-lib`, `uuid` dependencies

**Acceptance:** Unit tests cover: rotate page 1 by 90° twice = 180°; delete middle page of a 3-page doc; reorder page 3 to position 1; extract pages [1,3] into a new model with 2 pages; merge a 2-page PDF at index 2 of a 3-page doc = 5 pages; save produces valid PDF bytes that re-load without error.

---

## Phase 7: DocumentModel (Edge Cases + Tests)
**Goal:** Harden DocumentModel with edge-case validation and comprehensive tests.
**Depends on:** Phase 6
**Files created/modified:**
- `src/model/DocumentModel.ts` — add validation guards
- `src/model/__tests__/DocumentModel.test.ts`
- `vitest.config.ts`, `package.json` — add `vitest` dev dependency

**Acceptance:** Tests pass for: empty arrays (no-op), out-of-range page numbers (throws `RangeError`), duplicate page numbers (deduplicated), delete-all-pages (throws), `reorderPages(n, n)` (no-op), `mergePdf` at `pageCount+1` (append), extract with duplicates (page appears twice in output).

---

## Phase 8: Host App Shell (Records UI)
**Goal:** Build the records management views: list, detail, file cards, and file picker.
**Depends on:** Phase 3
**Files created/modified:**
- `src/data/records.ts` — static records array with bundled PDF references
- `src/components/RecordListView/RecordListView.tsx`, `RecordListView.module.css`
- `src/components/RecordListView/RecordCard.tsx`, `RecordCard.module.css`
- `src/components/RecordDetailView/RecordDetailView.tsx`, `RecordDetailView.module.css`
- `src/components/RecordDetailView/FileCard.tsx`, `FileCard.module.css`
- `src/components/RecordDetailView/FilePickerButton.tsx`
- `src/App.tsx`, `src/App.module.css` — wire up navigation state

**Acceptance:** User sees a list of records, clicks one, sees its attached PDF files and a "Choose local file" button. Clicking a file or picking a local PDF calls `onOpenFile` (logs to console — no viewer yet).

---

## Phase 9: PdfWorkspace + Single-Page Rendering
**Goal:** Build `PdfWorkspace` and `PageCanvas` to render a single PDF page on screen.
**Depends on:** Phase 5, Phase 8
**Files created/modified:**
- `src/components/PdfWorkspace/PdfWorkspace.tsx`, `PdfWorkspace.module.css`
- `src/components/PageViewport/PageCanvas.tsx`, `PageCanvas.module.css`
- `src/App.tsx` — wire `PdfWorkspace` into the navigation flow

**Acceptance:** Clicking a PDF in the records UI opens `PdfWorkspace`, which loads the file via `PdfJsEngine`, renders page 1 into a canvas, and displays it. A close/back button returns to the records UI.

---

## Phase 10: Zoom Controls
**Goal:** Implement `ZoomControls` with zoom-in, zoom-out, explicit zoom presets, and fit-to-width / fit-to-page.
**Depends on:** Phase 9
**Files created/modified:**
- `src/components/ViewerToolbar/ZoomControls.tsx`, `ZoomControls.module.css`
- `src/components/ViewerToolbar/ViewerToolbar.tsx`, `ViewerToolbar.module.css` (shell with ZoomControls slot)
- `src/components/PageViewport/PageCanvas.tsx` — respond to `zoomLevel` / `fitMode` from context

**Acceptance:** Zoom-in/out buttons step through presets and re-render the canvas. Fit-to-width scales the page to fill the container width. Fit-to-page scales so the entire page is visible. Toolbar displays current zoom percentage or fit-mode label.

---

## Phase 11: Multi-Page Scroll (Continuous Mode)
**Goal:** Build `PageViewport` with continuous scroll — render all pages in a column with virtualization.
**Depends on:** Phase 10
**Files created/modified:**
- `src/components/PageViewport/PageViewport.tsx`, `PageViewport.module.css`
- `src/hooks/useVisiblePages.ts` — IntersectionObserver hook to track which pages are in view
- `src/components/PageViewport/PageCanvas.tsx` — render/cancel based on visibility

**Acceptance:** All pages of `sample-basic.pdf` appear in a scrollable column. Only visible pages (plus a 1-page buffer above/below) are rendered to canvas. Scrolling updates `currentPage` in context. Zoom applies to all pages.

---

## Phase 12: Page Navigator + Single/Spread Modes
**Goal:** Build `PageNavigator`, `ScrollModeSelector`, and implement single-page and two-page spread layouts.
**Depends on:** Phase 11
**Files created/modified:**
- `src/components/ViewerToolbar/PageNavigator.tsx`, `PageNavigator.module.css`
- `src/components/ViewerToolbar/ScrollModeSelector.tsx`, `ScrollModeSelector.module.css`
- `src/components/PageViewport/PageViewport.tsx` — branch layout by `scrollMode`

**Acceptance:** Page input shows "3 of 12", typing "7" jumps to page 7. Prev/next arrows work. Toggling to single-page shows one page at a time with prev/next navigation. Toggling to spread shows two pages side-by-side. Mode survives zoom changes.

---

## Phase 13: Thumbnail Sidebar
**Goal:** Build the collapsible thumbnail sidebar with scroll-synced active indicator.
**Depends on:** Phase 11
**Files created/modified:**
- `src/components/ThumbnailSidebar/ThumbnailSidebar.tsx`, `ThumbnailSidebar.module.css`
- `src/components/ThumbnailSidebar/ThumbnailPage.tsx`, `ThumbnailPage.module.css`
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — add sidebar to layout

**Acceptance:** Left sidebar shows small thumbnails of every page. The current page thumbnail has a highlighted border. Clicking a thumbnail navigates the main viewport to that page. Sidebar is collapsible via a toggle button.

---

## Phase 14: Editor Panel (Toolbar + Page Grid + Selection)
**Goal:** Build the editor mode toggle, EditorPanel, EditorToolbar, PageGrid, and DraggablePageCard with selection.
**Depends on:** Phase 7, Phase 13
**Files created/modified:**
- `src/components/EditorPanel/EditorPanel.tsx`, `EditorPanel.module.css`
- `src/components/EditorPanel/EditorToolbar.tsx`, `EditorToolbar.module.css`
- `src/components/EditorPanel/PageGrid.tsx`, `PageGrid.module.css`
- `src/components/EditorPanel/DraggablePageCard.tsx`, `DraggablePageCard.module.css`
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — add mode toggle button

**Acceptance:** Clicking "Edit" in the toolbar switches to editor mode: main area shows a grid of page thumbnails with checkboxes. Clicking a card selects it (blue border). Select-all and clear-selection buttons work. Clicking "View" returns to the viewer. No mutations yet — rotation/delete/reorder buttons are visible but wired in next phase.

---

## Phase 15: Editor Operations (Rotate, Delete, Reorder)
**Goal:** Wire EditorToolbar actions to DocumentModel mutations and re-sync the viewer engine.
**Depends on:** Phase 14
**Files created/modified:**
- `src/hooks/useDocumentEditor.ts` — hook that wraps DocumentModel, dispatches to EditorContext, and reloads PdfJsEngine after mutations
- `src/components/EditorPanel/EditorToolbar.tsx` — connect rotate CW/CCW, delete, undo, redo buttons
- `src/components/EditorPanel/PageGrid.tsx` — drag-and-drop reorder via pointer events

**Acceptance:** Select two pages, click rotate-CW — thumbnails update with 90° rotation. Delete selected pages — they disappear, page count updates. Drag page 3 to position 1 — grid reorders. Undo reverses the last operation. Redo re-applies it. Switching back to viewer shows the mutated document.

---

## Phase 16: Import / Merge + Extract
**Goal:** Build the ImportDialog and wire page extraction and PDF merge to the editor.
**Depends on:** Phase 15
**Files created/modified:**
- `src/components/EditorPanel/ImportDialog.tsx`, `ImportDialog.module.css`
- `src/components/EditorPanel/EditorToolbar.tsx` — connect import and extract buttons
- `src/hooks/useDocumentEditor.ts` — add `importPages` and `extractPages` methods

**Acceptance:** Click "Import" — file picker opens, user selects a PDF, a modal shows its pages, user picks pages and confirms — imported pages appear in the grid at the chosen position. Select 3 pages, click "Extract" — browser downloads a new PDF containing just those pages.

---

## Phase 17: Save + Print
**Goal:** Implement SaveButton (download edited PDF) and PrintButton (browser print).
**Depends on:** Phase 15
**Files created/modified:**
- `src/components/PdfWorkspace/SaveButton.tsx`
- `src/components/PdfWorkspace/PrintButton.tsx`
- `src/hooks/usePrint.ts` — renders all pages into a hidden iframe and calls `window.print()`
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — add save/print buttons

**Acceptance:** In editor mode, click "Save" — the browser downloads a `.pdf` file containing all edits (rotations, deletions, reordering, imports). In viewer mode, click "Print" — browser print dialog opens with all pages.

---

## Phase 18: Linearized Loading
**Goal:** Enable progressive rendering for URL-loaded PDFs using PDF.js range request support.
**Depends on:** Phase 11
**Files created/modified:**
- `public/samples/sample-linearized.pdf` — a linearized version of the large sample
- `src/engine/PdfJsEngine.ts` — configure `getDocument` with `{ disableAutoFetch: true, disableStream: false, rangeChunkSize: 65536 }`
- `src/components/PdfWorkspace/LoadingBar.tsx`, `LoadingBar.module.css` — progress bar component
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — show `LoadingBar` during load, render page 1 as soon as engine resolves

**Acceptance:** Opening `sample-linearized.pdf` shows a progress bar. Page 1 renders before the progress bar reaches 100%. Scrolling to later pages that haven't streamed yet shows a placeholder spinner until their data arrives.

---

## Phase 19: Polish & Edge Cases
**Goal:** Handle error states, empty states, keyboard shortcuts, responsive layout, and visual polish.
**Depends on:** Phases 17, 18
**Files created/modified:**
- `src/components/ErrorBanner/ErrorBanner.tsx`, `ErrorBanner.module.css`
- `src/hooks/useKeyboardShortcuts.ts` — Ctrl+Z/Y (undo/redo), +/- (zoom), Left/Right (page nav)
- Various `.module.css` files — responsive breakpoints, transitions, focus styles
- `src/App.module.css` — global reset, font, colour variables

**Acceptance:** Loading a corrupt file shows an error banner with a dismiss button. Keyboard shortcuts work. The app is usable at 768px viewport width. Focus rings are visible for all interactive elements. No console errors or warnings.

---

## Phase 20: End-to-End Testing
**Goal:** Verify every functional requirement works in a real browser.
**Depends on:** Phase 19
**Files created/modified:**
- `e2e/viewer.spec.ts` — open PDF, zoom, navigate, switch scroll modes
- `e2e/editor.spec.ts` — rotate, delete, reorder, import, extract, save
- `e2e/linearized.spec.ts` — progressive loading progress bar
- `playwright.config.ts`, `package.json` — add Playwright dev dependency

**Acceptance:** All E2E tests pass. Every numbered functional requirement from our spec (1–20) has at least one test that exercises it.

---

## Phase 21: Architecture Document
**Goal:** Write the required architecture doc with component diagram, state management explanation, tradeoffs, and roadmap.
**Depends on:** Phase 20
**Files created/modified:**
- `docs/architecture.md`

**Acceptance:** Document contains: one Mermaid component diagram, state management section (Context + useReducer rationale), key tradeoffs section (PDF.js vs mupdf, css modules vs alternatives, snapshot undo vs inverse ops), and an "if I had 1 more day" roadmap listing WASM tier features, virtualized thumbnails, and persistent state.

---

## Phase 22: Cursor AI Usage Log
**Goal:** Compile the Cursor usage log: plan mode output, transcript exports, change notes, validation notes.
**Depends on:** Phase 21
**Files created/modified:**
- `docs/cursor-log.md`

**Acceptance:** Document includes: exported plan mode conversation, links to or excerpts of Composer transcripts, a table of "AI suggested X, I changed it to Y because Z", and a section describing how each feature was validated (manual test, E2E, unit test).

---

**User**

For each phase from Prompt 7, identify the single biggest thing likely to go wrong and how I'll detect it early. Format:
## Phase N: <name>
Risk: <one sentence describing what fails>
Detection: <how I'll know within 5 minutes of finishing the phase>
Mitigation: <what I do if it happens>
Focus on real risks specific to this stack:

PDF.js worker loading in Vite (a known footgun)
Render race conditions when zoom/page change rapidly
pdf-lib mutating internal state in ways that confuse subsequent operations
Memory blowup from full-byte snapshots in undo history
WASM bundle size and SharedArrayBuffer / COOP-COEP requirements
Drag-and-drop drop zone math being subtly off-by-one
Browser print rendering the React app instead of the PDF

Don't list generic risks like "scope creep" or "bugs."

---

**Cursor**

## Phase 1: Project Scaffold
**Risk:** Vite's `public/` directory doesn't serve PDFs with the correct `Content-Type` or `Accept-Ranges` headers, silently breaking future linearized loading.
**Detection:** After scaffold is running, open DevTools Network tab, fetch `/samples/sample-basic.pdf`, and verify the response headers include `Content-Type: application/pdf` and `Accept-Ranges: bytes`.
**Mitigation:** Add a custom Vite plugin in `vite.config.ts` that sets `Content-Type` for `.pdf` files via the `configureServer` hook, or move PDFs to an explicit static middleware with correct headers.

---

## Phase 2: Core Types
**Risk:** `Set<number>` and `Map<number, ...>` in `AppState` are not structurally comparable — React's `useReducer` uses `Object.is` to decide whether to re-render, and creating a new `Set` with identical contents still triggers a re-render, while mutating an existing `Set` does *not* trigger one.
**Detection:** Add a temporary `console.log` in the reducer that logs `Object.is(oldState.selectedPages, newState.selectedPages)` after a `TOGGLE_PAGE_SELECTION` — if it's `true`, you're mutating instead of creating new Sets.
**Mitigation:** Establish a lint rule / code comment convention: every reducer branch that touches a `Set` or `Map` must spread into a new instance (`new Set([...prev, item])`), never call `.add()` / `.delete()` on the existing reference.

---

## Phase 3: App State & Context
**Risk:** A single monolithic `AppContext` causes every child to re-render on every action — zoom changes re-render the editor panel, selection changes re-render the page viewport.
**Detection:** Add `<React.Profiler>` around `EditorPanel` and `PageViewport`. Dispatch `SET_CURRENT_PAGE` (scroll-driven, fires at 60 Hz) and check if `EditorPanel` shows renders in the Profiler.
**Mitigation:** Split into `ViewerContext` and `EditorContext` as originally planned. Each context's provider only passes its slice of state, and consumers only subscribe to the context they need.

---

## Phase 4: PdfEngine Interface + PDF.js Adapter (Loading)
**Risk:** PDF.js's Web Worker fails to load in Vite's ESM dev server. `pdfjs-dist` ships a worker file that must be served separately, and Vite's module resolution doesn't find it — you get a silent fallback to main-thread parsing (10x slower) or a hard error.
**Detection:** After loading a PDF, open the browser console and check for `Warning: Setting up fake worker` — this means the worker failed to load and PDF.js fell back to synchronous parsing.
**Mitigation:** Explicitly set `pdfjs.GlobalWorkerOptions.workerSrc` to a URL imported via Vite's `?url` suffix: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;`.

---

## Phase 5: PDF.js Adapter (Rendering)
**Risk:** Calling `page.render()` while a previous render on the same canvas is still in progress throws `RenderingCancelledException` or silently corrupts the canvas — PDF.js does not queue renders, it errors.
**Detection:** Rapidly resize the browser window while a page is displayed. If you see a blank canvas, a partial paint, or a console error mentioning `RenderingCancelledException`, you have a race.
**Mitigation:** Track the current `RenderTask` in a ref. Before starting a new render, call `previousTask.cancel()` and `await` its promise (which rejects with `RenderingCancelledException`). Catch that specific error silently. Only then start the new render. Wrap this sequence in the `AbortSignal` flow from `RenderOptions`.

---

## Phase 6: DocumentModel (Implementation)
**Risk:** `pdf-lib`'s `PDFDocument.removePage(index)` mutates the internal page tree, shifting all subsequent page indices — a loop that deletes pages `[1, 3, 5]` in forward order actually deletes pages 1, 2, 3 (because each removal shifts the remaining indices).
**Detection:** Create a 5-page PDF, call `deletePages([1, 3, 5])`, then call `save()` and reload — if the surviving pages aren't the expected ones (original pages 2 and 4), the index math is wrong.
**Mitigation:** Sort page indices in descending order before the deletion loop: `indices.sort((a, b) => b - a)`. Deleting from the end first keeps all preceding indices stable.

---

## Phase 7: DocumentModel (Edge Cases + Tests)
**Risk:** `reorderPages` has an off-by-one after removal. When you remove page at index `from` and insert at index `to`, `to` refers to the post-removal array. If `from < to`, the target position in the original numbering is actually `to + 1`. Getting this wrong produces silent misordering that only manifests on specific from/to combinations.
**Detection:** Test `reorderPages(1, 3)` on a 5-page doc (`[A,B,C,D,E]`). Expected result: `[B,C,A,D,E]`. If you get `[B,A,C,D,E]`, the adjustment is wrong.
**Mitigation:** Decide on a clear semantic: "insert before position `to` in the original array" or "insert at position `to` in the post-removal array." Document it in the JSDoc and write tests for every quadrant: `from < to`, `from > to`, `from === to`, and boundary values (first page, last page).

---

## Phase 8: Host App Shell (Records UI)
**Risk:** The `File` object from the file picker loses its `ArrayBuffer` reference when React re-renders — calling `file.arrayBuffer()` after a state update that triggers a re-render may work in some browsers but is technically reading from a potentially neutered buffer.
**Detection:** Pick a local file, trigger a state update (e.g. navigate away and back), then attempt to load the file. If `arrayBuffer()` rejects or returns empty bytes, the reference was neutered.
**Mitigation:** Read `file.arrayBuffer()` immediately in the `onChange` handler, before any state update, and store the `Uint8Array` in state (or a ref) — never store the `File` object for later consumption.

---

## Phase 9: PdfWorkspace + Single-Page Rendering
**Risk:** The canvas is painted at CSS pixel dimensions instead of device pixel dimensions, producing blurry text on Retina displays (every pixel is a 2x2 block of device pixels).
**Detection:** Open the app on a Retina display (or set Chrome DevTools → Rendering → Emulate CSS media → device pixel ratio: 2). If text looks fuzzy compared to native PDF viewers, the canvas is not DPR-scaled.
**Mitigation:** Set `canvas.width = Math.floor(cssWidth * devicePixelRatio)` and `canvas.height = Math.floor(cssHeight * devicePixelRatio)`, then use CSS to constrain display size: `canvas.style.width = cssWidth + 'px'`. Pass `devicePixelRatio` through `RenderOptions.devicePixelRatio` so the engine applies the correct scale transform.

---

## Phase 10: Zoom Controls
**Risk:** Fit-to-width zoom is computed from the container width at mount time, but the container width changes when the thumbnail sidebar opens/closes — the fit calculation becomes stale and the page is either clipped or floating in whitespace.
**Detection:** Set fit-to-width, then toggle the thumbnail sidebar. If the page width doesn't adapt to the new container width, the fit is not reactive.
**Mitigation:** Use a `ResizeObserver` on the `PageViewport` container. When the observed width changes and `fitMode !== 'none'`, recompute the effective scale and trigger a re-render. Debounce the observer callback by one `requestAnimationFrame` to avoid layout thrashing.

---

## Phase 11: Multi-Page Scroll (Continuous Mode)
**Risk:** Rendering all pages eagerly on a 200-page PDF allocates 200 canvases and 200 render tasks, exhausting GPU memory and freezing the tab.
**Detection:** Open `sample-large.pdf` (50+ pages) and watch Chrome Task Manager's GPU memory column. If it climbs past 500 MB or the tab becomes unresponsive, virtualization is not working.
**Mitigation:** The `useVisiblePages` hook must gate rendering: only pages in the `IntersectionObserver`'s visible set (plus a 1-page buffer) get `renderPage()` called. Off-screen pages render as an empty `<div>` sized to their `PageDimensions` (maintaining scroll height) with their canvas unmounted or cleared.

---

## Phase 12: Page Navigator + Single/Spread Modes
**Risk:** Two-page spread mode renders pages `[n, n+1]` side by side, but when the document has an odd page count, the last "spread" contains one page and the layout breaks — the single page is either stretched to fill half the viewport or the empty slot shows a glitched placeholder.
**Detection:** Open a 5-page PDF in spread mode, navigate to the last spread. If page 5 is stretched or misaligned, the odd-page case is unhandled.
**Mitigation:** When `pageCount` is odd, the final spread is a single-page spread. The layout code must check `if (rightPageIndex >= pageCount)` and render only the left page, centered or left-aligned.

---

## Phase 13: Thumbnail Sidebar
**Risk:** Rendering 200 thumbnails synchronously at sidebar mount time causes a multi-second jank — each thumbnail calls `renderPage` with `scale: 0.2`, and 200 sequential renders block the main thread.
**Detection:** Open a 100-page PDF, then toggle the sidebar open. If there's a visible freeze (> 500 ms) before thumbnails appear, rendering is not staggered.
**Mitigation:** Virtualize the thumbnail list: only render thumbnails visible in the sidebar's scroll area (use `IntersectionObserver` on each `ThumbnailPage`). Alternatively, render thumbnails in `requestIdleCallback` batches of 5.

---

## Phase 14: Editor Panel (Toolbar + Page Grid + Selection)
**Risk:** Entering editor mode requires reading the document bytes from `PdfEngine.getDocumentBytes()` and initializing a `DocumentModel`. For a large PDF loaded via URL, this call blocks until the full download completes — the user clicks "Edit" and nothing happens for 10 seconds with no feedback.
**Detection:** Open the linearized sample (which loads progressively), immediately click "Edit" before the progress bar finishes. If the UI freezes or the editor takes > 2 seconds to appear with no loading indicator, the problem is present.
**Mitigation:** Show a spinner / "Preparing editor..." overlay while `getDocumentBytes()` is pending. Alternatively, start preloading the document model in the background as soon as `DOCUMENT_LOADED` fires, so it's likely ready by the time the user clicks "Edit."

---

## Phase 15: Editor Operations (Rotate, Delete, Reorder)
**Risk:** After a DocumentModel mutation (e.g. delete page 3), the viewer engine must be reloaded from the mutated bytes to show the updated document. If the reload replaces `pdfEngine` in context while `PageViewport` is mid-render, in-flight `RenderTask`s write to canvases that are now associated with the wrong engine — producing ghost frames or crashes.
**Detection:** Delete a page and immediately switch to viewer mode. If you see a flash of the old page or a console error from PDF.js about a destroyed document, there's a lifecycle collision.
**Mitigation:** On engine reload: (1) call `oldEngine.destroy()` — this cancels all in-flight renders, (2) wait for destruction to settle (one microtask tick), (3) dispatch `DOCUMENT_LOADED` with the new engine, (4) let React's reconciliation mount fresh `PageCanvas` components against the new engine.

---

## Phase 16: Import / Merge + Extract
**Risk:** `pdf-lib`'s `copyPages` deep-copies fonts and images. Merging two PDFs that both embed the same 4 MB font produces an 8 MB output — and doing this repeatedly in a session causes the in-memory `PDFDocument` to balloon without bound.
**Detection:** Import the same 10-page PDF three times. Check `documentModel.save()` byte length — if it grows linearly (30 MB for 30 identical pages), font deduplication is not happening.
**Mitigation:** This is a known pdf-lib limitation — it does not deduplicate embedded resources across `copyPages` calls. Document it in the architecture tradeoffs section. For the MVP, accept the bloat. If it becomes a real problem, post-process with `pdfDoc.save({ useObjectStreams: true })` which at least compresses the cross-reference table.

---

## Phase 17: Save + Print
**Risk:** The print flow renders pages into a hidden iframe, but `window.print()` on the iframe captures the *React host app* (toolbar, sidebar, records UI) instead of just the PDF pages — because `window.print()` was called on the wrong window context, or CSS `@media print` styles aren't isolating the content.
**Detection:** Click Print, inspect the browser print preview. If you see the toolbar or sidebar in the preview, print isolation is broken.
**Mitigation:** Create a dedicated `<iframe>` with `srcdoc` containing only a minimal HTML document. Render each page's canvas into `<img>` tags (via `canvas.toDataURL()`) inside the iframe's body. Call `iframe.contentWindow.print()`, not `window.print()`. The iframe's document has no knowledge of React — it's pure HTML with images.

---

## Phase 18: Linearized Loading
**Risk:** PDF.js's range-request loading requires the server to respond with `206 Partial Content` and correct `Content-Range` headers. Vite's dev server supports this for static files, but in production builds (e.g. served via `vite preview` or a CDN), range requests may be unsupported or the PDF's linearization dictionary may be absent — causing a silent fallback to full-file download with no progressive rendering.
**Detection:** Open DevTools Network tab while loading the linearized PDF. Filter by the PDF URL. If you see a single `200` response instead of multiple `206` responses, range requests are not working.
**Mitigation:** Verify the sample PDF is actually linearized: run `qpdf --check-linearization sample-linearized.pdf` locally. If Vite's preview server doesn't support ranges, document that linearization requires a range-capable server and test exclusively in `dev` mode. Add a runtime check: if `onProgress` fires with `total === undefined`, show a determinate progress bar based on chunk count instead.

---

## Phase 19: Polish & Edge Cases
**Risk:** Keyboard shortcuts (`Ctrl+Z`, `Ctrl+-`, arrow keys) conflict with browser defaults — `Ctrl+-` zooms the browser viewport instead of the PDF, and intercepting it with `preventDefault()` breaks accessibility expectations.
**Detection:** Press `Ctrl+-` with the viewer focused. If the browser chrome zooms instead of the PDF zoom level changing, the shortcut isn't captured. If it *is* captured but the user can no longer zoom the browser at all, accessibility is broken.
**Mitigation:** Only capture shortcuts when focus is inside `PdfWorkspace` (check `event.target` or use a focus-scoping `<div>` with `tabIndex={0}` and `onKeyDown`). Don't capture browser-level shortcuts (`Ctrl+-/+`) — instead use custom keys (`-`/`=` without modifier) when the workspace is focused. Document the shortcut scheme in a help tooltip.

---

## Phase 20: End-to-End Testing
**Risk:** Playwright can't interact with `<canvas>` elements — it can click at coordinates but can't assert that a PDF page rendered correctly, because canvas content is opaque pixels. Tests pass even if the canvas is blank.
**Detection:** Temporarily break `renderPage` (return without painting). If E2E tests still pass, they're not verifying rendered output.
**Mitigation:** Use `canvas.toDataURL()` and screenshot comparison: Playwright's `expect(page).toHaveScreenshot()` with a stored baseline image, or assert `canvas.toDataURL().length > threshold` (a blank canvas produces a very short data URL, a painted one is much larger). For non-visual assertions, verify DOM state: page navigator text, zoom label, sidebar thumbnail count.

---

## Phase 21: Architecture Document
**Risk:** The Mermaid component diagram doesn't render in GitHub's Markdown preview because it uses syntax features that GitHub's Mermaid renderer doesn't support (e.g., `classDef` with coloring, `click` events, or subgraph nesting deeper than 2 levels).
**Detection:** Push the doc to GitHub and view it in the browser. If the diagram shows as raw text instead of a rendered graphic, it's broken.
**Mitigation:** Test the Mermaid syntax in the [Mermaid Live Editor](https://mermaid.live) before committing. Stick to simple `flowchart TD` with basic nodes and edges. Avoid styling directives. As a fallback, render the diagram locally and embed it as a PNG in `docs/`.

---

## Phase 22: Cursor AI Usage Log
**Risk:** Cursor's chat export truncates long conversations or omits tool-use blocks, making the log incomplete — the evaluator sees "you used AI" but can't assess *how* or *what you changed*.
**Detection:** Export the transcript and search for the planning conversation from Prompt 1. If it's missing or truncated, the export is incomplete.
**Mitigation:** Supplement the export with manual notes written *during* each phase: a 2-3 sentence entry per phase noting "AI suggested X, I kept/changed Y, validated by Z." Keep these notes in `docs/cursor-log.md` incrementally — don't try to reconstruct them retroactively.

---

**User**

"Things might break" isn't a risk, it's a tautology. Name a specific failure mode for each phase, like "the page renders blurry on retina screens because the canvas size is set in CSS pixels not device pixels."

---

**Cursor**

I think we're already aligned — my previous response hit exactly that level of specificity. Here are a few examples pulled directly from it:

- **Phase 4:** *"PDF.js's Web Worker fails to load in Vite's ESM dev server. `pdfjs-dist` ships a worker file that must be served separately, and Vite's module resolution doesn't find it — you get a silent fallback to main-thread parsing (10x slower). Detection: check the console for `Warning: Setting up fake worker`."*

- **Phase 6:** *"`pdf-lib`'s `removePage(index)` shifts all subsequent indices — a loop deleting pages `[1, 3, 5]` in forward order actually deletes pages 1, 2, 3 because each removal shifts the remaining indices."*

- **Phase 9:** *"The canvas is painted at CSS pixel dimensions instead of device pixel dimensions, producing blurry text on Retina displays (every pixel is a 2x2 block of device pixels)."* — This is word-for-word your example.

- **Phase 15:** *"If the engine reload replaces `pdfEngine` in context while `PageViewport` is mid-render, in-flight `RenderTask`s write to canvases associated with the wrong engine — producing ghost frames."*

- **Phase 17:** *"`window.print()` captures the React host app (toolbar, sidebar) instead of just the PDF pages because it was called on the parent window context instead of the iframe's `contentWindow`."*

Every phase names a concrete mechanism (the specific API call, the specific wrong value, the specific browser behavior), not just "something might break." If any particular phase feels under-specified to you, point it out and I'll sharpen it further. Otherwise, we're ready for the next planning question.

---

**User**

Now produce the acceptance criteria for the whole MVP, mapped back to the spec sections. I want a checklist I can run through at the end to confirm every requirement is met.
Format:
## A.1 — PDF Viewing and Navigation
- [ ] REQ-1: Opens a local PDF via file picker — verify by: <test>
- [ ] REQ-2: Opens a PDF via URL — verify by: <test>
- [ ] REQ-3: Zoom in / out works — verify by: <test>
...
Cover all five spec sections (Viewing, Editing, Printing, Export, Bonus). Each requirement needs a manual test step a reviewer can perform in under 30 seconds.
The bonus section criteria should explicitly say "requires MuPDF engine" where relevant.
At the end, add a separate section called "Quality bar" with criteria the spec doesn't explicitly require but a senior reviewer will check anyway: TypeScript strict mode passes, no console errors on load, no console warnings except known PDF.js noise, axe DevTools shows zero critical/serious accessibility violations, README has working setup instructions, repo has the A/B/C folder structure.

---

**Cursor**

## A.1 — PDF Viewing and Navigation

- [ ] **REQ-1: Open a bundled PDF from the records UI** — Click a record, click an attached PDF file card. The PDF renders in the inline viewer within 2 seconds.
- [ ] **REQ-2: Open a local PDF via file picker** — In the record detail view, click "Open local file", select a PDF from disk. The file renders in the viewer. Filename appears in the toolbar.
- [ ] **REQ-3: High-fidelity rendering** — Open a PDF with mixed content (text, images, vector graphics, embedded fonts). Compare visually to the same file in Chrome's native PDF viewer. Text is crisp; images are not pixelated; vector lines are smooth.
- [ ] **REQ-4: Zoom in** — Click the zoom-in button three times. Each click increases the displayed zoom percentage. Page content scales up and remains sharp (no pixelation until extreme zoom levels).
- [ ] **REQ-5: Zoom out** — Click the zoom-out button three times. Each click decreases the displayed zoom percentage. Page content scales down.
- [ ] **REQ-6: Fit-to-width** — Click the fit-to-width button. The page width matches the viewport width exactly. Resize the browser window — the page width adjusts to match.
- [ ] **REQ-7: Fit-to-page** — Click the fit-to-page button. The entire page (including height) is visible without scrolling. Resize the browser — the page rescales to stay fully visible.
- [ ] **REQ-8: Continuous scroll mode** — Select continuous mode. All pages appear in a single scrollable column. Scrolling smoothly transitions between pages. The page navigator updates as you scroll.
- [ ] **REQ-9: Single-page mode** — Select single-page mode. Only one page is visible. Click next/prev to navigate. No partial pages are shown.
- [ ] **REQ-10: Two-page spread mode** — Select spread mode. Two pages appear side-by-side. A 5-page document shows spreads [1], [2-3], [4-5] (first page alone, then pairs). Navigate with next/prev.
- [ ] **REQ-11: Page navigation — prev/next** — Click the next-page arrow repeatedly until the last page. The prev-page arrow navigates back. At page 1, prev is disabled. At the last page, next is disabled.
- [ ] **REQ-12: Page navigation — direct input** — Type "7" into the page number input and press Enter. The viewport jumps to page 7. Type "999" — the input clamps to the last page, no error.
- [ ] **REQ-13: Thumbnail sidebar** — Click the sidebar toggle. Thumbnails of every page appear. The current page thumbnail has a highlighted border. Click thumbnail for page 5 — the viewport scrolls to page 5.
- [ ] **REQ-14: Linearized loading** — Open the linearized sample PDF. A progress bar appears. Page 1 renders while the progress bar is still incomplete. Scrolling to an unloaded page shows a spinner until its data arrives.

---

## A.2 — PDF Editing (Document Editor)

- [ ] **REQ-15: Enter editor mode** — Click the "Edit" toggle in the toolbar. The main area switches to a page grid showing all pages as thumbnails with checkboxes. The viewer toolbar is replaced by the editor toolbar.
- [ ] **REQ-16: Exit editor mode** — Click "View" to leave editor mode. The viewer renders the document with all edits applied. Page count in the navigator reflects any deletions or imports.
- [ ] **REQ-17: Page selection** — Click a page card — it gets a blue selection border and checkbox. Click again — it deselects. Click "Select All" — every page is selected. Click "Clear" — all deselected.
- [ ] **REQ-18: Page rotation** — Select pages 1 and 3. Click "Rotate CW". Both thumbnails rotate 90° clockwise. Click "Rotate CW" again — they're now at 180°. Switch to viewer mode — pages 1 and 3 render rotated.
- [ ] **REQ-19: Page reordering** — Drag page 4 and drop it before page 2. The grid shows the new order. Switch to viewer mode — the page order matches the reordered grid.
- [ ] **REQ-20: Page deletion** — Select pages 2 and 3 in a 5-page document. Click "Delete". The grid now shows 3 pages. Page count in the toolbar reads "3". Attempt to delete all remaining pages — an error message appears, deletion is blocked.
- [ ] **REQ-21: Page import / merge** — Click "Import". Select a second PDF from disk. A dialog shows its pages. Select 2 of 4 pages, choose insertion position "after page 1", click confirm. The grid now shows original pages plus 2 imported pages inserted at position 2-3.
- [ ] **REQ-22: Page extraction** — Select pages 2, 4, and 5. Click "Extract". A new PDF downloads containing exactly those 3 pages in that order. Open the downloaded file in another viewer to confirm.
- [ ] **REQ-23: Undo** — Rotate a page, then click Undo. The rotation reverts. The grid shows the page at its original orientation.
- [ ] **REQ-24: Redo** — After undoing, click Redo. The rotation re-applies. Redo is disabled when there's nothing to redo.
- [ ] **REQ-25: Export edited PDF** — Rotate page 1, delete page 3, reorder page 4 to position 2. Click "Save". A PDF downloads. Open it in Chrome's native viewer — page 1 is rotated, page 3 is gone, the page that was 4 is now second.

---

## A.3 — Printing

- [ ] **REQ-26: Print action** — Click the Print button. The browser print dialog opens. The print preview shows only the PDF pages — no toolbar, sidebar, or app UI is visible. All pages are present and correctly oriented.

---

## A.4 — Export and Conversion

- [ ] **REQ-27: Export with specific pages** — Enter editor mode, select pages 1, 3, 5. Click "Extract". The downloaded PDF contains exactly pages 1, 3, 5. File size is smaller than the original (excluded pages are not in the output).
- [ ] **REQ-28: Save PDF to local** — Open a PDF, make no edits, click "Save". The original PDF downloads to the local filesystem with the original filename. File contents are byte-equivalent or visually identical to the source.
- [ ] **REQ-29: Save edited PDF to local** — Make edits (rotate + delete), click "Save". The downloaded file opens in an external viewer and reflects all edits.

---

## A.5 — Bonus (WASM Tier)

- [ ] **REQ-30: Redaction — rectangle** — *Requires MuPDF engine.* Select the rectangle redaction tool. Draw a rectangle over sensitive text. The area is visually blacked out. Save the PDF — the redacted content is irrecoverably removed from the file (verify by searching for the original text in the saved file).
- [ ] **REQ-31: Redaction — text highlight** — *Requires MuPDF engine.* Select the text-highlighter redaction tool. Select a word by clicking and dragging. The word is highlighted for redaction. Apply redactions and save — the word is gone.
- [ ] **REQ-32: Text annotations** — *Requires MuPDF engine.* Select the text annotation tool. Click on a page and type a note. The annotation appears as a positioned text box. Save and reopen — the annotation persists.
- [ ] **REQ-33: Signature form fields** — *Requires MuPDF engine.* Open a PDF that contains a signature form field. The field is rendered as an interactive widget. Click it — a signature input UI appears.
- [ ] **REQ-34: Widget annotations** — *Requires MuPDF engine.* Open a PDF with form fields (checkboxes, text inputs). The widgets are interactive — checkboxes toggle, text inputs accept typing. Save — form state persists.
- [ ] **REQ-35: Bookmarks — read** — *Requires MuPDF engine.* Open a PDF that contains an outline/bookmark tree. A bookmark panel displays the tree. Click a bookmark — the viewer navigates to the target page.
- [ ] **REQ-36: Bookmarks — write** — *Requires MuPDF engine.* Add a new bookmark titled "My Note" pointing to page 5. Save the PDF, reopen it — the bookmark appears in the outline tree.

---

## B — Architecture & Design Document

- [ ] **REQ-37: Component diagram** — `docs/architecture.md` contains a Mermaid (or image) component diagram showing all major components and their relationships.
- [ ] **REQ-38: State management description** — The document explains Context + useReducer, the two context split (Viewer/Editor), and why external libraries were not used.
- [ ] **REQ-39: Key tradeoffs** — At least three tradeoff decisions are discussed with alternatives considered (e.g., PDF.js vs mupdf-wasm, snapshot undo vs inverse operations, CSS Modules vs alternatives).
- [ ] **REQ-40: "If I had 1 more day" roadmap** — A concrete list of next steps, not vague aspirations. Each item names a specific feature or improvement with a sentence on the approach.

---

## C — Cursor AI Usage Log

- [ ] **REQ-41: Plan mode output** — `docs/cursor-log.md` includes the planning conversation (this conversation) or a summary of key decisions made during planning.
- [ ] **REQ-42: Exported transcript** — At least one full Composer session transcript is included or linked.
- [ ] **REQ-43: Change notes** — A table or list documenting at least 5 instances where AI output was modified, with the original suggestion, the change made, and the reason.
- [ ] **REQ-44: Validation notes** — For each major feature, a sentence describing how correctness was verified (manual test, unit test, E2E test, or visual inspection).

---

## Quality Bar

These are not in the spec but a senior reviewer will check them:

- [ ] **QA-1: TypeScript strict mode** — `tsconfig.json` has `"strict": true`. Running `npx tsc --noEmit` produces zero errors.
- [ ] **QA-2: No console errors** — Open the app in Chrome, navigate through all major flows (open PDF, zoom, edit, save, print). The console shows zero `Error`-level messages.
- [ ] **QA-3: No unexpected console warnings** — Console warnings are limited to known PDF.js noise (`Warning: TT: undefined function` from malformed fonts). No React warnings (`key` prop, deprecated lifecycle, act() warnings).
- [ ] **QA-4: Accessibility — critical/serious** — Run axe DevTools on the records list view and the PDF viewer. Zero critical or serious violations. (Minor/moderate are acceptable for canvas-based content.)
- [ ] **QA-5: README setup instructions** — `README.md` contains: prerequisites (Node version), install command (`npm install`), dev command (`npm run dev`), build command (`npm run build`), and a one-sentence project description. A fresh clone following these steps results in a running app.
- [ ] **QA-6: Clean build** — `npm run build` completes with zero errors and zero warnings. The `dist/` output is servable via `npx vite preview`.
- [ ] **QA-7: Deliverable structure** — The repo root contains the three deliverables clearly organized: the app source (`src/`), architecture doc (`docs/architecture.md`), and Cursor log (`docs/cursor-log.md`).
- [ ] **QA-8: No secrets or large binaries committed** — `.gitignore` excludes `node_modules/`, `dist/`, `.env`. Sample PDFs in `public/samples/` are under 5 MB each.
- [ ] **QA-9: Retina rendering** — On a HiDPI display (or with Chrome DevTools DPR override set to 2), PDF text is sharp and not blurry.
- [ ] **QA-10: Responsive layout** — At 768px viewport width, the app is usable: sidebar collapses, toolbar wraps or uses overflow menu, page grid adjusts column count.

---

**User**

We now have everything we need. Consolidate every response from this Plan mode session into a single markdown document I will save as cursor-plan.md in my workspace.
Structure:
# PDF Viewer SDK — Build Plan

## 1. Project overview
[from Prompt 1's summary]

## 2. Requirements
[from Prompt 1's numbered requirements list]

## 3. Architectural decisions
[from Prompt 2 — eight decisions, each with a one-paragraph justification]

## 4. Component tree
[from Prompt 3 — the nested tree]

## 5. Application state
[from Prompt 4 — the AppState interface and AppAction union as code blocks]

## 6. PdfEngine interface
[from Prompt 5 — the full interface and supporting types as a code block]

## 7. DocumentModel API
[from Prompt 6 — the class signatures with JSDoc]

## 8. Build phases
[from Prompt 7 — all phases with goal, dependencies, files, acceptance]

## 9. Risks and mitigations
[from Prompt 8 — per-phase risks]

## 10. Acceptance criteria
[from Prompt 9 — full checklist mapped to spec sections]

## 11. Quality bar
[from Prompt 9's quality bar section]
Output the entire document as one markdown code block I can copy into a file. Don't summarize or shorten — include everything in full. The final document should be self-contained: a reviewer reading only cursor-plan.md should understand exactly what we're building, why, in what order, and how we'll know it works.

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Now I'll write the full consolidated plan document to `cursor-plan.md` in the workspace root.

The full consolidated plan has been written to `cursor-plan.md` in the workspace root. It contains all 11 sections from the planning session:

1. **Project Overview** — one-paragraph summary
2. **Requirements** — 34 numbered requirements across all spec sections
3. **Architectural Decisions** — 8 decisions with one-paragraph justifications
4. **Component Tree** — 25 components (22 core + 3 bonus) with ownership and responsibilities
5. **Application State** — full `AppState` interface, `AppAction` union (29 actions), supporting types, and `initialState`
6. **PdfEngine Interface** — complete engine abstraction with all supporting types and `PdfEngineError`
7. **DocumentModel API** — class signatures with JSDoc covering all 7 methods and edge cases
8. **Build Phases** — 22 phases with goals, dependencies, file lists, and acceptance criteria
9. **Risks and Mitigations** — per-phase technical risks with detection and mitigation steps
10. **Acceptance Criteria** — 44 requirements mapped to spec sections with 30-second manual test steps
11. **Quality Bar** — 10 additional criteria a senior reviewer will check

The document is fully self-contained — a reviewer reading only `cursor-plan.md` can understand exactly what's being built, why, in what order, and how to verify it works.

---

**User**

I want to revisit the bonus tier decision. Earlier I said "skip the bonus tier" but I want to reverse that — we are going to attempt the WASM bonus tier after all. The bonus features are worth significant evaluation points and we have time.
Update the plan to add the bonus tier back in. Specifically:

Move the WASM bonus features from "Out of Scope" back into the active requirements list. Renumber as needed.
Update Section 3.4 — remove the sentence "Since we dropped the bonus tier..." Replace with rationale for using PDF.js as the default engine and mupdf-wasm as a secondary engine that activates only when the user opts into WASM mode.
Update the PdfEngine interface section — add a note that we will implement two adapters: PdfJsEngine (default) and MuPdfEngine (WASM, opt-in).
Update the AppState to add: enginePreference: 'pdfjs' | 'mupdf', and bring back the bonus annotation/bookmark fields without the bonus marker.
Add new build phases at the end (after Phase 21 architecture doc, before Phase 22 Cursor log):

Phase 22: MuPDF engine adapter — implement MuPdfEngine class implementing PdfEngine. Lazy-import mupdf so the bundle isn't bloated when PDF.js is selected. Add an engine selector toggle to the file picker screen.
Phase 23: Annotations — text annotations and rectangle redaction. Tool rail UI. MuPDF-only with disabled state when PDF.js is active.
Phase 24: Bookmarks read/write panel. Right-side collapsible panel.


Add corresponding risk entries for the new phases. The biggest risks: SharedArrayBuffer / COOP-COEP requirements for MuPDF, ~10 MB WASM bundle size, lazy-loading the mupdf module without breaking the PDF.js bundle.
Add corresponding acceptance criteria — re-introduce REQ-30 through REQ-36 and mark them clearly as "Requires MuPDF engine."

Output the updated sections (don't re-output the whole plan, just the changed sections). I will merge them into cursor-plan.md myself.

---

**Cursor**

Let me read the current plan to ensure I reference the exact content that needs changing.

I've read the full plan. Here are the updated sections for the WASM bonus tier re-introduction. I'll output each changed section clearly labeled so you can merge them.

---

**Updated Section 2: Requirements** -- replace from `### Bonus` through `### Non-Functional`:

```markdown
### WebAssembly Tier (mupdf-wasm) — opt-in via engine selector
24. **Redaction annotations (rectangle-based)** — draw a rectangle over content to redact it. Requires MuPDF engine.
25. **Redaction annotations (text-highlighter-based)** — select text and mark it for redaction. Requires MuPDF engine.
26. **Text annotations** — add free-text annotations to pages. Requires MuPDF engine.
27. **Signature form fields** — render and interact with signature fields in a PDF form. Requires MuPDF engine.
28. **Widget annotations** — render and interact with generic widget annotations (checkboxes, text inputs, etc.). Requires MuPDF engine.
29. **Bookmarks read** — parse and display the PDF's bookmark/outline tree. Requires MuPDF engine.
30. **Bookmarks write** — create/edit/delete bookmarks and persist them in the PDF. Requires MuPDF engine.
31. **Engine selector** — UI toggle on the record detail view (before opening a PDF) that lets the user choose between PDF.js (default, fast, linearized) and MuPDF (WASM, annotations/bookmarks).

### Non-Functional / Deliverable Requirements
32. **No backend** — everything runs client-side; PDFs are loaded from local files or bundled assets.
33. **Stack constraint** — TypeScript, React, Vite, PDF.js (default), pdf-lib (editing/export), mupdf-wasm (WASM tier).
34. **Architecture document** — one component diagram, state management approach, key tradeoffs, "if I had 1 more day" roadmap.
35. **Cursor AI usage log** — Plan mode output, exported transcript, notes on AI-output changes, correctness validation notes.
```

---

**Updated Section 3.4** -- replace the full `### 3.4` paragraph:

```markdown
### 3.4 Why PDF.js as the default renderer, with mupdf-wasm as a secondary engine?
PDF.js is the default engine because it works without WASM compilation, handles progressive/linearized loading natively via `PDFDocumentLoadingTask` with HTTP Range requests, and renders to a `<canvas>` with text and annotation layers already built. It requires zero special server headers (no COOP/COEP) and adds ~400 KB to the bundle. mupdf-wasm is offered as an opt-in secondary engine that the user activates via an engine selector toggle before opening a PDF. When MuPDF is active, the app gains access to annotation APIs (redaction, text annotations, signature fields, widget annotations) and read/write bookmark support that PDF.js cannot provide. The tradeoff is a ~10 MB WASM binary, no linearized loading (MuPDF must load the full blob before rendering), and a requirement for `SharedArrayBuffer` which mandates `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. The dual-engine architecture is mediated by the `PdfEngine` interface: all viewer/editor components program against the interface, and `PdfWorkspace` instantiates either `PdfJsEngine` or `MuPdfEngine` based on `enginePreference` in state.
```

---

**Updated Section 4: Component Tree** -- replace the `[bonus]` components section (lines 161-168) and update the header count:

```markdown
22 core components + 4 WASM-tier components = 26 total.
```

And replace the three `[bonus]` component entries with:

```markdown
    - **`<EngineSelector>`** — owns: nothing | props: `currentEngine`, `onChangeEngine`
      Toggle control on the record detail view that switches between 'pdfjs' (default) and 'mupdf'. Shown before a PDF is opened. Displays a warning when MuPDF is selected: "WASM engine: ~10 MB download, no progressive loading."

    - **`<BookmarkPanel>`** — owns: `editingBookmarkId: string | null` | reads: `ViewerContext` (engineName, outline)
      Collapsible right sidebar that displays the PDF's bookmark tree. Read-only under PDF.js (via `getOutline()`). Add/edit/delete under MuPDF. Disabled state with tooltip when PDF.js is active and write is attempted.

    - **`<AnnotationToolbar>`** — owns: `activeTool: AnnotationTool` | reads: `ViewerContext` (engineName)
      Floating secondary toolbar with tool buttons for text annotation, rectangle redaction, and text-highlight redaction. All buttons render disabled with a "Requires MuPDF engine" tooltip when `engineName === 'pdfjs'`. Active only when MuPDF is the current engine.

    - **`<RedactionOverlay>`** — owns: `rects: Rect[]`, `isDrawing: boolean` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles or highlight text selections. Only mounted when MuPDF is active and an annotation tool is selected.
```

---

**Updated Section 5: Application State** -- replace the Supporting Types block (remove `// [bonus]` comments):

```typescript
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFDocument } from 'pdf-lib';

export interface PageDescriptor {
  id: string;                          // stable UUID for React keys + drag tracking
  sourceIndex: number;                 // 0-indexed page in the current PDFDocument/PDFDocumentProxy
  rotation: 0 | 90 | 180 | 270;       // cumulative rotation applied in editor
}

export type FitMode    = 'none' | 'width' | 'page';
export type ScrollMode = 'continuous' | 'single' | 'spread';
export type EnginePreference = 'pdfjs' | 'mupdf';

export type AnnotationTool = 'text' | 'redact-rect' | 'redact-highlight' | 'signature' | null;

export interface RedactionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bookmark {
  id: string;
  title: string;
  pageIndex: number;      // 0-indexed target page
  children: Bookmark[];
}
```

Replace the AppState interface (add `enginePreference`, remove `// [bonus]` comments on annotation fields):

```typescript
export interface AppState {
  // -- Document instances --
  pdfEngine: PDFDocumentProxy | null;       // PDF.js parsed document (rendering)
  documentModel: PDFDocument | null;        // pdf-lib parsed document (editing/export)
  filename: string | null;                  // display name of the open file

  // -- Engine selection --
  enginePreference: EnginePreference;       // which engine to instantiate on next document load
  activeEngineName: 'pdfjs' | 'mupdf' | null; // which engine is currently loaded (null = no doc)

  // -- Viewer --
  pageCount: number;                        // total pages in the loaded document
  currentPage: number;                      // 1-indexed visible page
  zoomLevel: number;                        // scale factor: 1.0 = 100%. authoritative when fitMode is 'none'
  fitMode: FitMode;                         // 'none': manual zoom; 'width'/'page': computed by PageViewport
  scrollMode: ScrollMode;                   // layout strategy for PageViewport

  // -- Editor --
  isEditorMode: boolean;                    // true = show EditorPanel, false = show PageViewport
  pages: PageDescriptor[];                  // ordered page list; source of truth for page order/rotation
  selectedPages: Set<number>;               // indices into pages[] currently selected in editor
  undoStack: ReadonlyArray<PageDescriptor[]>; // previous page-list snapshots (most recent last)
  redoStack: ReadonlyArray<PageDescriptor[]>; // undone snapshots available for redo

  // -- Loading / Error --
  isLoading: boolean;                       // true while PDF bytes are being fetched/parsed
  loadingProgress: number;                  // 0..1 fraction; updated by PDF.js onProgress callback
  error: string | null;                     // non-null = display error banner

  // -- Annotations (active when MuPDF engine is loaded) --
  activeAnnotationTool: AnnotationTool;              // currently selected annotation tool
  redactionOverlays: Map<number, RedactionRect[]>;   // page number (1-indexed) -> rects drawn on that page
  bookmarks: Bookmark[];                             // bookmark tree (read from PDF or user-created)
}

export const initialState: AppState = {
  pdfEngine: null,
  documentModel: null,
  filename: null,

  enginePreference: 'pdfjs',
  activeEngineName: null,

  pageCount: 0,
  currentPage: 1,
  zoomLevel: 1.0,
  fitMode: 'width',
  scrollMode: 'continuous',

  isEditorMode: false,
  pages: [],
  selectedPages: new Set(),
  undoStack: [],
  redoStack: [],

  isLoading: false,
  loadingProgress: 0,
  error: null,

  activeAnnotationTool: null,
  redactionOverlays: new Map(),
  bookmarks: [],
};
```

Add to the AppAction union (replace the `// === [bonus] Annotations ===` section and add the new engine action):

```typescript
  // === Engine selection ===

  // Sets enginePreference. Only takes effect on next document load, not mid-document.
  | { type: 'SET_ENGINE_PREFERENCE'; preference: EnginePreference }  // EngineSelector

  // === Annotations (MuPDF-only; reducer no-ops if activeEngineName !== 'mupdf') ===

  | { type: 'SET_ANNOTATION_TOOL'; tool: AnnotationTool }     // AnnotationToolbar

  | { type: 'ADD_REDACTION'; pageNumber: number; rect: RedactionRect }    // RedactionOverlay
  | { type: 'REMOVE_REDACTION'; pageNumber: number; rectIndex: number }   // RedactionOverlay
  | { type: 'APPLY_REDACTIONS' }                                           // AnnotationToolbar (burns redactions into PDF)

  | { type: 'SET_BOOKMARKS'; bookmarks: Bookmark[] }                       // PdfWorkspace (on load, from getOutline)
  | { type: 'ADD_BOOKMARK'; bookmark: Bookmark }                          // BookmarkPanel
  | { type: 'UPDATE_BOOKMARK'; id: string; updates: Partial<Pick<Bookmark, 'title' | 'pageIndex'>> }
                                                                          // BookmarkPanel
  | { type: 'REMOVE_BOOKMARK'; id: string };                              // BookmarkPanel
```

Update the note at the bottom of Section 5:

```markdown
- **25 core actions + 8 annotation/bookmark actions = 33 total.** Annotation/bookmark actions are guarded: the reducer checks `activeEngineName === 'mupdf'` and no-ops otherwise.
```

---

**Updated Section 6: PdfEngine Interface** -- add this note block immediately after the interface code block:

```markdown
**Adapter implementations:**

Two classes implement `PdfEngine`:

- **`PdfJsEngine`** (default) — wraps `pdfjs-dist`. Supports linearized loading via Range requests. Does NOT support annotation creation/editing or bookmark writing. `getOutline()` is read-only.
- **`MuPdfEngine`** (WASM, opt-in) — wraps `mupdf-wasm`. Loaded lazily via dynamic `import()` so the ~10 MB WASM binary is never fetched when the user stays on PDF.js. Supports annotation creation (text, redaction, signature, widget) and bookmark read/write via MuPDF's C API exposed through the WASM bindings. Does NOT support linearized loading — the full document must be fetched before rendering begins. Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for `SharedArrayBuffer` access.

The `PdfWorkspace` component reads `enginePreference` from state and instantiates the corresponding adapter. Engine selection is locked once a document is loaded — changing engines requires closing and re-opening the document.
```

---

**Updated Section 8: Build Phases** -- replace Phase 21 and 22 with the expanded sequence:

```markdown
### Phase 21: Architecture Document
**Goal:** Write the required architecture doc with component diagram, state management explanation, tradeoffs, and roadmap.
**Depends on:** Phase 20
**Files created/modified:**
- `docs/architecture.md`

**Acceptance:** Document contains: one Mermaid component diagram showing both engine paths, state management section (Context + useReducer rationale), key tradeoffs section (including PDF.js vs MuPDF dual-engine rationale), and an "if I had 1 more day" roadmap.

---

### Phase 22: MuPDF Engine Adapter
**Goal:** Implement `MuPdfEngine` class implementing the `PdfEngine` interface, with lazy WASM loading and an engine selector toggle in the records UI.
**Depends on:** Phase 5 (PdfJsEngine complete), Phase 8 (Records UI exists)
**Files created/modified:**
- `src/engine/MuPdfEngine.ts` — full `PdfEngine` implementation wrapping `mupdf-wasm`
- `src/engine/loadMuPdf.ts` — lazy-loader: `export async function loadMuPdf() { return import('mupdf-wasm'); }` so the WASM binary is code-split
- `src/components/RecordDetailView/EngineSelector.tsx`, `EngineSelector.module.css` — toggle between 'pdfjs' and 'mupdf' with warning text
- `src/context/appReducer.ts` — add `SET_ENGINE_PREFERENCE` action handler
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — branch engine instantiation on `enginePreference`
- `vite.config.ts` — add COOP/COEP headers for dev server: `server.headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }`
- `package.json` — add `mupdf-wasm` dependency

**Acceptance:** Select MuPDF in the engine selector, open a PDF. The document renders via MuPDF (verify by checking `activeEngineName` in React DevTools or a debug label in the toolbar). Switch back to PDF.js, re-open the same PDF — it renders via PDF.js. The WASM binary is only fetched when MuPDF is selected (verify in Network tab: no `.wasm` request when PDF.js is active).

---

### Phase 23: Annotations (Text + Redaction)
**Goal:** Implement text annotations and rectangle redaction using MuPDF's annotation API. Build the AnnotationToolbar and RedactionOverlay UI.
**Depends on:** Phase 22
**Files created/modified:**
- `src/components/AnnotationToolbar/AnnotationToolbar.tsx`, `AnnotationToolbar.module.css`
- `src/components/PageViewport/RedactionOverlay.tsx`, `RedactionOverlay.module.css`
- `src/engine/MuPdfEngine.ts` — add `addTextAnnotation(pageIndex, x, y, text)`, `addRedaction(pageIndex, rect)`, `applyRedactions()` methods (MuPDF-specific, not on the PdfEngine interface)
- `src/hooks/useAnnotations.ts` — hook that bridges AnnotationToolbar state with MuPdfEngine methods
- `src/context/appReducer.ts` — add `APPLY_REDACTIONS` action handler
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — conditionally show AnnotationToolbar toggle when MuPDF is active

**Acceptance:** With MuPDF active: click the text annotation tool, click on a page, type "Hello" — a text annotation appears. Click the rectangle redaction tool, draw a rectangle — a red overlay appears. Click "Apply Redactions" — the overlay turns black, and saving the PDF produces a file where the redacted text is irrecoverably removed (verify by searching the saved PDF). With PDF.js active: annotation toolbar buttons are visible but disabled with a tooltip "Requires MuPDF engine."

---

### Phase 24: Bookmarks Read/Write Panel
**Goal:** Build the BookmarkPanel as a collapsible right sidebar with read support on both engines and write support on MuPDF.
**Depends on:** Phase 22
**Files created/modified:**
- `src/components/BookmarkPanel/BookmarkPanel.tsx`, `BookmarkPanel.module.css`
- `src/components/BookmarkPanel/BookmarkNode.tsx` — recursive tree node component
- `src/engine/MuPdfEngine.ts` — add `addBookmark(title, pageIndex)`, `removeBookmark(id)`, `updateBookmark(id, title, pageIndex)` methods
- `src/hooks/useBookmarks.ts` — hook that loads bookmarks on document open (via `getOutline()`) and bridges write operations to MuPdfEngine
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — add BookmarkPanel to layout, dispatch `SET_BOOKMARKS` after load

**Acceptance:** Open a PDF with an existing outline/bookmark tree. The BookmarkPanel shows the tree. Click a bookmark — the viewer navigates to the target page. With MuPDF: click "Add Bookmark" — a new bookmark appears for the current page. Edit its title. Save the PDF, re-open — the bookmark persists. With PDF.js: bookmarks are read-only; "Add" button is disabled with tooltip.

---

### Phase 25: Cursor AI Usage Log
**Goal:** Compile the Cursor usage log.
**Depends on:** Phase 24
**Files created/modified:**
- `docs/cursor-log.md`

**Acceptance:** Document includes: exported plan mode conversation, links to transcripts, change notes table, and validation notes.
```

---

**Updated Section 9: Risks and Mitigations** -- add three new entries after Phase 21's risk:

```markdown
### Phase 22: MuPDF Engine Adapter
**Risk:** MuPDF's WASM module requires `SharedArrayBuffer`, which browsers only expose when the page is served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. Without these, `new SharedArrayBuffer()` throws `TypeError`, and MuPDF fails to initialize — but the error surfaces deep inside the WASM glue code as an opaque "memory allocation failed" message, not as a clear COOP/COEP error.
**Detection:** Select MuPDF engine, open a PDF. If the console shows `TypeError: SharedArrayBuffer is not defined` or `RuntimeError: memory access out of bounds`, the headers are missing.
**Mitigation:** Configure Vite's dev server to send both headers: `server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } }` in `vite.config.ts`. Add a runtime check in `MuPdfEngine.loadFromBuffer`: test `typeof SharedArrayBuffer !== 'undefined'` before initializing, and throw a clear `PdfEngineError('LOAD_FAILED', 'MuPDF requires COOP/COEP headers for SharedArrayBuffer. See README.')` if missing. Note: these headers break cross-origin resources (e.g. Google Fonts via CDN) — verify no external resources are loaded, or add `crossorigin` attributes where needed.

### Phase 23: Annotations (Text + Redaction)
**Risk:** MuPDF's annotation API operates in WASM memory on the C-side document, but our rendering pipeline re-renders pages via `renderPage()` which may cache the previous rasterization. After adding a text annotation or applying a redaction, the canvas shows the old page without the annotation because MuPDF's internal render cache was not invalidated.
**Detection:** Add a text annotation, then look at the canvas. If the annotation text is not visible on the rendered page, the cache is stale.
**Mitigation:** After any annotation mutation, call `renderPage()` again with a fresh `AbortController` signal. Ensure the `MuPdfEngine.renderPage` implementation does not cache rasterized output — it should re-rasterize from the MuPDF document object on every call. If MuPDF does cache internally, call the WASM-side cache invalidation function (e.g., dropping and re-creating the display list for that page) before rendering.

### Phase 24: Bookmarks Read/Write Panel
**Risk:** MuPDF's bookmark/outline API exposes a flat or nested C struct, and mapping it to/from our `Bookmark` TypeScript interface requires careful index management. Adding a bookmark at the WASM level then reading the outline back may produce a different tree structure than expected if nested bookmarks are not handled correctly (e.g., a child bookmark appears as a root sibling).
**Detection:** Add a bookmark, save, re-open. If the bookmark tree in the panel doesn't match what was created (wrong nesting, missing children, duplicate entries), the mapping is incorrect.
**Mitigation:** Write the bookmark read/write integration against MuPDF's outline API incrementally: first verify `getOutline()` reads an existing outline correctly, then add one flat bookmark and verify round-trip, then test nested bookmarks. Keep the `Bookmark` interface flat enough that the mapping is straightforward (parent pointer via index rather than deep nesting).
```

Also update the existing Phase 22 risk entry label to Phase 25:

```markdown
### Phase 25: Cursor AI Usage Log
**Risk:** Cursor's chat export truncates long conversations or omits tool-use blocks, making the log incomplete — the evaluator sees "you used AI" but can't assess how or what you changed.
**Detection:** Export the transcript and search for the planning conversation from Prompt 1. If it's missing or truncated, the export is incomplete.
**Mitigation:** Supplement the export with manual notes written during each phase: a 2-3 sentence entry per phase noting "AI suggested X, I kept/changed Y, validated by Z." Keep these notes in `docs/cursor-log.md` incrementally.
```

---

**Updated Section 10: Acceptance Criteria** -- replace the `### A.5` header to remove the "Bonus" label and make them first-class:

```markdown
### A.5 — WebAssembly Tier (MuPDF Engine)

- [ ] **REQ-30: Redaction — rectangle** — *Requires MuPDF engine.* Select the rectangle redaction tool. Draw a rectangle over sensitive text. The area is visually blacked out. Click "Apply Redactions." Save the PDF — the redacted content is irrecoverably removed from the file (verify by searching for the original text in the saved file).
- [ ] **REQ-31: Redaction — text highlight** — *Requires MuPDF engine.* Select the text-highlighter redaction tool. Select a word by clicking and dragging. The word is highlighted for redaction. Apply redactions and save — the word is gone.
- [ ] **REQ-32: Text annotations** — *Requires MuPDF engine.* Select the text annotation tool. Click on a page and type a note. The annotation appears as a positioned text box. Save and reopen — the annotation persists.
- [ ] **REQ-33: Signature form fields** — *Requires MuPDF engine.* Open a PDF that contains a signature form field. The field is rendered as an interactive widget. Click it — a signature input UI appears.
- [ ] **REQ-34: Widget annotations** — *Requires MuPDF engine.* Open a PDF with form fields (checkboxes, text inputs). The widgets are interactive — checkboxes toggle, text inputs accept typing. Save — form state persists.
- [ ] **REQ-35: Bookmarks — read** — *Requires MuPDF engine.* Open a PDF that contains an outline/bookmark tree. A bookmark panel displays the tree. Click a bookmark — the viewer navigates to the target page.
- [ ] **REQ-36: Bookmarks — write** — *Requires MuPDF engine.* Add a new bookmark titled "My Note" pointing to page 5. Save the PDF, reopen it — the bookmark appears in the outline tree.
- [ ] **REQ-37: Engine selector** — On the record detail view, toggle the engine selector to MuPDF. A warning displays ("~10 MB WASM download, no progressive loading"). Open a PDF — it loads via MuPDF (verify via toolbar engine indicator). Toggle back to PDF.js, re-open — it loads via PDF.js. The WASM binary is only fetched on first MuPDF selection (verify Network tab).
- [ ] **REQ-38: Annotation tools disabled under PDF.js** — With PDF.js active, the annotation toolbar buttons are visible but disabled. Hovering shows a tooltip: "Requires MuPDF engine." No crash or error when clicking a disabled button.
```

And renumber the remaining sections accordingly:

```markdown
### B — Architecture & Design Document

- [ ] **REQ-39: Component diagram** — `docs/architecture.md` contains a Mermaid (or image) component diagram showing all major components including the dual-engine path.
- [ ] **REQ-40: State management description** — The document explains Context + useReducer, the two context split (Viewer/Editor), and why external libraries were not used.
- [ ] **REQ-41: Key tradeoffs** — At least three tradeoff decisions are discussed with alternatives considered, including the dual-engine (PDF.js default / MuPDF opt-in) rationale.
- [ ] **REQ-42: "If I had 1 more day" roadmap** — A concrete list of next steps, not vague aspirations.

### C — Cursor AI Usage Log

- [ ] **REQ-43: Plan mode output** — `docs/cursor-log.md` includes the planning conversation or a summary of key decisions made during planning.
- [ ] **REQ-44: Exported transcript** — At least one full Composer session transcript is included or linked.
- [ ] **REQ-45: Change notes** — A table or list documenting at least 5 instances where AI output was modified, with the original suggestion, the change made, and the reason.
- [ ] **REQ-46: Validation notes** — For each major feature, a sentence describing how correctness was verified.
```

---

That covers every changed section. Summary of structural changes:
- **Requirements**: 35 total (was 34), bonus items are now active with "Requires MuPDF engine" annotation, plus new REQ-31 for engine selector
- **Build phases**: 25 total (was 22) -- new Phase 22 (MuPDF adapter), Phase 23 (Annotations), Phase 24 (Bookmarks), old Phase 22 (Cursor log) renumbered to Phase 25
- **AppState**: 2 new fields (`enginePreference`, `activeEngineName`), all `[bonus]` markers removed
- **AppAction**: 3 new actions (`SET_ENGINE_PREFERENCE`, `APPLY_REDACTIONS`, `SET_BOOKMARKS`), 33 total (was 29)
- **Acceptance criteria**: 46 total (was 44), 2 new WASM-specific criteria (REQ-37 engine selector, REQ-38 disabled state)
- **Risks**: 3 new entries for Phases 22-24

---

**User**

I need to correct a significant scope error in the plan. The spec says the viewer is "integrated with a client application" — a records management UI. I interpreted that as "we should build the records management UI." That's wrong. The deliverable is the viewer SDK, not the host application that embeds it. The records management UI in the demo video is an example of how an SDK like ours gets embedded by a customer — it is not part of what we ship.
Update the plan to remove all records-management-UI scope. Specifically:

Delete requirements 1, 2, and 3 (Records list view, Record detail view, PDF file open via record). Renumber the remaining requirements.
Replace them with a single new requirement: "Entry screen — when no document is loaded, the app shows a centered FilePicker component with: a 'Choose PDF' button that opens the native file picker, a drag-and-drop drop zone, and a 'Try a sample' link that loads a bundled sample PDF from /public/samples/."
In the component tree, delete: <RecordListView>, <RecordCard>, <RecordDetailView>, <FileCard>, <FilePickerButton>. Replace them with a single <FilePicker> component owned by <App>.
Delete Phase 8 ("Host App Shell — Records UI") entirely. Replace it with a much smaller phase: "Phase 8: File Picker Entry Screen — build the <FilePicker> component with file input, drag-and-drop, and sample loader links. About 1 hour of work."
Update Phase 9 — <PdfWorkspace> mounts when a file is selected from <FilePicker>, not when a record is opened.
Update REQ-1 and REQ-2 to remove references to records and file cards. New REQ-1: "Open a sample PDF — click 'Try a sample' on the entry screen, the PDF renders in the viewer within 2 seconds." New REQ-2: "Open a local PDF — click the file picker button or drag-drop a file, the PDF loads."
Delete src/data/records.ts from the file list. Delete the <RecordListView> and <RecordDetailView> directories.

Output the updated sections.

---

**Cursor**

Here are all the updated sections. I'll only output what changed.

---

**Updated Section 1: Project Overview** -- replace the full paragraph:

```markdown
## 1. Project Overview

We are building a client-side-only (no backend) web application in TypeScript + React + Vite that serves as a PDF viewer SDK. The app opens with a file picker entry screen where the user can choose a local PDF, drag-and-drop a file, or load a bundled sample. Once a file is selected, an inline PDF viewer/editor takes over the full viewport. The viewer supports rendering, navigation, zoom, scroll modes, a document editor mode (rotate, reorder, import/merge, extract, export pages), printing, and local save. An opt-in WASM tier (via `mupdf-wasm`) adds redaction annotations, text annotations, signature form fields, widget annotations, and bookmark read/write. Deliverables also include an architecture doc and a Cursor AI usage log.
```

---

**Updated Section 2: Requirements** -- replace from the start through `### PDF Viewing & Navigation`:

```markdown
## 2. Requirements

### Entry Screen
1. **File picker entry screen** — when no document is loaded, the app shows a centered `<FilePicker>` component with: a "Choose PDF" button that opens the native file picker, a drag-and-drop drop zone that accepts `.pdf` files, and a "Try a sample" link that loads a bundled sample PDF from `/public/samples/`.

### PDF Viewing & Navigation
2. **High-fidelity PDF rendering** in the browser (baseline: PDF.js; WASM tier: mupdf-wasm).
3. **Zoom in / zoom out** controls.
4. **Fit-to-width** zoom mode.
5. **Fit-to-viewport** (fit-to-page) zoom mode.
6. **Continuous scroll mode** — all pages in a single scrollable column.
7. **Single-page scroll mode** — one page at a time, discrete navigation.
8. **Two-page spread mode** — two facing pages side-by-side, discrete navigation.
9. **Page navigation** — jump to a specific page by number, previous/next page controls.
10. **Linearization / progressive loading** — display the first page(s) of a large PDF before the entire file is downloaded. Real implementation using Vite dev server's HTTP Range request support + PDF.js's `getDocument({ url, rangeChunkSize, disableAutoFetch: true, disableStream: false })`.

### PDF Editing (Document Editor)
11. **Document editor mode** — a distinct mode with its own toolbar, separate from the viewing mode.
12. **Page rotation** — rotate individual pages (90/180/270 degrees).
13. **Page reordering** — drag-and-drop or similar UI to change page order.
14. **Page import / document merge** — import pages from another PDF into the current document.
15. **Page extraction** — extract selected pages into a new PDF.
16. **Export edited PDF** — save the result of editing operations as a new/modified PDF file.

### Printing
17. **Print action** — trigger browser print for the current PDF (browser-native print dialog is acceptable).

### Export & Conversion
18. **Export with selective pages** — export a PDF keeping only specific user-selected pages.
19. **Save PDF to local filesystem** — download the (potentially edited) PDF to the user's machine.

### PDF Source
20. **Bundled sample PDFs** — 2-3 sample PDFs as static assets in `public/samples/`.
21. **Local file picker + drag-and-drop** — open local PDFs via file input or drag-and-drop on the entry screen.

### WebAssembly Tier (mupdf-wasm) — opt-in via engine selector
22. **Redaction annotations (rectangle-based)** — draw a rectangle over content to redact it. Requires MuPDF engine.
23. **Redaction annotations (text-highlighter-based)** — select text and mark it for redaction. Requires MuPDF engine.
24. **Text annotations** — add free-text annotations to pages. Requires MuPDF engine.
25. **Signature form fields** — render and interact with signature fields in a PDF form. Requires MuPDF engine.
26. **Widget annotations** — render and interact with generic widget annotations (checkboxes, text inputs, etc.). Requires MuPDF engine.
27. **Bookmarks read** — parse and display the PDF's bookmark/outline tree. Requires MuPDF engine.
28. **Bookmarks write** — create/edit/delete bookmarks and persist them in the PDF. Requires MuPDF engine.
29. **Engine selector** — UI toggle on the entry screen that lets the user choose between PDF.js (default, fast, linearized) and MuPDF (WASM, annotations/bookmarks).

### Non-Functional / Deliverable Requirements
30. **No backend** — everything runs client-side; PDFs are loaded from local files or bundled assets.
31. **Stack constraint** — TypeScript, React, Vite, PDF.js (default), pdf-lib (editing/export), mupdf-wasm (WASM tier).
32. **Architecture document** — one component diagram, state management approach, key tradeoffs, "if I had 1 more day" roadmap.
33. **Cursor AI usage log** — Plan mode output, exported transcript, notes on AI-output changes, correctness validation notes.
```

---

**Updated Section 4: Component Tree** -- replace the full section:

```markdown
## 4. Component Tree

18 core components + 4 WASM-tier components = 22 total.

- **`<App>`** — owns: `currentView: 'picker' | 'viewer'`, `selectedFile: { source: string | File; name: string } | null` | props: none
  Routes between the file picker entry screen and the PDF workspace. Holds the file selection state.

  - **`<FilePicker>`** — owns: `isDragOver: boolean` | props: `onFileSelected: (file: File) => void`, `onSampleSelected: (url: string, name: string) => void`, `enginePreference`, `onChangeEngine`
    Full-viewport entry screen shown when no document is loaded. Contains a "Choose PDF" button wired to a hidden `<input type="file" accept=".pdf">`, a drag-and-drop zone with visual feedback, a "Try a sample" link that loads a bundled PDF, and an `<EngineSelector>` toggle.

    - **`<EngineSelector>`** — owns: nothing | props: `currentEngine`, `onChangeEngine`
      Toggle control that switches between 'pdfjs' (default) and 'mupdf'. Displays a warning when MuPDF is selected: "WASM engine: ~10 MB download, no progressive loading."

  - **`<PdfWorkspace>`** — owns: `viewerState` (via `useReducer`+`ViewerContext`), `editorState` (via `useReducer`+`EditorContext`), `activeMode: 'viewer' | 'editor'`, `pdfEngine: PdfEngine`, `documentModel: DocumentModel` | props: `fileSource: string | File`, `enginePreference`
    Top-level PDF container. Initializes the selected engine and pdf-lib document instances, provides both contexts to all children, and switches between viewer and editor layouts. A "Close" button returns to `<FilePicker>`.

    - **`<ViewerToolbar>`** — owns: nothing | reads: `ViewerContext` | props: `activeMode`, `onToggleMode`, `onPrint`, `onClose`
      Horizontal bar at the top of the workspace; composes the control clusters below and the mode/print/close actions.

      - **`<ZoomControls>`** — owns: nothing | reads+dispatches: `ViewerContext`
        Three buttons (zoom-in, zoom-out, fit-dropdown) that dispatch `SET_ZOOM` / `SET_FIT_MODE` actions to `ViewerContext`.

      - **`<PageNavigator>`** — owns: `inputValue: string` (local controlled input) | reads+dispatches: `ViewerContext`
        Shows "Page N of M" with an editable input and prev/next arrows; dispatches `SET_CURRENT_PAGE`.

      - **`<ScrollModeSelector>`** — owns: nothing | reads+dispatches: `ViewerContext`
        Three-way toggle (continuous / single-page / two-page spread) that dispatches `SET_SCROLL_MODE`.

    - **`<ThumbnailSidebar>`** — owns: `thumbnailRefs: Map<number, HTMLCanvasElement>` | reads: `ViewerContext` (pageCount, currentPage)
      Collapsible left sidebar listing thumbnail previews of every page; clicking a thumbnail navigates.

      - **`<ThumbnailPage>`** — owns: `canvasRef` | props: `pageNumber`, `isActive`, `onClick`, `pdfEngine`
        Renders a single low-resolution thumbnail into a small canvas.

    - **`<PageViewport>`** — owns: `scrollContainerRef`, `visiblePages: Set<number>` (via IntersectionObserver) | reads: `ViewerContext` (scrollMode, zoom, fitMode)
      The main scrollable area. In continuous mode, renders all `<PageCanvas>` components in a column. In single-page mode, renders one. In spread mode, renders pairs. Dispatches `SET_CURRENT_PAGE` as the user scrolls.

      - **`<PageCanvas>`** — owns: `canvasRef`, `textLayerRef`, `renderTaskRef` | props: `pageNumber`, `scale`, `rotation`; reads: `ViewerContext` (via context for pdfEngine)
        Renders one PDF page: a `<canvas>` for the painted content and an absolutely-positioned `<div>` for the selectable text layer. Cancels and re-renders when scale/rotation/page changes.

    - **`<EditorPanel>`** — owns: nothing | reads: `EditorContext` | visible only when `activeMode === 'editor'`
      Replaces the `PageViewport` in editor mode; contains the editor toolbar and the draggable page grid.

      - **`<EditorToolbar>`** — owns: nothing | reads+dispatches: `EditorContext`
        Action bar with buttons for Rotate CW, Rotate CCW, Delete Page, Import, Extract, and Export; each dispatches to `EditorContext` or opens a dialog.

      - **`<PageGrid>`** — owns: `dragState: { sourceIndex, overIndex } | null` | reads: `EditorContext` (pageList)
        Displays all pages as a reorderable grid; handles drag-and-drop via pointer events and dispatches `REORDER_PAGES` on drop.

        - **`<DraggablePageCard>`** — owns: nothing | props: `page: PageDescriptor`, `index`, `isSelected`, `onSelect`, `onDragStart`, `onDragOver`, `onDrop`
          A single card in the editor grid showing a thumbnail, page number, rotation badge, and selection checkbox.

      - **`<ImportDialog>`** — owns: `importedDoc: PDFDocument | null`, `selectedPages: Set<number>` | props: `isOpen`, `onClose`, `onImport: (pages: number[]) => void`
        Modal dialog: user picks a second PDF via file input, sees its page thumbnails, selects which pages to merge, and confirms.

    - **`<PrintButton>`** — owns: nothing | props: `pdfEngine`
      Triggers printing by rendering all pages into a hidden iframe and calling `iframe.contentWindow.print()`.

    - **`<SaveButton>`** — owns: `isSaving: boolean` | reads: `EditorContext` (documentModel)
      Serializes the current `documentModel` to bytes via `pdfDocument.save()` and triggers a browser download.

    - **`<BookmarkPanel>`** — owns: `editingBookmarkId: string | null` | reads: `ViewerContext` (engineName, outline)
      Collapsible right sidebar that displays the PDF's bookmark tree. Read-only under PDF.js. Add/edit/delete under MuPDF. Disabled state with tooltip when PDF.js is active and write is attempted.

    - **`<AnnotationToolbar>`** — owns: `activeTool: AnnotationTool` | reads: `ViewerContext` (engineName)
      Floating secondary toolbar with tool buttons for text annotation, rectangle redaction, and text-highlight redaction. All buttons render disabled with a "Requires MuPDF engine" tooltip when `engineName === 'pdfjs'`.

    - **`<RedactionOverlay>`** — owns: `rects: Rect[]`, `isDrawing: boolean` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles or highlight text selections. Only mounted when MuPDF is active and an annotation tool is selected.

**Context provider boundaries:**
- `ViewerContext` is provided by `<PdfWorkspace>` and consumed by everything inside it that reads/dispatches viewer state (zoom, page, scroll mode).
- `EditorContext` is provided by `<PdfWorkspace>` and consumed only by `<EditorPanel>` and its children plus `<SaveButton>`.
- `<App>` manages only view routing (`'picker' | 'viewer'`) and file selection. No context crosses this boundary.
```

---

**Updated Phase 8** -- replace the full phase:

```markdown
### Phase 8: File Picker Entry Screen
**Goal:** Build the `<FilePicker>` component with file input button, drag-and-drop zone, sample loader links, and engine selector.
**Depends on:** Phase 3
**Files created/modified:**
- `src/components/FilePicker/FilePicker.tsx`, `FilePicker.module.css`
- `src/components/FilePicker/EngineSelector.tsx`, `EngineSelector.module.css`
- `src/App.tsx`, `src/App.module.css` — wire up `currentView` state and file selection

**Acceptance:** App launches to a centered file picker. "Choose PDF" button opens a native file dialog filtered to `.pdf`. Dragging a PDF over the drop zone highlights it; dropping loads the file. "Try a sample" link loads `sample-basic.pdf`. Engine selector toggles between PDF.js and MuPDF. After any file selection, `onFileSelected` / `onSampleSelected` fires (logs to console — no viewer yet).
```

---

**Updated Phase 9** -- replace the full phase:

```markdown
### Phase 9: PdfWorkspace + Single-Page Rendering
**Goal:** Build `PdfWorkspace` and `PageCanvas` to render a single PDF page on screen.
**Depends on:** Phase 5, Phase 8
**Files created/modified:**
- `src/components/PdfWorkspace/PdfWorkspace.tsx`, `PdfWorkspace.module.css`
- `src/components/PageViewport/PageCanvas.tsx`, `PageCanvas.module.css`
- `src/App.tsx` — mount `PdfWorkspace` when a file is selected from `FilePicker`; show a "Close" button that returns to the picker

**Acceptance:** Selecting a PDF from the file picker (via button, drag-drop, or sample link) transitions to `PdfWorkspace`, which loads the file via `PdfJsEngine`, renders page 1 into a canvas, and displays it. A "Close" button in the toolbar returns to the file picker entry screen.
```

---

**Updated Phase 22** -- replace the file list and acceptance (remove EngineSelector from here since it's now in Phase 8, and remove RecordDetailView reference):

```markdown
### Phase 22: MuPDF Engine Adapter
**Goal:** Implement `MuPdfEngine` class implementing the `PdfEngine` interface, with lazy WASM loading. The engine selector toggle was already built in Phase 8.
**Depends on:** Phase 5 (PdfJsEngine complete), Phase 8 (FilePicker with EngineSelector exists)
**Files created/modified:**
- `src/engine/MuPdfEngine.ts` — full `PdfEngine` implementation wrapping `mupdf-wasm`
- `src/engine/loadMuPdf.ts` — lazy-loader: `export async function loadMuPdf() { return import('mupdf-wasm'); }` so the WASM binary is code-split
- `src/context/appReducer.ts` — add `SET_ENGINE_PREFERENCE` action handler
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — branch engine instantiation on `enginePreference`
- `vite.config.ts` — add COOP/COEP headers for dev server: `server.headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }`
- `package.json` — add `mupdf-wasm` dependency

**Acceptance:** Select MuPDF in the engine selector on the entry screen, open a PDF. The document renders via MuPDF (verify by checking `activeEngineName` in React DevTools or a debug label in the toolbar). Switch back to PDF.js, re-open the same PDF — it renders via PDF.js. The WASM binary is only fetched when MuPDF is selected (verify in Network tab: no `.wasm` request when PDF.js is active).
```

---

**Updated Section 9 Phase 8 risk** -- replace the old Phase 8 risk:

```markdown
### Phase 8: File Picker Entry Screen
**Risk:** The drag-and-drop zone's `dragenter`/`dragleave` events fire on child elements inside the drop zone, causing the highlight state to flicker rapidly as the cursor moves over inner text/icons — the `isDragOver` state toggles on and off dozens of times per second.
**Detection:** Drag a PDF over the entry screen. If the drop zone border flickers between highlighted and un-highlighted as the cursor moves, the event bubbling is unhandled.
**Mitigation:** Use a `dragEnterCount` ref: increment on `dragenter`, decrement on `dragleave`, set `isDragOver = count > 0`. Reset to 0 on `drop`. This accounts for enter/leave pairs from nested elements without relying on `e.target === e.currentTarget` checks, which fail with CSS pointer-events inheritance.
```

---

**Updated Acceptance Criteria REQ-1 and REQ-2** -- replace the first two items under `### A.1`:

```markdown
### A.1 — PDF Viewing and Navigation

- [ ] **REQ-1: Open a sample PDF** — On the entry screen, click "Try a sample." The sample PDF renders in the viewer within 2 seconds. The filename appears in the toolbar.
- [ ] **REQ-2: Open a local PDF via file picker** — On the entry screen, click "Choose PDF", select a PDF from disk. The file renders in the viewer. Alternatively, drag-and-drop a PDF onto the drop zone — same result.
- [ ] **REQ-3: High-fidelity rendering** — Open a PDF with mixed content (text, images, vector graphics, embedded fonts). Compare visually to the same file in Chrome's native PDF viewer. Text is crisp; images are not pixelated; vector lines are smooth.
```

(REQ-4 through REQ-14 remain unchanged in content, just renumbered to REQ-3 through REQ-13 if you want strict sequential numbering -- but since the existing plan already had REQ-3 at "High-fidelity rendering," the numbers align naturally with the old REQ-3 becoming the new REQ-3.)

---

**Deleted items summary:**
- `src/data/records.ts` -- removed from all file lists
- `src/components/RecordListView/` -- entire directory removed from plan
- `src/components/RecordDetailView/` -- entire directory removed from plan
- `<RecordListView>`, `<RecordCard>`, `<RecordDetailView>`, `<FileCard>`, `<FilePickerButton>` -- removed from component tree (5 components removed, 2 added: `<FilePicker>` + `<EngineSelector>`)
- Component count: 22 total (18 core + 4 WASM-tier), down from 26

---

**User**

I have detailed notes on the actual demo video's toolbar layout that I want to incorporate into the plan, because the current <ViewerToolbar> and <EditorToolbar> are too generic.
The viewer toolbar in the demo video is a single horizontal row with these exact buttons in this order:

View-mode dropdown (grid icon with chevron) — opens a dropdown with Continuous / Single Page / Two-Page Spread
Print
Download
Edit Pages (pen icon) — toggles editor mode, has an active state when editor mode is on
Refresh / reload
Upload
Vertical divider
"Page" label, prev arrow, page input, next arrow, "X / N" total
Vertical divider
Document icon (fit-to-page)
Zoom out
Zoom level readout (e.g., "100%")
Zoom in
Vertical divider
Rotate left
Rotate right

Note: there is no left thumbnail sidebar in the demo video. Remove <ThumbnailSidebar> and <ThumbnailPage> from the component tree, remove Phase 13 (Thumbnail Sidebar), and remove REQ-13. We can add a thumbnail sidebar later as an enhancement, but it's not in the demo and not required.
The editor toolbar in the demo video has these exact buttons in this order:
Scan | Import | Delete Pages | Rotate Pages Left | Rotate Pages Right | Extract Pages | Undo | Redo | Zoom Out | Zoom In | Select None | Copy Pages | Paste Pages
Update the plan as follows:

Update the <ViewerToolbar> description to enumerate the 16 buttons above.
Update the <EditorToolbar> description to enumerate the 13 buttons above.
Add new actions to the AppAction union as needed: COPY_PAGES, PASTE_PAGES. Note: "Scan" can be a no-op stub with a console log — note this in the plan as a known limitation.
The editor has its own zoom (Zoom In / Zoom Out buttons in the editor toolbar), separate from the viewer's zoom — it controls the thumbnail size in the page grid. Add editorThumbnailScale: number to the EditorContext state.
Update Phase 14 (Editor Panel) to enumerate all 13 editor toolbar buttons. Update Phase 15 (Editor Operations) to wire all of them, including Copy/Paste Pages and Select None.
Remove Phase 13 (Thumbnail Sidebar) entirely. Renumber subsequent phases. Update phase dependencies that referenced Phase 13.

Output the updated component descriptions, the updated phase definitions for Phases 14 and 15, and the new actions added to AppAction.

---

**Cursor**

Here are all the updated sections.

---

**Updated Component Tree** -- replace `<ViewerToolbar>` and its children, remove `<ThumbnailSidebar>` and `<ThumbnailPage>`, update `<EditorToolbar>`:

```markdown
## 4. Component Tree

16 core components + 4 WASM-tier components = 20 total.

- **`<App>`** — owns: `currentView: 'picker' | 'viewer'`, `selectedFile: { source: string | File; name: string } | null` | props: none
  Routes between the file picker entry screen and the PDF workspace. Holds the file selection state.

  - **`<FilePicker>`** — owns: `isDragOver: boolean` | props: `onFileSelected: (file: File) => void`, `onSampleSelected: (url: string, name: string) => void`, `enginePreference`, `onChangeEngine`
    Full-viewport entry screen shown when no document is loaded. Contains a "Choose PDF" button wired to a hidden `<input type="file" accept=".pdf">`, a drag-and-drop zone with visual feedback, a "Try a sample" link that loads a bundled PDF, and an `<EngineSelector>` toggle.

    - **`<EngineSelector>`** — owns: nothing | props: `currentEngine`, `onChangeEngine`
      Toggle control that switches between 'pdfjs' (default) and 'mupdf'. Displays a warning when MuPDF is selected: "WASM engine: ~10 MB download, no progressive loading."

  - **`<PdfWorkspace>`** — owns: `viewerState` (via `useReducer`+`ViewerContext`), `editorState` (via `useReducer`+`EditorContext`), `activeMode: 'viewer' | 'editor'`, `pdfEngine: PdfEngine`, `documentModel: DocumentModel` | props: `fileSource: string | File`, `enginePreference`
    Top-level PDF container. Initializes the selected engine and pdf-lib document instances, provides both contexts to all children, and switches between viewer and editor layouts. A "Close" button returns to `<FilePicker>`.

    - **`<ViewerToolbar>`** — owns: nothing | reads: `ViewerContext` | props: `activeMode`, `onToggleMode`, `onPrint`, `onClose`, `onUpload`
      Single horizontal toolbar row with 16 controls in this exact order:
      1. View-mode dropdown (grid icon + chevron) — opens dropdown with Continuous / Single Page / Two-Page Spread
      2. Print button
      3. Download button (saves current PDF to local)
      4. Edit Pages button (pen icon) — toggles editor mode, has active state when `isEditorMode` is true
      5. Refresh/reload button — reloads the current PDF from source
      6. Upload button — opens file picker to load a different PDF without returning to entry screen
      7. Vertical divider
      8. "Page" label + prev arrow + page input + next arrow + "X / N" total display
      9. Vertical divider
      10. Fit-to-page button (document icon)
      11. Zoom out button
      12. Zoom level readout (e.g. "100%")
      13. Zoom in button
      14. Vertical divider
      15. Rotate left button — rotates the current page view (visual only, does not mutate the document)
      16. Rotate right button — rotates the current page view (visual only, does not mutate the document)

    - **`<PageViewport>`** — owns: `scrollContainerRef`, `visiblePages: Set<number>` (via IntersectionObserver) | reads: `ViewerContext` (scrollMode, zoom, fitMode)
      The main scrollable area. In continuous mode, renders all `<PageCanvas>` components in a column. In single-page mode, renders one. In spread mode, renders pairs. Dispatches `SET_CURRENT_PAGE` as the user scrolls.

      - **`<PageCanvas>`** — owns: `canvasRef`, `textLayerRef`, `renderTaskRef` | props: `pageNumber`, `scale`, `rotation`; reads: `ViewerContext` (via context for pdfEngine)
        Renders one PDF page: a `<canvas>` for the painted content and an absolutely-positioned `<div>` for the selectable text layer. Cancels and re-renders when scale/rotation/page changes.

    - **`<EditorPanel>`** — owns: nothing | reads: `EditorContext` | visible only when `activeMode === 'editor'`
      Replaces the `PageViewport` in editor mode; contains the editor toolbar and the draggable page grid.

      - **`<EditorToolbar>`** — owns: nothing | reads+dispatches: `EditorContext`
        Single horizontal toolbar row with 13 controls in this exact order:
        1. Scan button — **stub: logs to console, not implemented** (noted as known limitation)
        2. Import button — opens `<ImportDialog>` to merge pages from another PDF
        3. Delete Pages button — deletes selected pages
        4. Rotate Pages Left button — rotates selected pages -90 degrees
        5. Rotate Pages Right button — rotates selected pages +90 degrees
        6. Extract Pages button — extracts selected pages into a new downloaded PDF
        7. Undo button — reverts last page manipulation
        8. Redo button — re-applies undone manipulation
        9. Zoom Out button — decreases `editorThumbnailScale` (thumbnail grid size)
        10. Zoom In button — increases `editorThumbnailScale` (thumbnail grid size)
        11. Select None button — clears page selection
        12. Copy Pages button — copies selected page indices to clipboard state
        13. Paste Pages button — duplicates copied pages at the end of the document

      - **`<PageGrid>`** — owns: `dragState: { sourceIndex, overIndex } | null` | reads: `EditorContext` (pageList, editorThumbnailScale)
        Displays all pages as a reorderable grid; handles drag-and-drop via pointer events and dispatches `REORDER_PAGES` on drop. Thumbnail size is controlled by `editorThumbnailScale`.

        - **`<DraggablePageCard>`** — owns: nothing | props: `page: PageDescriptor`, `index`, `isSelected`, `onSelect`, `onDragStart`, `onDragOver`, `onDrop`, `thumbnailScale`
          A single card in the editor grid showing a thumbnail, page number, rotation badge, and selection checkbox. Size scales with `editorThumbnailScale`.

      - **`<ImportDialog>`** — owns: `importedDoc: PDFDocument | null`, `selectedPages: Set<number>` | props: `isOpen`, `onClose`, `onImport: (pages: number[]) => void`
        Modal dialog: user picks a second PDF via file input, sees its page thumbnails, selects which pages to merge, and confirms.

    - **`<PrintButton>`** — owns: nothing | props: `pdfEngine`
      Triggers printing by rendering all pages into a hidden iframe and calling `iframe.contentWindow.print()`.

    - **`<SaveButton>`** — owns: `isSaving: boolean` | reads: `EditorContext` (documentModel)
      Serializes the current `documentModel` to bytes via `pdfDocument.save()` and triggers a browser download.

    - **`<BookmarkPanel>`** — owns: `editingBookmarkId: string | null` | reads: `ViewerContext` (engineName, outline)
      Collapsible right sidebar that displays the PDF's bookmark tree. Read-only under PDF.js. Add/edit/delete under MuPDF. Disabled state with tooltip when PDF.js is active and write is attempted.

    - **`<AnnotationToolbar>`** — owns: `activeTool: AnnotationTool` | reads: `ViewerContext` (engineName)
      Floating secondary toolbar with tool buttons for text annotation, rectangle redaction, and text-highlight redaction. All buttons render disabled with a "Requires MuPDF engine" tooltip when `engineName === 'pdfjs'`.

    - **`<RedactionOverlay>`** — owns: `rects: Rect[]`, `isDrawing: boolean` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles or highlight text selections. Only mounted when MuPDF is active and an annotation tool is selected.

**Context provider boundaries:**
- `ViewerContext` is provided by `<PdfWorkspace>` and consumed by everything inside it that reads/dispatches viewer state (zoom, page, scroll mode).
- `EditorContext` is provided by `<PdfWorkspace>` and consumed only by `<EditorPanel>` and its children plus `<SaveButton>`.
- `<App>` manages only view routing (`'picker' | 'viewer'`) and file selection. No context crosses this boundary.
```

---

**Updated AppState** -- add `editorThumbnailScale`, `copiedPageIndices`, and `viewRotation` to the interface:

```typescript
export interface AppState {
  // -- Document instances --
  pdfEngine: PDFDocumentProxy | null;
  documentModel: PDFDocument | null;
  filename: string | null;

  // -- Engine selection --
  enginePreference: EnginePreference;
  activeEngineName: 'pdfjs' | 'mupdf' | null;

  // -- Viewer --
  pageCount: number;
  currentPage: number;                      // 1-indexed visible page
  zoomLevel: number;                        // scale factor: 1.0 = 100%
  fitMode: FitMode;
  scrollMode: ScrollMode;
  viewRotation: 0 | 90 | 180 | 270;        // visual-only rotation applied in viewer (does not mutate PDF)

  // -- Editor --
  isEditorMode: boolean;
  pages: PageDescriptor[];
  selectedPages: Set<number>;
  copiedPageIndices: number[];              // indices into pages[] stored by COPY_PAGES, consumed by PASTE_PAGES
  editorThumbnailScale: number;            // scale factor for page grid thumbnails: 1.0 = default, 0.5..2.0 range
  undoStack: ReadonlyArray<PageDescriptor[]>;
  redoStack: ReadonlyArray<PageDescriptor[]>;

  // -- Loading / Error --
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;

  // -- Annotations (active when MuPDF engine is loaded) --
  activeAnnotationTool: AnnotationTool;
  redactionOverlays: Map<number, RedactionRect[]>;
  bookmarks: Bookmark[];
}

export const initialState: AppState = {
  pdfEngine: null,
  documentModel: null,
  filename: null,

  enginePreference: 'pdfjs',
  activeEngineName: null,

  pageCount: 0,
  currentPage: 1,
  zoomLevel: 1.0,
  fitMode: 'width',
  scrollMode: 'continuous',
  viewRotation: 0,

  isEditorMode: false,
  pages: [],
  selectedPages: new Set(),
  copiedPageIndices: [],
  editorThumbnailScale: 1.0,
  undoStack: [],
  redoStack: [],

  isLoading: false,
  loadingProgress: 0,
  error: null,

  activeAnnotationTool: null,
  redactionOverlays: new Map(),
  bookmarks: [],
};
```

---

**New actions to add to AppAction union** -- insert these in the appropriate sections:

```typescript
  // === Viewer rotation (visual only, does not mutate the PDF) ===

  // Rotates the view by +90 or -90 degrees. Wraps mod 360.
  | { type: 'ROTATE_VIEW'; delta: 90 | -90 }                  // ViewerToolbar (rotate left/right buttons)

  // Reloads the current document from its original source.
  | { type: 'RELOAD_DOCUMENT' }                                // ViewerToolbar (refresh button)

  // === Editor thumbnail zoom ===

  // Sets the scale factor for page grid thumbnails. Clamped to [0.5, 2.0].
  | { type: 'SET_EDITOR_THUMBNAIL_SCALE'; scale: number }     // EditorToolbar (zoom in/out)

  // === Copy / Paste pages (editor) -- COPY does not touch undoStack, PASTE pushes to undoStack ===

  // Stores the currently selected page indices into copiedPageIndices. No-op if selectedPages is empty.
  | { type: 'COPY_PAGES' }                                     // EditorToolbar

  // Duplicates the pages at copiedPageIndices and appends them at the end of pages[].
  // Pushes to undoStack, clears redoStack. No-op if copiedPageIndices is empty.
  | { type: 'PASTE_PAGES' }                                    // EditorToolbar
```

Updated action count note:

```markdown
- **28 core actions + 8 annotation/bookmark actions = 36 total.** The 3 new core actions are: `ROTATE_VIEW`, `COPY_PAGES`, `PASTE_PAGES`, `SET_EDITOR_THUMBNAIL_SCALE`, and `RELOAD_DOCUMENT` (5 new, bringing core from 25 to 30, total to 38).
```

Correction: that's 5 new actions. Updated count: **30 core + 8 annotation/bookmark = 38 total.**

---

**Updated Phase numbering** -- Phase 13 (Thumbnail Sidebar) is deleted. Old Phase 14 becomes new Phase 13, old Phase 15 becomes new Phase 14, etc. All subsequent phases shift down by 1. Here are the two affected phases with updated content:

```markdown
### Phase 13: Editor Panel (Toolbar + Page Grid + Selection)
**Goal:** Build the editor mode toggle, EditorPanel, EditorToolbar with all 13 buttons, PageGrid, and DraggablePageCard with selection and thumbnail zoom.
**Depends on:** Phase 7, Phase 12
**Files created/modified:**
- `src/components/EditorPanel/EditorPanel.tsx`, `EditorPanel.module.css`
- `src/components/EditorPanel/EditorToolbar.tsx`, `EditorToolbar.module.css`
- `src/components/EditorPanel/PageGrid.tsx`, `PageGrid.module.css`
- `src/components/EditorPanel/DraggablePageCard.tsx`, `DraggablePageCard.module.css`
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — add Edit Pages toggle button
- `src/context/appReducer.ts` — add `SET_EDITOR_THUMBNAIL_SCALE` handler

**Acceptance:** Clicking "Edit Pages" in the viewer toolbar switches to editor mode: the main area shows a grid of page thumbnails with checkboxes. The editor toolbar renders all 13 buttons in the correct order: Scan (stub), Import, Delete Pages, Rotate Left, Rotate Right, Extract Pages, Undo, Redo, Zoom Out, Zoom In, Select None, Copy Pages, Paste Pages. Clicking a card selects it (blue border). "Select None" clears all selections. Zoom In/Out in the editor toolbar scales the thumbnail grid size up and down. "Scan" logs to console. Clicking "Edit Pages" again (or a back button) returns to the viewer. No mutations yet — rotation/delete/copy/paste buttons are visible but wired in Phase 14.

---

### Phase 14: Editor Operations (Rotate, Delete, Reorder, Copy, Paste)
**Goal:** Wire all EditorToolbar actions to DocumentModel mutations and re-sync the viewer engine.
**Depends on:** Phase 13
**Files created/modified:**
- `src/hooks/useDocumentEditor.ts` — hook that wraps DocumentModel, dispatches to EditorContext, and reloads PdfJsEngine after mutations
- `src/components/EditorPanel/EditorToolbar.tsx` — connect all buttons: Rotate Left/Right, Delete, Undo, Redo, Copy, Paste, Select None
- `src/components/EditorPanel/PageGrid.tsx` — drag-and-drop reorder via pointer events
- `src/context/appReducer.ts` — add `COPY_PAGES`, `PASTE_PAGES` handlers

**Acceptance:**
- Select two pages, click Rotate Right — thumbnails rotate 90 degrees clockwise. Rotate Left rotates them back.
- Delete selected pages — they disappear, page count updates.
- Drag page 3 to position 1 — grid reorders.
- Select pages 1 and 3, click Copy Pages, then Paste Pages — pages 1 and 3 are duplicated at the end. Page count increases by 2.
- Copy then Paste again — another copy appears (paste is repeatable).
- Paste with nothing copied — no-op (button disabled when `copiedPageIndices` is empty).
- Undo reverses the last operation. Redo re-applies it.
- Select None clears all selections.
- Switch back to viewer — the mutated document renders correctly.
```

---

**Updated ViewerToolbar buttons and related phase** -- the ViewerToolbar is now fully specified in the component tree above. The existing Phase 10 (Zoom Controls) should be updated to cover the full toolbar layout:

```markdown
### Phase 10: Viewer Toolbar + Zoom Controls
**Goal:** Build the complete `<ViewerToolbar>` with all 16 controls in the demo layout, including zoom, fit-to-page, view-mode dropdown, rotate left/right, print/download/upload buttons, and page navigator.
**Depends on:** Phase 9
**Files created/modified:**
- `src/components/ViewerToolbar/ViewerToolbar.tsx`, `ViewerToolbar.module.css` — full toolbar with all 16 controls
- `src/context/appReducer.ts` — add `ROTATE_VIEW` and `RELOAD_DOCUMENT` action handlers
- `src/components/PageViewport/PageCanvas.tsx` — respond to `zoomLevel`, `fitMode`, and `viewRotation` from context

**Acceptance:** The toolbar renders all 16 controls in the specified order with proper vertical dividers. View-mode dropdown opens and switches between Continuous / Single Page / Two-Page Spread. Zoom in/out step through presets. Zoom readout shows current percentage. Fit-to-page fits the full page in the viewport. Rotate left/right rotate the visual display by 90 degrees (does not mutate the PDF — purely visual). Page navigator shows "Page [input] X / N" with prev/next arrows. Print opens browser print dialog. Download saves the PDF. Upload opens a file picker to switch documents without returning to the entry screen. Refresh reloads the current PDF. Edit Pages button toggles editor mode.
```

---

**Updated Phase 11** -- remove dependency on Phase 13 (which no longer exists):

```markdown
### Phase 11: Multi-Page Scroll (Continuous Mode)
**Goal:** Build `PageViewport` with continuous scroll — render all pages in a column with virtualization.
**Depends on:** Phase 10
**Files created/modified:**
- `src/components/PageViewport/PageViewport.tsx`, `PageViewport.module.css`
- `src/hooks/useVisiblePages.ts` — IntersectionObserver hook to track which pages are in view
- `src/components/PageViewport/PageCanvas.tsx` — render/cancel based on visibility

**Acceptance:** All pages of `sample-basic.pdf` appear in a scrollable column. Only visible pages (plus a 1-page buffer above/below) are rendered to canvas. Scrolling updates `currentPage` in context. Zoom applies to all pages.
```

---

**Phase 12 stays** as "Page Navigator + Single/Spread Modes" but note that the page navigator UI is already built in Phase 10 — Phase 12 wires the layout modes:

```markdown
### Phase 12: Single-Page + Spread Layout Modes
**Goal:** Implement single-page and two-page spread layouts in `PageViewport`, activated by the view-mode dropdown built in Phase 10.
**Depends on:** Phase 11
**Files created/modified:**
- `src/components/PageViewport/PageViewport.tsx` — branch layout by `scrollMode`

**Acceptance:** Toggling to single-page mode shows one page at a time with prev/next navigation. Toggling to spread shows two pages side-by-side. A 5-page document shows spreads [1], [2-3], [4-5]. Mode survives zoom changes.
```

---

**Deleted items summary:**
- `<ThumbnailSidebar>` and `<ThumbnailPage>` removed from component tree (2 components removed)
- Phase 13 (Thumbnail Sidebar) deleted entirely
- REQ-13 (Thumbnail sidebar) removed from acceptance criteria
- Component count: 20 total (16 core + 4 WASM-tier)
- Phase count: 24 total (was 25)
- All phases after old Phase 13 renumber down by 1: old 14 becomes 13, old 15 becomes 14, ..., old 25 becomes 24

**Full renumbered phase list for reference:**
1. Project Scaffold
2. Core Types
3. App State & Context
4. PdfEngine Interface + PDF.js Adapter (Loading)
5. PDF.js Adapter (Rendering)
6. DocumentModel (Implementation)
7. DocumentModel (Edge Cases + Tests)
8. File Picker Entry Screen
9. PdfWorkspace + Single-Page Rendering
10. Viewer Toolbar + Zoom Controls
11. Multi-Page Scroll (Continuous Mode)
12. Single-Page + Spread Layout Modes
13. Editor Panel (Toolbar + Page Grid + Selection)
14. Editor Operations (Rotate, Delete, Reorder, Copy, Paste)
15. Import / Merge + Extract
16. Save + Print
17. Linearized Loading
18. Polish & Edge Cases
19. End-to-End Testing
20. Architecture Document
21. MuPDF Engine Adapter
22. Annotations (Text + Redaction)
23. Bookmarks Read/Write Panel
24. Cursor AI Usage Log

---

**User**

Small refinement: the current <ImportDialog> design is over-engineered. The user picks a PDF, sees its page thumbnails, selects which pages to import, then confirms. The actual demo video shows a much simpler flow — clicking Import opens a file picker, the user picks a PDF, and all of its pages are merged into the current document at the position after the currently selected page (or at the end if no page is selected).
Update the plan:

Remove <ImportDialog> from the component tree. The Import button just opens a hidden <input type="file">.
Update the IMPORT_PAGES action description: triggered by the file picker change event in the EditorToolbar, not by a dialog confirm.
Update Phase 16 — remove ImportDialog references. The phase becomes simpler: file picker callback → read bytes → call documentModel.mergePdf(bytes, insertIndex) → reload engine.
Update REQ-21 to remove the page-selection dialog step. New REQ-21: "Click Import in the editor toolbar. Pick a PDF from disk. All pages of that PDF are inserted into the current document at the position after the currently selected page (or at the end if no page is selected)."

Output the updated component description, the updated Phase 16, and the updated REQ-21.

---

**Cursor**

Here are the three updated sections.

---

**Updated Component Tree** -- remove `<ImportDialog>`, update `<EditorToolbar>`:

Replace the `<EditorToolbar>` description:

```markdown
      - **`<EditorToolbar>`** — owns: `importInputRef: RefObject<HTMLInputElement>` | reads+dispatches: `EditorContext`
        Single horizontal toolbar row with 13 controls in this exact order:
        1. Scan button — **stub: logs to console, not implemented** (noted as known limitation)
        2. Import button — clicks a hidden `<input type="file" accept=".pdf">`. On file selection, reads bytes, calls `documentModel.mergePdf()` at the insertion index, and reloads the engine. No dialog.
        3. Delete Pages button — deletes selected pages
        4. Rotate Pages Left button — rotates selected pages -90 degrees
        5. Rotate Pages Right button — rotates selected pages +90 degrees
        6. Extract Pages button — extracts selected pages into a new downloaded PDF
        7. Undo button — reverts last page manipulation
        8. Redo button — re-applies undone manipulation
        9. Zoom Out button — decreases `editorThumbnailScale` (thumbnail grid size)
        10. Zoom In button — increases `editorThumbnailScale` (thumbnail grid size)
        11. Select None button — clears page selection
        12. Copy Pages button — copies selected page indices to clipboard state
        13. Paste Pages button — duplicates copied pages at the end of the document
```

Delete the `<ImportDialog>` entry entirely (the `- **<ImportDialog>** ...` block under `<EditorPanel>`). Component count drops from 20 to 19 (15 core + 4 WASM-tier).

---

**Updated IMPORT_PAGES action** -- replace its comment in the AppAction union:

```typescript
  // Inserts newPages into pages[] at atIndex. Updates pageCount.
  // Triggered by the hidden file input's change event in EditorToolbar:
  // file picker → read bytes → documentModel.mergePdf(bytes, insertIndex) →
  // serialize → reload engine → dispatch IMPORT_PAGES with new page descriptors.
  // insertIndex = max selected page index + 1, or pages.length if nothing is selected.
  | { type: 'IMPORT_PAGES'; newPages: PageDescriptor[]; atIndex: number } // EditorToolbar (file input onChange)
```

---

**Updated Phase 15** (was Phase 16 before the previous renumbering; now Phase 15 per the latest numbering):

```markdown
### Phase 15: Import / Merge + Extract
**Goal:** Wire the Import button to a hidden file input that merges an entire PDF into the current document, and wire the Extract button to download selected pages as a new PDF.
**Depends on:** Phase 14
**Files created/modified:**
- `src/components/EditorPanel/EditorToolbar.tsx` — add hidden `<input type="file">` ref, wire Import button to click it, wire `onChange` handler that reads bytes and calls `importPages` from the editor hook
- `src/hooks/useDocumentEditor.ts` — add `importPages(bytes: Uint8Array)` method: computes insertion index as `Math.max(...selectedPages) + 1` (or `pages.length` if nothing selected), calls `documentModel.mergePdf(bytes, insertIndex)`, serializes, reloads engine, dispatches `IMPORT_PAGES`
- `src/hooks/useDocumentEditor.ts` — add `extractPages()` method: calls `documentModel.extractPages(selectedPageNumbers)`, saves to bytes, triggers browser download

**Acceptance:** Click "Import" in the editor toolbar — native file picker opens. Select a PDF with 4 pages. All 4 pages appear in the grid immediately after the currently selected page (or at the end if nothing was selected). Page count increases by 4. Click Undo — the 4 imported pages disappear. Select pages 2 and 5, click "Extract" — a new PDF downloads containing exactly those 2 pages.
```

---

**Updated REQ-21**:

```markdown
- [ ] **REQ-21: Page import / merge** — In editor mode, click "Import" in the toolbar. A native file picker opens. Select a second PDF from disk. All pages of that PDF are inserted into the current document at the position after the currently selected page (or at the end if no page is selected). Page count increases by the imported document's page count. Undo removes all imported pages.
```

---

**User**

Re-output the consolidated cursor-plan.md document with all the corrections applied. I want a single self-contained file I can save.

---

**Cursor**

The consolidated `cursor-plan.md` has been written with all corrections applied. Here's a summary of what's in the final document:

- **33 requirements** (1 entry screen + 10 viewing + 6 editing + 1 printing + 2 export + 2 source + 8 WASM tier + 4 non-functional)
- **8 architectural decisions** with one-paragraph justifications
- **19 components** (15 core + 4 WASM-tier) -- no records UI, no thumbnail sidebar, no import dialog
- **AppState** with 22 fields including `enginePreference`, `activeEngineName`, `viewRotation`, `copiedPageIndices`, `editorThumbnailScale`
- **38 actions** (30 core + 8 annotation/bookmark)
- **PdfEngine interface** with two adapter implementations noted (PdfJsEngine + MuPdfEngine)
- **DocumentModel API** with 7 methods and full JSDoc
- **24 build phases** with goals, dependencies, files, and acceptance criteria
- **24 per-phase risk entries** with detection and mitigation
- **47 acceptance criteria** mapped to spec sections + **10 quality bar items**
- **4 known limitations** documented explicitly

---

**User**

I need to align the plan with the scope cuts in .cursorrules. When you re-added the bonus tier, you brought back the full original spec list, but .cursorrules explicitly excludes three features even within the bonus tier — text-highlighter redaction, interactive signature creation, and interactive PDF form widgets. The plan currently contradicts the rules in several places. Fix all of them.
Apply these specific changes:

Section 2 — Requirements list:

Delete REQ-23 (text-highlighter redaction). Renumber subsequent requirements down.
Rewrite the signature requirement: change from "render and interact with signature fields" to "render existing signature widget annotations as read-only visuals (do not implement interactive signing)."
Rewrite the widget annotations requirement: change from "render and interact with widget annotations" to "render existing form widgets (checkboxes, text inputs, radios) as read-only visuals (do not wire to user input)."


Section 4 — Component tree, <AnnotationToolbar> description:

Remove "text-highlight redaction" from the list of tool buttons. The component now has only two tool buttons: text annotation and rectangle redaction.


Section 10 — Acceptance criteria:

Delete REQ-32 (text-highlighter redaction). Renumber.
Rewrite the signature REQ to test read-only rendering: "Open a PDF that contains a signature form field. The field area is rendered as a static visual with a label indicating it's a signature field. Clicking it does NOT open an input UI."
Rewrite the widget REQ to test read-only rendering: "Open a PDF with form fields. Checkboxes and text inputs are rendered as static visuals matching their declared state in the PDF. Clicking them does nothing."


Section 8 — Build phases, Phase 22:

Update the goal from "text annotations and rectangle redaction" to remain accurate (it already is) but ensure the file modifications list does not include text-highlighter selection logic. Phase 22's RedactionOverlay only handles rectangle drag-draw, not text selection.


Section 12 — Known Limitations:

Add three new bullets explaining what's deliberately out of scope within the bonus tier and why:

"Text-highlighter redaction — requires text-layer hit testing and selection state management; rectangle redaction provides equivalent capability for the demo."
"Interactive signature creation — read-only rendering of existing signature fields is supported; drawing/applying new signatures is out of scope."
"Interactive form widgets — read-only rendering of checkboxes/text inputs/radios is supported; user-driven form filling is out of scope."





Do not change anything else. Output only the modified sections so I can verify the diff.

---

**Cursor**


Reading the plan file to locate sections to update.




Applying edits to align the plan with `.cursorrules`: fixing remaining contradictions (RedactionOverlay, `AnnotationTool`, adapter blurb, overview, 3.4, Phase 22 goal, Section 12 wording) and syncing `C/cursor-plan.md`.




Updates are applied in both [`cursor-plan.md`](cursor-plan.md) and [`C/cursor-plan.md`](C/cursor-plan.md). Section 2 already had no separate “text-highlighter redaction” requirement (only rectangle redaction, then text annotations, then read-only signature/widgets); REQ-33/REQ-34 acceptance text already matched your read-only tests. Below are the **modified sections only** for your diff review.

---

### Section 1 — Project Overview (paragraph)

```markdown
We are building a client-side-only (no backend) web application in TypeScript + React + Vite that serves as a PDF viewer SDK. The app opens with a file picker entry screen where the user can choose a local PDF, drag-and-drop a file, or load a bundled sample. Once a file is selected, an inline PDF viewer/editor takes over the full viewport. The viewer supports rendering, navigation, zoom, scroll modes, a document editor mode (rotate, reorder, import/merge, extract, export pages), printing, and local save. An opt-in WASM tier (via `mupdf-wasm`) adds rectangle redaction, text annotations, read-only rendering of existing signature and form-widget visuals, and bookmark read/write. Text-highlighter redaction, interactive signing, and interactive form filling are out of scope even in the WASM tier. Deliverables also include an architecture doc and a Cursor AI usage log.
```

---

### Section 3.4 — excerpt (MuPDF sentence)

```markdown
mupdf-wasm is offered as an opt-in secondary engine that the user activates via an engine selector toggle before opening a PDF. When MuPDF is active, the app gains access to annotation APIs for text annotations and rectangle redaction, read-only rendering of existing signature and form-widget visuals (no interactive signing or form filling), and read/write bookmark support that PDF.js cannot provide.
```

---

### Section 4 — `<RedactionOverlay>`

```markdown
    - **`<RedactionOverlay>`** — owns: `rects: Rect[]`, `isDrawing: boolean` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles only (drag-draw). Only mounted when MuPDF is active and rectangle redaction is the active tool.
```

---

### Section 5 — `AnnotationTool` (Supporting Types)

```typescript
export type AnnotationTool = 'text' | 'redact-rect' | null;
```

---

### Section 6 — Adapter implementations (`MuPdfEngine` bullet)

```markdown
- **`MuPdfEngine`** (WASM, opt-in) — wraps `mupdf-wasm`. Loaded lazily via dynamic `import()` so the ~10 MB WASM binary is never fetched when the user stays on PDF.js. Supports creating text annotations and rectangle redactions; renders existing signature and form-widget annotations as read-only visuals (no interactive signing or form-widget input); supports bookmark read/write via MuPDF's C API exposed through the WASM bindings. Does NOT support linearized loading — the full document must be fetched before rendering begins. Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for `SharedArrayBuffer` access.
```

---

### Section 8 — Phase 22 (build phase + risk heading)

**Phase 22:**

```markdown
### Phase 22: Annotations (Text + Rectangle Redaction)
**Goal:** Implement text annotations and rectangle redaction using MuPDF's annotation API. Build the AnnotationToolbar (two tools only) and RedactionOverlay UI. Do not implement text-highlighter redaction (no text-layer selection for redaction).
**Depends on:** Phase 21
**Files created/modified:**
- `src/components/AnnotationToolbar/AnnotationToolbar.tsx`, `AnnotationToolbar.module.css`
- `src/components/PageViewport/RedactionOverlay.tsx`, `RedactionOverlay.module.css` — pointer handling for rectangle drag-draw only (no text-highlighter or text-selection redaction logic)
```

**Risks (heading only):**

```markdown
### Phase 22: Annotations (Text + Rectangle Redaction)
```

---

### Section 10 — Acceptance (no change)

**REQ-32 (text-highlighter)** was already absent; **REQ-33** / **REQ-34** already matched your read-only signature and widget criteria. No edits were made under §10.

---

### Section 12 — Known Limitations

The three bonus-tier scope bullets were already present and match your wording; **no file change** there.

---

**Summary:** Section 2 did not list a separate text-highlighter requirement, so nothing was removed or renumbered there. Contradictions were fixed in the overview, §3.4, `RedactionOverlay`, `AnnotationTool`, `MuPdfEngine` description, Phase 22, and Phase 22 risk title. Both plan files are aligned.

