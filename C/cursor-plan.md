# PDF Viewer SDK — Build Plan

## 1. Project Overview

We are building a client-side-only (no backend) web application in TypeScript + React + Vite that serves as a PDF viewer SDK. The app opens with a file picker entry screen where the user can choose a local PDF, drag-and-drop a file, or load a bundled sample. Once a file is selected, an inline PDF viewer/editor takes over the full viewport. The viewer supports rendering, navigation, zoom, scroll modes, a document editor mode (rotate, reorder, import/merge, extract, export pages), printing, and local save. An opt-in WASM tier (via `mupdf-wasm`) adds rectangle redaction, text annotations, read-only rendering of existing signature and form-widget visuals, and bookmark read/write. Text-highlighter redaction, interactive signing, and interactive form filling are out of scope even in the WASM tier. Deliverables also include an architecture doc and a Cursor AI usage log.

---

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
23. **Text annotations** — add free-text annotations to pages. Requires MuPDF engine.
24. **Signature form fields** — render existing signature widget annotations as read-only visuals (do not implement interactive signing). Requires MuPDF engine.
25. **Widget annotations** — render existing form widgets (checkboxes, text inputs, radios) as read-only visuals (do not wire to user input). Requires MuPDF engine.
26. **Bookmarks read** — parse and display the PDF's bookmark/outline tree. Requires MuPDF engine.
27. **Bookmarks write** — create/edit/delete bookmarks and persist them in the PDF. Requires MuPDF engine.
28. **Engine selector** — UI toggle on the entry screen that lets the user choose between PDF.js (default, fast, linearized) and MuPDF (WASM, annotations/bookmarks).

### Non-Functional / Deliverable Requirements
29. **No backend** — everything runs client-side; PDFs are loaded from local files or bundled assets.
30. **Stack constraint** — TypeScript, React, Vite, PDF.js (default), pdf-lib (editing/export), mupdf-wasm (WASM tier).
31. **Architecture document** — one component diagram, state management approach, key tradeoffs, "if I had 1 more day" roadmap.
32. **Cursor AI usage log** — Plan mode output, exported transcript, notes on AI-output changes, correctness validation notes.

---

## 3. Architectural Decisions

### 3.1 Why TypeScript over plain JavaScript?
This project is an SDK — its primary consumers are other developers embedding it. TypeScript gives us compile-time guarantees on the public API surface (every prop, callback, and configuration option is a contract), makes refactoring safe across the viewer/editor boundary, and gives IDE users autocomplete on every `PdfViewerProps` field without reading docs. For a take-home assignment, it also signals engineering rigor.

### 3.2 Why React over vanilla DOM or Vue/Svelte?
The host app (file picker + viewer) and the viewer SDK both need component composition, lifecycle management, and reactive state propagation — React gives us all three with a single mental model. Vanilla DOM would mean hand-rolling a component system for the toolbar, page viewport, and page canvas orchestration. Vue/Svelte are viable but React is the spec's explicit stack requirement, and its ecosystem (refs for canvas management, pointer events for drag-and-drop) is the deepest.

### 3.3 Why Vite over Webpack or Next.js?
Vite gives us sub-second HMR, native ESM dev serving, and — critically for this project — a dev server that handles HTTP Range requests on static files out of the box, which we need for real linearization loading. Next.js adds SSR machinery we don't need (no backend, no SEO). Webpack would work but requires more config for the same result. Vite is also the spec's explicit choice.

### 3.4 Why PDF.js as the default renderer, with mupdf-wasm as a secondary engine?
PDF.js is the default engine because it works without WASM compilation, handles progressive/linearized loading natively via `PDFDocumentLoadingTask` with HTTP Range requests, and renders to a `<canvas>` with text and annotation layers already built. It requires zero special server headers (no COOP/COEP) and adds ~400 KB to the bundle. mupdf-wasm is offered as an opt-in secondary engine that the user activates via an engine selector toggle before opening a PDF. When MuPDF is active, the app gains access to annotation APIs for text annotations and rectangle redaction, read-only rendering of existing signature and form-widget visuals (no interactive signing or form filling), and read/write bookmark support that PDF.js cannot provide. The tradeoff is a ~10 MB WASM binary, no linearized loading (MuPDF must load the full blob before rendering), and a requirement for `SharedArrayBuffer` which mandates `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. The dual-engine architecture is mediated by the `PdfEngine` interface: all viewer/editor components program against the interface, and `PdfWorkspace` instantiates either `PdfJsEngine` or `MuPdfEngine` based on `enginePreference` in state.

### 3.5 Why pdf-lib for editing instead of PDF.js or mupdf?
PDF.js is a *read-only* library — it parses and renders but cannot write modified PDFs back to bytes. pdf-lib is purpose-built for PDF *manipulation*: it can copy pages between documents (`PDFDocument.copyPages`), remove pages, rotate pages (`page.setRotation`), and serialize to `Uint8Array` — exactly the operations our Document Editor needs. It operates on the PDF object model, not on rendered pixels, so it complements PDF.js perfectly: PDF.js renders, pdf-lib mutates, and we re-render after mutation.

### 3.6 Why split rendering (PdfEngine) and editing (DocumentModel) into separate abstractions?
Because they have different lifecycles, different data models, and different consumers. The `PdfEngine` holds a `PDFDocumentProxy` (PDF.js), manages canvas rendering, viewport transforms, and page visibility — it's hot-path, frame-rate-sensitive code. The `DocumentModel` holds a `PDFDocument` (pdf-lib), tracks an ordered list of page descriptors with rotation/origin metadata, and only materializes bytes on export. Merging them would force every zoom/scroll event to touch the editing data structure. Separating them means the viewer works without the editor (SDK flexibility), the editor can batch mutations without triggering re-renders, and we can test each in isolation.

### 3.7 What state management approach, and why not Redux/Zustand/MobX?
React Context + `useReducer` for two scoped stores: `ViewerContext` (current page, zoom level, scroll mode, viewport dimensions) and `EditorContext` (page list, selection, dirty flag). The state shapes are small, the update patterns are predictable (dispatch an action, reduce, re-render), and the scope is limited to the viewer subtree — no global app-wide store needed. Redux adds boilerplate and a dependency for state that never leaves one component subtree. Zustand is lighter but still an external dependency for something `useReducer` handles in ~40 lines. MobX's observable model is overkill when we have fewer than 20 state fields total.

### 3.8 What styling approach, and why?
CSS Modules (`.module.css` files). Vite supports them natively with zero config — `import styles from './Toolbar.module.css'` just works. They give us scoped class names (no collisions between the host app and SDK components), zero runtime cost (unlike styled-components), no extra build tooling (unlike Tailwind's PostCSS pipeline), and straightforward debugging (real class names in dev, hashed in prod). For a project this size, the simplicity-to-power ratio of CSS Modules is unbeatable.

---

## 4. Component Tree

15 core components + 4 WASM-tier components = 19 total.

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

      - **`<PageGrid>`** — owns: `dragState: { sourceIndex, overIndex } | null` | reads: `EditorContext` (pageList, editorThumbnailScale)
        Displays all pages as a reorderable grid; handles drag-and-drop via pointer events and dispatches `REORDER_PAGES` on drop. Thumbnail size is controlled by `editorThumbnailScale`.

        - **`<DraggablePageCard>`** — owns: nothing | props: `page: PageDescriptor`, `index`, `isSelected`, `onSelect`, `onDragStart`, `onDragOver`, `onDrop`, `thumbnailScale`
          A single card in the editor grid showing a thumbnail, page number, rotation badge, and selection checkbox. Size scales with `editorThumbnailScale`.

    - **`<PrintButton>`** — owns: nothing | props: `pdfEngine`
      Triggers printing by rendering all pages into a hidden iframe and calling `iframe.contentWindow.print()`.

    - **`<SaveButton>`** — owns: `isSaving: boolean` | reads: `EditorContext` (documentModel)
      Serializes the current `documentModel` to bytes via `pdfDocument.save()` and triggers a browser download.

    - **`<BookmarkPanel>`** — owns: `editingBookmarkId: string | null` | reads: `ViewerContext` (engineName, outline)
      Collapsible right sidebar that displays the PDF's bookmark tree. Read-only under PDF.js. Add/edit/delete under MuPDF. Disabled state with tooltip when PDF.js is active and write is attempted.

    - **`<AnnotationToolbar>`** — owns: `activeTool: AnnotationTool` | reads: `ViewerContext` (engineName)
      Floating secondary toolbar with two tool buttons: text annotation and rectangle redaction. All buttons render disabled with a "Requires MuPDF engine" tooltip when `engineName === 'pdfjs'`.

    - **`<RedactionOverlay>`** — owns: `rects: Rect[]`, `isDrawing: boolean` | props: `pageNumber`, `activeTool`
      Transparent overlay on top of a PageCanvas that captures pointer events to draw redaction rectangles only (drag-draw). Only mounted when MuPDF is active and rectangle redaction is the active tool.

**Context provider boundaries:**
- `ViewerContext` is provided by `<PdfWorkspace>` and consumed by everything inside it that reads/dispatches viewer state (zoom, page, scroll mode).
- `EditorContext` is provided by `<PdfWorkspace>` and consumed only by `<EditorPanel>` and its children plus `<SaveButton>`.
- `<App>` manages only view routing (`'picker' | 'viewer'`) and file selection. No context crosses this boundary.

---

## 5. Application State

### Supporting Types

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

export type AnnotationTool = 'text' | 'redact-rect' | null;

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

### AppState Interface

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
  viewRotation: 0 | 90 | 180 | 270;        // visual-only rotation applied in viewer (does not mutate PDF)

  // -- Editor --
  isEditorMode: boolean;                    // true = show EditorPanel, false = show PageViewport
  pages: PageDescriptor[];                  // ordered page list; source of truth for page order/rotation
  selectedPages: Set<number>;               // indices into pages[] currently selected in editor
  copiedPageIndices: number[];              // indices into pages[] stored by COPY_PAGES, consumed by PASTE_PAGES
  editorThumbnailScale: number;            // scale factor for page grid thumbnails: 1.0 = default, 0.5..2.0 range
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

### AppAction Discriminated Union

```typescript
export type AppAction =
  // === Document lifecycle — dispatched by <PdfWorkspace> ===

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
  | { type: 'DOCUMENT_CLOSED' }                              // ViewerToolbar / App

  // === Engine selection ===

  // Sets enginePreference. Only takes effect on next document load, not mid-document.
  | { type: 'SET_ENGINE_PREFERENCE'; preference: EnginePreference }  // EngineSelector

  // === Navigation ===

  // Clamps to [1, pageCount]. Dispatched by scroll observer AND by explicit nav.
  | { type: 'SET_CURRENT_PAGE'; page: number }                // PageViewport, ViewerToolbar (page navigator)

  // === Zoom ===

  // Steps zoomLevel to the next preset above current (presets: 0.25...5.0). Sets fitMode -> 'none'.
  | { type: 'ZOOM_IN' }                                       // ViewerToolbar (zoom in button)

  // Steps zoomLevel to the next preset below current. Sets fitMode -> 'none'.
  | { type: 'ZOOM_OUT' }                                      // ViewerToolbar (zoom out button)

  // Sets zoomLevel to an explicit value. Sets fitMode -> 'none'.
  | { type: 'SET_ZOOM'; level: number }                       // ViewerToolbar (zoom readout dropdown)

  // Sets fitMode. Does NOT change zoomLevel -- PageViewport computes effective scale on render.
  | { type: 'SET_FIT_MODE'; mode: FitMode }                   // ViewerToolbar (fit-to-page button)

  // === Scroll / view mode ===

  | { type: 'SET_SCROLL_MODE'; mode: ScrollMode }             // ViewerToolbar (view-mode dropdown)

  // === View rotation (visual only, does not mutate the PDF) ===

  // Rotates the view by +90 or -90 degrees. Wraps mod 360.
  | { type: 'ROTATE_VIEW'; delta: 90 | -90 }                  // ViewerToolbar (rotate left/right buttons)

  // Reloads the current document from its original source.
  | { type: 'RELOAD_DOCUMENT' }                                // ViewerToolbar (refresh button)

  // === Editor mode toggle ===

  // Switches to editor layout. Clears selectedPages.
  | { type: 'ENTER_EDITOR' }                                  // ViewerToolbar (Edit Pages button)

  // Switches to viewer layout. Clears selectedPages. Resets currentPage to 1 if pages changed.
  | { type: 'EXIT_EDITOR' }                                   // ViewerToolbar (Edit Pages button)

  // === Page selection (editor) -- none of these touch undoStack ===

  // Adds or removes a single index from selectedPages.
  | { type: 'TOGGLE_PAGE_SELECTION'; index: number }          // DraggablePageCard

  // Replaces selectedPages entirely (used for shift-click range select).
  | { type: 'SET_SELECTED_PAGES'; indices: Set<number> }      // PageGrid

  // Selects all indices 0..pages.length-1.
  | { type: 'SELECT_ALL_PAGES' }                              // EditorToolbar

  // Empties selectedPages.
  | { type: 'CLEAR_SELECTION' }                               // EditorToolbar (Select None button)

  // === Page manipulation (editor) -- all push to undoStack, clear redoStack ===

  // Adds delta to rotation of each page at indices[], wrapping mod 360.
  | { type: 'ROTATE_PAGES'; indices: number[]; delta: 90 | -90 }       // EditorToolbar (Rotate Left/Right)

  // Removes page at fromIndex, inserts it at toIndex. Clears selectedPages.
  | { type: 'REORDER_PAGE'; fromIndex: number; toIndex: number }        // PageGrid (on drop)

  // Removes pages at indices[]. Clears selectedPages. Updates pageCount.
  | { type: 'DELETE_PAGES'; indices: number[] }                          // EditorToolbar (Delete Pages)

  // Inserts newPages into pages[] at atIndex. Updates pageCount.
  // Triggered by the hidden file input's change event in EditorToolbar:
  // file picker -> read bytes -> documentModel.mergePdf(bytes, insertIndex) ->
  // serialize -> reload engine -> dispatch IMPORT_PAGES with new page descriptors.
  // insertIndex = max selected page index + 1, or pages.length if nothing is selected.
  | { type: 'IMPORT_PAGES'; newPages: PageDescriptor[]; atIndex: number } // EditorToolbar (file input onChange)

  // === Copy / Paste pages (editor) ===

  // Stores the currently selected page indices into copiedPageIndices. No-op if selectedPages is empty.
  | { type: 'COPY_PAGES' }                                     // EditorToolbar (Copy Pages)

  // Duplicates the pages at copiedPageIndices and appends them at the end of pages[].
  // Pushes to undoStack, clears redoStack. No-op if copiedPageIndices is empty.
  | { type: 'PASTE_PAGES' }                                    // EditorToolbar (Paste Pages)

  // === Editor thumbnail zoom ===

  // Sets the scale factor for page grid thumbnails. Clamped to [0.5, 2.0].
  | { type: 'SET_EDITOR_THUMBNAIL_SCALE'; scale: number }     // EditorToolbar (Zoom In/Out)

  // === Undo / Redo ===

  // Pops undoStack -> pages, pushes current pages -> redoStack. No-op if undoStack is empty.
  | { type: 'UNDO' }                                          // EditorToolbar (Undo)

  // Pops redoStack -> pages, pushes current pages -> undoStack. No-op if redoStack is empty.
  | { type: 'REDO' }                                          // EditorToolbar (Redo)

  // === Annotations (MuPDF-only; reducer no-ops if activeEngineName !== 'mupdf') ===

  | { type: 'SET_ANNOTATION_TOOL'; tool: AnnotationTool }     // AnnotationToolbar

  | { type: 'ADD_REDACTION'; pageNumber: number; rect: RedactionRect }    // RedactionOverlay
  | { type: 'REMOVE_REDACTION'; pageNumber: number; rectIndex: number }   // RedactionOverlay
  | { type: 'APPLY_REDACTIONS' }                                           // AnnotationToolbar

  | { type: 'SET_BOOKMARKS'; bookmarks: Bookmark[] }                       // PdfWorkspace (on load)
  | { type: 'ADD_BOOKMARK'; bookmark: Bookmark }                          // BookmarkPanel
  | { type: 'UPDATE_BOOKMARK'; id: string; updates: Partial<Pick<Bookmark, 'title' | 'pageIndex'>> }
                                                                          // BookmarkPanel
  | { type: 'REMOVE_BOOKMARK'; id: string };                              // BookmarkPanel
```

**Key design notes:**
- **`zoomLevel` vs `fitMode` duality**: When `fitMode` is `'width'` or `'page'`, `zoomLevel` is *not* the effective rendering scale — `PageViewport` computes the effective scale on every render from viewport dimensions and page dimensions. `zoomLevel` only becomes authoritative when `fitMode === 'none'`. Any manual zoom action (`ZOOM_IN`, `ZOOM_OUT`, `SET_ZOOM`) resets `fitMode` to `'none'`.
- **Undo/redo stores full snapshots of `pages[]`**, not inverse operations. For a typical PDF (< 1000 pages), each snapshot is an array of ~40-byte objects — negligible memory.
- **`pdfEngine` and `documentModel` are object references in state**, not serializable data. The reducer stores them but never deep-clones them.
- **`selectedPages` is `Set<number>`** — indices into `pages[]`, not page IDs. Selection is cleared after operations that change array indices (reorder, delete, import).
- **`viewRotation`** is visual-only and affects the viewer's canvas rendering. It does NOT mutate the PDF. The editor's `ROTATE_PAGES` action mutates the PDF via DocumentModel.
- **`copiedPageIndices`** stores indices into the current `pages[]` array. On `PASTE_PAGES`, those pages are duplicated (via `documentModel.extractPages` + `documentModel.mergePdf`) and appended at the end.
- **30 core actions + 8 annotation/bookmark actions = 38 total.** Annotation/bookmark actions are guarded: the reducer checks `activeEngineName === 'mupdf'` and no-ops otherwise.

---

## 6. PdfEngine Interface

```typescript
// ----------------------------------------------------------------
// Supporting types
// ----------------------------------------------------------------

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
  /** Target canvas. The engine sizes and paints into this canvas. */
  readonly canvas: HTMLCanvasElement;
  /** AbortSignal -- when aborted, the engine cancels any in-flight render and the promise rejects with PdfEngineError('RENDER_CANCELLED'). */
  readonly signal?: AbortSignal;
}

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

// ----------------------------------------------------------------
// Error type
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Engine interface
// ----------------------------------------------------------------

export interface PdfEngine {
  // -- Identity --

  /**
   * Human-readable engine name for diagnostics and UI display.
   * @example "pdfjs" | "mupdf-wasm"
   */
  readonly name: string;

  // -- Loading --

  /**
   * Load a PDF document from raw bytes.
   *
   * After the returned promise resolves, `pageCount` and `getPageDimensions`
   * are available synchronously.
   *
   * @param data - Complete PDF file as an ArrayBuffer.
   * @param onProgress - Optional progress callback.
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
   * linearized (progressive) rendering.
   *
   * @param url - Absolute or relative URL to a PDF resource.
   * @param onProgress - Fires repeatedly as chunks arrive.
   *
   * @throws {PdfEngineError} code 'NETWORK_ERROR' on fetch failure.
   * @throws {PdfEngineError} code 'LOAD_FAILED' if the response is not a valid PDF.
   * @throws {PdfEngineError} code 'PASSWORD_REQUIRED' if the PDF is encrypted.
   *
   * Supported: PDF.js (full linearization), MuPDF (loads entire blob first).
   */
  loadFromUrl(url: string, onProgress?: (p: LoadProgress) => void): Promise<void>;

  // -- Synchronous accessors (available after load resolves) --

  /**
   * Total number of pages in the document.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  readonly pageCount: number;

  /**
   * Returns the unscaled dimensions of the given page. Synchronous.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getPageDimensions(pageIndex: number): PageDimensions;

  // -- Rendering --

  /**
   * Render a single page into the supplied canvas.
   *
   * Abort support: pass `options.signal` from an `AbortController`.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'RENDER_CANCELLED' if signal is aborted.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  renderPage(options: RenderOptions): Promise<void>;

  // -- Text layer --

  /**
   * Returns the text content of a page as an array of positioned items.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (native), MuPDF (via structured-text API).
   */
  getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>>;

  // -- Outline --

  /**
   * Returns the document's outline (bookmark tree).
   * Returns an empty array if the PDF has no outline dictionary.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (read-only), MuPDF (read/write).
   */
  getOutline(): Promise<ReadonlyArray<OutlineNode>>;

  // -- Raw bytes --

  /**
   * Returns the original (unmodified) PDF bytes that were loaded.
   * Used to initialise the pdf-lib DocumentModel for the editing pipeline.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getDocumentBytes(): Promise<Uint8Array>;

  // -- Lifecycle --

  /**
   * Releases all resources held by the engine.
   * After calling destroy(), every other method throws PdfEngineError('ENGINE_DESTROYED').
   * Calling destroy() more than once is a safe no-op.
   *
   * Supported: PDF.js (terminates worker), MuPDF (frees WASM heap).
   */
  destroy(): void;
}
```

**Adapter implementations:**

Two classes implement `PdfEngine`:

- **`PdfJsEngine`** (default) — wraps `pdfjs-dist`. Supports linearized loading via Range requests. Does NOT support annotation creation/editing or bookmark writing. `getOutline()` is read-only.
- **`MuPdfEngine`** (WASM, opt-in) — wraps `mupdf-wasm`. Loaded lazily via dynamic `import()` so the ~10 MB WASM binary is never fetched when the user stays on PDF.js. Supports creating text annotations and rectangle redactions; renders existing signature and form-widget annotations as read-only visuals (no interactive signing or form-widget input); supports bookmark read/write via MuPDF's C API exposed through the WASM bindings. Does NOT support linearized loading — the full document must be fetched before rendering begins. Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for `SharedArrayBuffer` access.

The `PdfWorkspace` component reads `enginePreference` from state and instantiates the corresponding adapter. Engine selection is locked once a document is loaded — changing engines requires closing and re-opening the document.

---

## 7. DocumentModel API

```typescript
import { PDFDocument, degrees } from 'pdf-lib';

/**
 * DocumentModel -- the single mutation point for PDF editing operations.
 *
 * Wraps a `pdf-lib` `PDFDocument` instance and exposes every edit operation
 * the editor panel needs.
 *
 * ## Indexing convention
 *
 * The **public API** uses **1-indexed** page numbers to match user-facing
 * page numbering. Internally, `pdf-lib` uses **0-indexed** page indices.
 * This class handles the conversion; callers never need to subtract 1.
 *
 * ## Mutation model
 *
 * Every method (except `extractPages`) **mutates `this`**. The caller is
 * responsible for snapshotting `pages` into the `undoStack` *before*
 * dispatching a mutation action.
 *
 * `extractPages` returns a **new** `DocumentModel`, leaving `this` unchanged.
 *
 * ## Async convention
 *
 * Methods are `async` to keep a uniform API surface and allow future engines
 * (e.g. mupdf-wasm) to drop in without changing call sites.
 */
export class DocumentModel {
  private pdfDoc: PDFDocument;

  private constructor(pdfDoc: PDFDocument);

  // -- Factory --

  /**
   * Create a `DocumentModel` from raw PDF bytes.
   *
   * pdf-lib API: `PDFDocument.load(bytes, { ignoreEncryption: true })`
   *
   * Edge cases:
   * - Throws `Error` if `bytes` is empty or not a valid PDF.
   * - Encrypted PDFs loaded in best-effort mode.
   *
   * Mutation: Returns a **new** `DocumentModel` instance.
   */
  static fromBytes(bytes: Uint8Array): Promise<DocumentModel>;

  // -- Accessors --

  /**
   * Returns the current number of pages in the document.
   *
   * pdf-lib API: `pdfDoc.getPageCount()`
   *
   * Synchronous. O(1).
   */
  pageCount(): number;

  // -- Rotation --

  /**
   * Rotate one or more pages by a relative angle.
   *
   * pdf-lib API:
   * - `pdfDoc.getPage(index)` to retrieve each page.
   * - `page.getRotation()` to read the current angle.
   * - `page.setRotation(degrees(newAngle))` to write the updated angle.
   *
   * Edge cases:
   * - Empty array: No-op.
   * - Duplicate page numbers: Deduplicated; each unique page rotated once.
   * - Out-of-range page number (< 1 or > pageCount): Throws `RangeError`
   *   before any mutation (all-or-nothing).
   *
   * Mutation: Mutates `this`.
   *
   * @param pageNumbers - 1-indexed page numbers to rotate.
   * @param deltaDegrees - Rotation increment: 90, -90, or 180.
   */
  rotatePages(pageNumbers: number[], deltaDegrees: 90 | -90 | 180): Promise<void>;

  // -- Deletion --

  /**
   * Remove one or more pages from the document.
   *
   * pdf-lib API: `pdfDoc.removePage(index)` for each page, highest index first.
   *
   * Edge cases:
   * - Empty array: No-op.
   * - Duplicate page numbers: Deduplicated.
   * - Out-of-range page number: Throws `RangeError` before any mutation.
   * - Deleting all pages: Throws `Error` before any mutation.
   *
   * Mutation: Mutates `this`.
   *
   * @param pageNumbers - 1-indexed page numbers to remove.
   */
  deletePages(pageNumbers: number[]): Promise<void>;

  // -- Reordering --

  /**
   * Move a single page from one position to another.
   *
   * pdf-lib API:
   * - `pdfDoc.getPage(from0)` + cache reference.
   * - `pdfDoc.removePage(from0)` to detach.
   * - `pdfDoc.insertPage(to0, page)` to reinsert.
   *
   * Edge cases:
   * - fromIndex === toIndex: No-op.
   * - Either index out of range (< 1 or > pageCount): Throws `RangeError`.
   *
   * Mutation: Mutates `this`.
   *
   * @param fromIndex - 1-indexed current position.
   * @param toIndex - 1-indexed desired position after removal.
   */
  reorderPages(fromIndex: number, toIndex: number): Promise<void>;

  // -- Extraction --

  /**
   * Extract a subset of pages into a **new** `DocumentModel`.
   *
   * pdf-lib API:
   * - `PDFDocument.create()` to create blank target.
   * - `targetDoc.copyPages(this.pdfDoc, indices)` to deep-copy pages.
   * - `targetDoc.addPage(copiedPage)` for each, in order.
   *
   * Edge cases:
   * - Empty array: Throws `Error('Must extract at least one page')`.
   * - Duplicate page numbers: Allowed (same page appears multiple times).
   * - Out-of-range page number: Throws `RangeError` before any work.
   *
   * Mutation: Returns a **new** `DocumentModel`. Does **not** mutate `this`.
   *
   * @param pageNumbers - 1-indexed page numbers, in desired output order.
   */
  extractPages(pageNumbers: number[]): Promise<DocumentModel>;

  // -- Merge / Import --

  /**
   * Insert all pages of another PDF at a given position.
   *
   * pdf-lib API:
   * - `PDFDocument.load(otherBytes)` to parse source.
   * - `this.pdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())` to deep-copy.
   * - `this.pdfDoc.insertPage(index, copiedPage)` for each, sequentially.
   *
   * Edge cases:
   * - atPageIndex < 1: Throws `RangeError`.
   * - atPageIndex > pageCount + 1: Throws `RangeError`.
   * - otherBytes is not valid PDF: Throws `Error`.
   * - Zero-page source: No-op.
   *
   * Mutation: Mutates `this`.
   *
   * @param otherBytes - Raw bytes of the PDF to import.
   * @param atPageIndex - 1-indexed insertion point. Use `pageCount() + 1` to append.
   */
  mergePdf(otherBytes: Uint8Array, atPageIndex: number): Promise<void>;

  // -- Serialisation --

  /**
   * Serialise the current document state to PDF bytes.
   *
   * pdf-lib API: `pdfDoc.save()`
   *
   * Edge cases:
   * - Encrypted PDFs with unreadable streams may produce partially readable output.
   *
   * Mutation: Does **not** mutate `this`.
   *
   * @returns Fresh PDF bytes as Uint8Array.
   */
  save(): Promise<Uint8Array>;
}
```

---

## 8. Build Phases

### Phase 1: Project Scaffold
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

### Phase 2: Core Types
**Goal:** Define all shared TypeScript types, interfaces, and the `AppState` / `AppAction` discriminated union.
**Depends on:** Phase 1
**Files created/modified:**
- `src/types/state.ts` — `AppState`, `AppAction`, `initialState`
- `src/types/engine.ts` — `PdfEngine`, `PageDimensions`, `OutlineNode`, `LoadProgress`, `RenderOptions`, `TextItem`, `PdfEngineError`
- `src/types/model.ts` — `PageDescriptor`, `FitMode`, `ScrollMode`, `EnginePreference`
- `src/types/index.ts` — barrel re-exports

**Acceptance:** All types compile. No runtime code yet — this is a pure type-definition phase. Importing any type from `@/types` works.

---

### Phase 3: App State & Context
**Goal:** Implement the `useReducer`-based state management and Context providers.
**Depends on:** Phase 2
**Files created/modified:**
- `src/context/appReducer.ts` — full reducer implementation for all 30 core actions
- `src/context/AppContext.tsx` — `ViewerContext`, `EditorContext`, provider components, typed hooks (`useViewer`, `useEditor`)
- `src/context/index.ts`

**Acceptance:** Unit test (or a throwaway component) can mount the provider, dispatch `DOCUMENT_LOAD_START` / `SET_CURRENT_PAGE` / `ENTER_EDITOR`, and assert state transitions.

---

### Phase 4: PdfEngine Interface + PDF.js Adapter (Loading)
**Goal:** Implement the PDF.js adapter's `loadFromBuffer`, `loadFromUrl`, `pageCount`, `getPageDimensions`, and `destroy`.
**Depends on:** Phase 2
**Files created/modified:**
- `src/engine/PdfJsEngine.ts` — class implementing `PdfEngine` (loading + accessors only; `renderPage` stubbed)
- `src/engine/index.ts`
- `package.json` — add `pdfjs-dist` dependency

**Acceptance:** A test script loads `sample-basic.pdf` via URL, logs `pageCount` and dimensions for every page, and calls `destroy()` without error.

---

### Phase 5: PDF.js Adapter (Rendering)
**Goal:** Implement `renderPage`, `getTextContent`, `getOutline`, and `getDocumentBytes` on the PDF.js adapter.
**Depends on:** Phase 4
**Files created/modified:**
- `src/engine/PdfJsEngine.ts` — complete all remaining methods
- `src/engine/renderUtils.ts` — helper to size a canvas for a given viewport

**Acceptance:** A minimal test component renders page 1 of `sample-basic.pdf` into a visible `<canvas>`. Aborting a render via `AbortController` rejects with `RENDER_CANCELLED`.

---

### Phase 6: DocumentModel (Implementation)
**Goal:** Build the `DocumentModel` class wrapping pdf-lib with all edit operations.
**Depends on:** Phase 2
**Files created/modified:**
- `src/model/DocumentModel.ts` — full implementation of `fromBytes`, `pageCount`, `rotatePages`, `deletePages`, `reorderPages`, `extractPages`, `mergePdf`, `save`
- `src/model/index.ts`
- `package.json` — add `pdf-lib`, `uuid` dependencies

**Acceptance:** Unit tests cover: rotate page 1 by 90 degrees twice = 180 degrees; delete middle page of a 3-page doc; reorder page 3 to position 1; extract pages [1,3] into a new model with 2 pages; merge a 2-page PDF at index 2 of a 3-page doc = 5 pages; save produces valid PDF bytes that re-load without error.

---

### Phase 7: DocumentModel (Edge Cases + Tests)
**Goal:** Harden DocumentModel with edge-case validation and comprehensive tests.
**Depends on:** Phase 6
**Files created/modified:**
- `src/model/DocumentModel.ts` — add validation guards
- `src/model/__tests__/DocumentModel.test.ts`
- `vitest.config.ts`, `package.json` — add `vitest` dev dependency

**Acceptance:** Tests pass for: empty arrays (no-op), out-of-range page numbers (throws `RangeError`), duplicate page numbers (deduplicated), delete-all-pages (throws), `reorderPages(n, n)` (no-op), `mergePdf` at `pageCount+1` (append), extract with duplicates (page appears twice in output).

---

### Phase 8: File Picker Entry Screen
**Goal:** Build the `<FilePicker>` component with file input button, drag-and-drop zone, sample loader links, and engine selector.
**Depends on:** Phase 3
**Files created/modified:**
- `src/components/FilePicker/FilePicker.tsx`, `FilePicker.module.css`
- `src/components/FilePicker/EngineSelector.tsx`, `EngineSelector.module.css`
- `src/App.tsx`, `src/App.module.css` — wire up `currentView` state and file selection

**Acceptance:** App launches to a centered file picker. "Choose PDF" button opens a native file dialog filtered to `.pdf`. Dragging a PDF over the drop zone highlights it; dropping loads the file. "Try a sample" link loads `sample-basic.pdf`. Engine selector toggles between PDF.js and MuPDF. After any file selection, `onFileSelected` / `onSampleSelected` fires (logs to console — no viewer yet).

---

### Phase 9: PdfWorkspace + Single-Page Rendering
**Goal:** Build `PdfWorkspace` and `PageCanvas` to render a single PDF page on screen.
**Depends on:** Phase 5, Phase 8
**Files created/modified:**
- `src/components/PdfWorkspace/PdfWorkspace.tsx`, `PdfWorkspace.module.css`
- `src/components/PageViewport/PageCanvas.tsx`, `PageCanvas.module.css`
- `src/App.tsx` — mount `PdfWorkspace` when a file is selected from `FilePicker`; show a "Close" button that returns to the picker

**Acceptance:** Selecting a PDF from the file picker (via button, drag-drop, or sample link) transitions to `PdfWorkspace`, which loads the file via `PdfJsEngine`, renders page 1 into a canvas, and displays it. A "Close" button in the toolbar returns to the file picker entry screen.

---

### Phase 10: Viewer Toolbar + Zoom Controls
**Goal:** Build the complete `<ViewerToolbar>` with all 16 controls in the demo layout, including zoom, fit-to-page, view-mode dropdown, rotate left/right, print/download/upload buttons, and page navigator.
**Depends on:** Phase 9
**Files created/modified:**
- `src/components/ViewerToolbar/ViewerToolbar.tsx`, `ViewerToolbar.module.css` — full toolbar with all 16 controls
- `src/context/appReducer.ts` — add `ROTATE_VIEW` and `RELOAD_DOCUMENT` action handlers
- `src/components/PageViewport/PageCanvas.tsx` — respond to `zoomLevel`, `fitMode`, and `viewRotation` from context

**Acceptance:** The toolbar renders all 16 controls in the specified order with proper vertical dividers. View-mode dropdown opens and switches between Continuous / Single Page / Two-Page Spread. Zoom in/out step through presets. Zoom readout shows current percentage. Fit-to-page fits the full page in the viewport. Rotate left/right rotate the visual display by 90 degrees (does not mutate the PDF — purely visual). Page navigator shows "Page [input] X / N" with prev/next arrows. Print opens browser print dialog. Download saves the PDF. Upload opens a file picker to switch documents without returning to the entry screen. Refresh reloads the current PDF. Edit Pages button toggles editor mode.

---

### Phase 11: Multi-Page Scroll (Continuous Mode)
**Goal:** Build `PageViewport` with continuous scroll — render all pages in a column with virtualization.
**Depends on:** Phase 10
**Files created/modified:**
- `src/components/PageViewport/PageViewport.tsx`, `PageViewport.module.css`
- `src/hooks/useVisiblePages.ts` — IntersectionObserver hook to track which pages are in view
- `src/components/PageViewport/PageCanvas.tsx` — render/cancel based on visibility

**Acceptance:** All pages of `sample-basic.pdf` appear in a scrollable column. Only visible pages (plus a 1-page buffer above/below) are rendered to canvas. Scrolling updates `currentPage` in context. Zoom applies to all pages.

---

### Phase 12: Single-Page + Spread Layout Modes
**Goal:** Implement single-page and two-page spread layouts in `PageViewport`, activated by the view-mode dropdown built in Phase 10.
**Depends on:** Phase 11
**Files created/modified:**
- `src/components/PageViewport/PageViewport.tsx` — branch layout by `scrollMode`

**Acceptance:** Toggling to single-page mode shows one page at a time with prev/next navigation. Toggling to spread shows two pages side-by-side. A 5-page document shows spreads [1], [2-3], [4-5]. Mode survives zoom changes.

---

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

---

### Phase 15: Import / Merge + Extract
**Goal:** Wire the Import button to a hidden file input that merges an entire PDF into the current document, and wire the Extract button to download selected pages as a new PDF.
**Depends on:** Phase 14
**Files created/modified:**
- `src/components/EditorPanel/EditorToolbar.tsx` — add hidden `<input type="file">` ref, wire Import button to click it, wire `onChange` handler that reads bytes and calls `importPages` from the editor hook
- `src/hooks/useDocumentEditor.ts` — add `importPages(bytes: Uint8Array)` method: computes insertion index as `Math.max(...selectedPages) + 1` (or `pages.length` if nothing selected), calls `documentModel.mergePdf(bytes, insertIndex)`, serializes, reloads engine, dispatches `IMPORT_PAGES`
- `src/hooks/useDocumentEditor.ts` — add `extractPages()` method: calls `documentModel.extractPages(selectedPageNumbers)`, saves to bytes, triggers browser download

**Acceptance:** Click "Import" in the editor toolbar — native file picker opens. Select a PDF with 4 pages. All 4 pages appear in the grid immediately after the currently selected page (or at the end if nothing was selected). Page count increases by 4. Click Undo — the 4 imported pages disappear. Select pages 2 and 5, click "Extract" — a new PDF downloads containing exactly those 2 pages.

---

### Phase 16: Save + Print
**Goal:** Implement SaveButton (download edited PDF) and PrintButton (browser print).
**Depends on:** Phase 14
**Files created/modified:**
- `src/components/PdfWorkspace/SaveButton.tsx`
- `src/components/PdfWorkspace/PrintButton.tsx`
- `src/hooks/usePrint.ts` — renders all pages into a hidden iframe and calls `window.print()`
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — wire download/print buttons to these components

**Acceptance:** In editor mode, click "Save" (Download button) — the browser downloads a `.pdf` file containing all edits. In viewer mode, click "Print" — browser print dialog opens with all pages.

---

### Phase 17: Linearized Loading
**Goal:** Enable progressive rendering for URL-loaded PDFs using PDF.js range request support.
**Depends on:** Phase 11
**Files created/modified:**
- `public/samples/sample-linearized.pdf` — a linearized version of the large sample
- `src/engine/PdfJsEngine.ts` — configure `getDocument` with `{ disableAutoFetch: true, disableStream: false, rangeChunkSize: 65536 }`
- `src/components/PdfWorkspace/LoadingBar.tsx`, `LoadingBar.module.css` — progress bar component
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — show `LoadingBar` during load

**Acceptance:** Opening `sample-linearized.pdf` shows a progress bar. Page 1 renders before the progress bar reaches 100%. Scrolling to later pages that haven't streamed yet shows a placeholder spinner until their data arrives.

---

### Phase 18: Polish & Edge Cases
**Goal:** Handle error states, empty states, keyboard shortcuts, responsive layout, and visual polish.
**Depends on:** Phases 16, 17
**Files created/modified:**
- `src/components/ErrorBanner/ErrorBanner.tsx`, `ErrorBanner.module.css`
- `src/hooks/useKeyboardShortcuts.ts` — Ctrl+Z/Y (undo/redo), +/- (zoom), Left/Right (page nav)
- Various `.module.css` files — responsive breakpoints, transitions, focus styles
- `src/App.module.css` — global reset, font, colour variables

**Acceptance:** Loading a corrupt file shows an error banner with a dismiss button. Keyboard shortcuts work. The app is usable at 768px viewport width. Focus rings are visible for all interactive elements. No console errors or warnings.

---

### Phase 19: End-to-End Testing
**Goal:** Verify every functional requirement works in a real browser.
**Depends on:** Phase 18
**Files created/modified:**
- `e2e/viewer.spec.ts` — open PDF, zoom, navigate, switch scroll modes
- `e2e/editor.spec.ts` — rotate, delete, reorder, import, extract, save, copy, paste
- `e2e/linearized.spec.ts` — progressive loading progress bar
- `playwright.config.ts`, `package.json` — add Playwright dev dependency

**Acceptance:** All E2E tests pass. Every numbered functional requirement from our spec has at least one test that exercises it.

---

### Phase 20: Architecture Document
**Goal:** Write the required architecture doc with component diagram, state management explanation, tradeoffs, and roadmap.
**Depends on:** Phase 19
**Files created/modified:**
- `B/architecture.md`

**Acceptance:** Document contains: one Mermaid component diagram showing both engine paths, state management section (Context + useReducer rationale), key tradeoffs section (including PDF.js vs MuPDF dual-engine rationale), and an "if I had 1 more day" roadmap.

---

### Phase 21: MuPDF Engine Adapter
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

---

### Phase 22: Annotations (Text + Rectangle Redaction)
**Goal:** Implement text annotations and rectangle redaction using MuPDF's annotation API. Build the AnnotationToolbar (two tools only) and RedactionOverlay UI. Do not implement text-highlighter redaction (no text-layer selection for redaction).
**Depends on:** Phase 21
**Files created/modified:**
- `src/components/AnnotationToolbar/AnnotationToolbar.tsx`, `AnnotationToolbar.module.css`
- `src/components/PageViewport/RedactionOverlay.tsx`, `RedactionOverlay.module.css` — pointer handling for rectangle drag-draw only (no text-highlighter or text-selection redaction logic)
- `src/engine/MuPdfEngine.ts` — add `addTextAnnotation(pageIndex, x, y, text)`, `addRedaction(pageIndex, rect)`, `applyRedactions()` methods (MuPDF-specific, not on the PdfEngine interface)
- `src/hooks/useAnnotations.ts` — hook that bridges AnnotationToolbar state with MuPdfEngine methods
- `src/context/appReducer.ts` — add `APPLY_REDACTIONS` action handler
- `src/components/ViewerToolbar/ViewerToolbar.tsx` — conditionally show AnnotationToolbar toggle when MuPDF is active

**Acceptance:** With MuPDF active: click the text annotation tool, click on a page, type "Hello" — a text annotation appears. Click the rectangle redaction tool, draw a rectangle — a red overlay appears. Click "Apply Redactions" — the overlay turns black, and saving the PDF produces a file where the redacted text is irrecoverably removed (verify by searching the saved PDF). With PDF.js active: annotation toolbar buttons are visible but disabled with a tooltip "Requires MuPDF engine."

---

### Phase 23: Bookmarks Read/Write Panel
**Goal:** Build the BookmarkPanel as a collapsible right sidebar with read support on both engines and write support on MuPDF.
**Depends on:** Phase 21
**Files created/modified:**
- `src/components/BookmarkPanel/BookmarkPanel.tsx`, `BookmarkPanel.module.css`
- `src/components/BookmarkPanel/BookmarkNode.tsx` — recursive tree node component
- `src/engine/MuPdfEngine.ts` — add `addBookmark(title, pageIndex)`, `removeBookmark(id)`, `updateBookmark(id, title, pageIndex)` methods
- `src/hooks/useBookmarks.ts` — hook that loads bookmarks on document open (via `getOutline()`) and bridges write operations to MuPdfEngine
- `src/components/PdfWorkspace/PdfWorkspace.tsx` — add BookmarkPanel to layout, dispatch `SET_BOOKMARKS` after load

**Acceptance:** Open a PDF with an existing outline/bookmark tree. The BookmarkPanel shows the tree. Click a bookmark — the viewer navigates to the target page. With MuPDF: click "Add Bookmark" — a new bookmark appears for the current page. Edit its title. Save the PDF, re-open — the bookmark persists. With PDF.js: bookmarks are read-only; "Add" button is disabled with tooltip.

---

### Phase 24: Cursor AI Usage Log
**Goal:** Compile the Cursor usage log.
**Depends on:** Phase 23
**Files created/modified:**
- `docs/cursor-log.md`

**Acceptance:** Document includes: exported plan mode conversation, links to transcripts, change notes table, and validation notes.

---

## 9. Risks and Mitigations

### Phase 1: Project Scaffold
**Risk:** Vite's `public/` directory doesn't serve PDFs with the correct `Content-Type` or `Accept-Ranges` headers, silently breaking future linearized loading.
**Detection:** After scaffold is running, open DevTools Network tab, fetch `/samples/sample-basic.pdf`, and verify the response headers include `Content-Type: application/pdf` and `Accept-Ranges: bytes`.
**Mitigation:** Add a custom Vite plugin in `vite.config.ts` that sets `Content-Type` for `.pdf` files via the `configureServer` hook, or move PDFs to an explicit static middleware with correct headers.

### Phase 2: Core Types
**Risk:** `Set<number>` and `Map<number, ...>` in `AppState` are not structurally comparable — React's `useReducer` uses `Object.is` to decide whether to re-render, and creating a new `Set` with identical contents still triggers a re-render, while mutating an existing `Set` does *not* trigger one.
**Detection:** Add a temporary `console.log` in the reducer that logs `Object.is(oldState.selectedPages, newState.selectedPages)` after a `TOGGLE_PAGE_SELECTION` — if it's `true`, you're mutating instead of creating new Sets.
**Mitigation:** Establish a lint rule / code comment convention: every reducer branch that touches a `Set` or `Map` must spread into a new instance (`new Set([...prev, item])`), never call `.add()` / `.delete()` on the existing reference.

### Phase 3: App State & Context
**Risk:** A single monolithic `AppContext` causes every child to re-render on every action — zoom changes re-render the editor panel, selection changes re-render the page viewport.
**Detection:** Add `<React.Profiler>` around `EditorPanel` and `PageViewport`. Dispatch `SET_CURRENT_PAGE` (scroll-driven, fires at 60 Hz) and check if `EditorPanel` shows renders in the Profiler.
**Mitigation:** Split into `ViewerContext` and `EditorContext` as originally planned. Each context's provider only passes its slice of state, and consumers only subscribe to the context they need.

### Phase 4: PdfEngine Interface + PDF.js Adapter (Loading)
**Risk:** PDF.js's Web Worker fails to load in Vite's ESM dev server. `pdfjs-dist` ships a worker file that must be served separately, and Vite's module resolution doesn't find it — you get a silent fallback to main-thread parsing (10x slower) or a hard error.
**Detection:** After loading a PDF, open the browser console and check for `Warning: Setting up fake worker` — this means the worker failed to load and PDF.js fell back to synchronous parsing.
**Mitigation:** Explicitly set `pdfjs.GlobalWorkerOptions.workerSrc` to a URL imported via Vite's `?url` suffix: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;`.

### Phase 5: PDF.js Adapter (Rendering)
**Risk:** Calling `page.render()` while a previous render on the same canvas is still in progress throws `RenderingCancelledException` or silently corrupts the canvas — PDF.js does not queue renders, it errors.
**Detection:** Rapidly resize the browser window while a page is displayed. If you see a blank canvas, a partial paint, or a console error mentioning `RenderingCancelledException`, you have a race.
**Mitigation:** Track the current `RenderTask` in a ref. Before starting a new render, call `previousTask.cancel()` and `await` its promise (which rejects with `RenderingCancelledException`). Catch that specific error silently. Only then start the new render.

### Phase 6: DocumentModel (Implementation)
**Risk:** `pdf-lib`'s `PDFDocument.removePage(index)` mutates the internal page tree, shifting all subsequent page indices — a loop that deletes pages `[1, 3, 5]` in forward order actually deletes pages 1, 2, 3 (because each removal shifts the remaining indices).
**Detection:** Create a 5-page PDF, call `deletePages([1, 3, 5])`, then call `save()` and reload — if the surviving pages aren't the expected ones (original pages 2 and 4), the index math is wrong.
**Mitigation:** Sort page indices in descending order before the deletion loop: `indices.sort((a, b) => b - a)`. Deleting from the end first keeps all preceding indices stable.

### Phase 7: DocumentModel (Edge Cases + Tests)
**Risk:** `reorderPages` has an off-by-one after removal. When you remove page at index `from` and insert at index `to`, `to` refers to the post-removal array. If `from < to`, the target position in the original numbering is actually `to + 1`. Getting this wrong produces silent misordering that only manifests on specific from/to combinations.
**Detection:** Test `reorderPages(1, 3)` on a 5-page doc (`[A,B,C,D,E]`). Expected result: `[B,C,A,D,E]`. If you get `[B,A,C,D,E]`, the adjustment is wrong.
**Mitigation:** Decide on a clear semantic: "insert before position `to` in the original array" or "insert at position `to` in the post-removal array." Document it in the JSDoc and write tests for every quadrant: `from < to`, `from > to`, `from === to`, and boundary values.

### Phase 8: File Picker Entry Screen
**Risk:** The drag-and-drop zone's `dragenter`/`dragleave` events fire on child elements inside the drop zone, causing the highlight state to flicker rapidly as the cursor moves over inner text/icons — the `isDragOver` state toggles on and off dozens of times per second.
**Detection:** Drag a PDF over the entry screen. If the drop zone border flickers between highlighted and un-highlighted as the cursor moves, the event bubbling is unhandled.
**Mitigation:** Use a `dragEnterCount` ref: increment on `dragenter`, decrement on `dragleave`, set `isDragOver = count > 0`. Reset to 0 on `drop`. This accounts for enter/leave pairs from nested elements without relying on `e.target === e.currentTarget` checks, which fail with CSS pointer-events inheritance.

### Phase 9: PdfWorkspace + Single-Page Rendering
**Risk:** The canvas is painted at CSS pixel dimensions instead of device pixel dimensions, producing blurry text on Retina displays (every pixel is a 2x2 block of device pixels).
**Detection:** Open the app on a Retina display (or set Chrome DevTools device pixel ratio to 2). If text looks fuzzy compared to native PDF viewers, the canvas is not DPR-scaled.
**Mitigation:** Set `canvas.width = Math.floor(cssWidth * devicePixelRatio)` and `canvas.height = Math.floor(cssHeight * devicePixelRatio)`, then use CSS to constrain display size: `canvas.style.width = cssWidth + 'px'`. Pass `devicePixelRatio` through `RenderOptions.devicePixelRatio`.

### Phase 10: Viewer Toolbar + Zoom Controls
**Risk:** Fit-to-width zoom is computed from the container width at mount time, but the container width changes when panels open/close — the fit calculation becomes stale and the page is either clipped or floating in whitespace.
**Detection:** Set fit-to-width, then toggle a panel (e.g. bookmarks). If the page width doesn't adapt to the new container width, the fit is not reactive.
**Mitigation:** Use a `ResizeObserver` on the `PageViewport` container. When the observed width changes and `fitMode !== 'none'`, recompute the effective scale and trigger a re-render. Debounce the observer callback by one `requestAnimationFrame`.

### Phase 11: Multi-Page Scroll (Continuous Mode)
**Risk:** Rendering all pages eagerly on a 200-page PDF allocates 200 canvases and 200 render tasks, exhausting GPU memory and freezing the tab.
**Detection:** Open `sample-large.pdf` (50+ pages) and watch Chrome Task Manager's GPU memory column. If it climbs past 500 MB or the tab becomes unresponsive, virtualization is not working.
**Mitigation:** The `useVisiblePages` hook must gate rendering: only pages in the `IntersectionObserver`'s visible set (plus a 1-page buffer above/below) get `renderPage()` called. Off-screen pages render as empty `<div>`s sized to their `PageDimensions`.

### Phase 12: Single-Page + Spread Layout Modes
**Risk:** Two-page spread mode renders pages `[n, n+1]` side by side, but when the document has an odd page count, the last "spread" contains one page and the layout breaks — the single page is either stretched or the empty slot shows a glitched placeholder.
**Detection:** Open a 5-page PDF in spread mode, navigate to the last spread. If page 5 is stretched or misaligned, the odd-page case is unhandled.
**Mitigation:** When `pageCount` is odd, the final spread is a single-page spread. The layout code must check `if (rightPageIndex >= pageCount)` and render only the left page, centered or left-aligned.

### Phase 13: Editor Panel (Toolbar + Page Grid + Selection)
**Risk:** Entering editor mode requires reading the document bytes from `PdfEngine.getDocumentBytes()` and initializing a `DocumentModel`. For a large PDF loaded via URL, this call blocks until the full download completes — the user clicks "Edit Pages" and nothing happens for 10 seconds with no feedback.
**Detection:** Open the linearized sample, immediately click "Edit Pages" before the progress bar finishes. If the UI freezes or the editor takes > 2 seconds to appear with no loading indicator, the problem is present.
**Mitigation:** Show a spinner / "Preparing editor..." overlay while `getDocumentBytes()` is pending. Alternatively, start preloading the document model in the background as soon as `DOCUMENT_LOADED` fires.

### Phase 14: Editor Operations (Rotate, Delete, Reorder, Copy, Paste)
**Risk:** After a DocumentModel mutation, the viewer engine must be reloaded from the mutated bytes. If the reload replaces `pdfEngine` in context while `PageViewport` is mid-render, in-flight `RenderTask`s write to canvases associated with the wrong engine — producing ghost frames or crashes.
**Detection:** Delete a page and immediately switch to viewer mode. If you see a flash of the old page or a console error from PDF.js about a destroyed document, there's a lifecycle collision.
**Mitigation:** On engine reload: (1) call `oldEngine.destroy()` to cancel all in-flight renders, (2) wait for destruction to settle (one microtask tick), (3) dispatch `DOCUMENT_LOADED` with the new engine, (4) let React's reconciliation mount fresh `PageCanvas` components.

### Phase 15: Import / Merge + Extract
**Risk:** `pdf-lib`'s `copyPages` deep-copies fonts and images. Merging two PDFs that both embed the same 4 MB font produces an 8 MB output — and doing this repeatedly causes the in-memory `PDFDocument` to balloon without bound.
**Detection:** Import the same 10-page PDF three times. Check `documentModel.save()` byte length — if it grows linearly (30 MB for 30 identical pages), font deduplication is not happening.
**Mitigation:** This is a known pdf-lib limitation. Document it in the architecture tradeoffs section. For the MVP, accept the bloat. If it becomes a problem, post-process with `pdfDoc.save({ useObjectStreams: true })`.

### Phase 16: Save + Print
**Risk:** The print flow renders pages into a hidden iframe, but `window.print()` on the iframe captures the React host app (toolbar, sidebar) instead of just the PDF pages — because `window.print()` was called on the wrong window context, or CSS `@media print` styles aren't isolating the content.
**Detection:** Click Print, inspect the browser print preview. If you see the toolbar or other UI in the preview, print isolation is broken.
**Mitigation:** Create a dedicated `<iframe>` with `srcdoc` containing only a minimal HTML document. Render each page's canvas into `<img>` tags (via `canvas.toDataURL()`) inside the iframe's body. Call `iframe.contentWindow.print()`, not `window.print()`.

### Phase 17: Linearized Loading
**Risk:** PDF.js's range-request loading requires the server to respond with `206 Partial Content` and correct `Content-Range` headers. Vite's dev server supports this for static files, but in production builds, range requests may be unsupported or the PDF's linearization dictionary may be absent — causing a silent fallback to full-file download.
**Detection:** Open DevTools Network tab while loading the linearized PDF. Filter by the PDF URL. If you see a single `200` response instead of multiple `206` responses, range requests are not working.
**Mitigation:** Verify the sample PDF is actually linearized: run `qpdf --check-linearization sample-linearized.pdf` locally. Add a runtime check: if `onProgress` fires with `total === undefined`, show a determinate progress bar based on chunk count instead.

### Phase 18: Polish & Edge Cases
**Risk:** Keyboard shortcuts (`Ctrl+Z`, `Ctrl+-`, arrow keys) conflict with browser defaults — `Ctrl+-` zooms the browser viewport instead of the PDF, and intercepting it with `preventDefault()` breaks accessibility expectations.
**Detection:** Press `Ctrl+-` with the viewer focused. If the browser chrome zooms instead of the PDF zoom level changing, the shortcut isn't captured. If it is captured but the user can no longer zoom the browser at all, accessibility is broken.
**Mitigation:** Only capture shortcuts when focus is inside `PdfWorkspace` (check `event.target` or use a focus-scoping `<div>` with `tabIndex={0}` and `onKeyDown`). Don't capture browser-level shortcuts — use custom keys (`-`/`=` without modifier) when the workspace is focused.

### Phase 19: End-to-End Testing
**Risk:** Playwright can't interact with `<canvas>` elements — it can click at coordinates but can't assert that a PDF page rendered correctly, because canvas content is opaque pixels. Tests pass even if the canvas is blank.
**Detection:** Temporarily break `renderPage` (return without painting). If E2E tests still pass, they're not verifying rendered output.
**Mitigation:** Use `canvas.toDataURL()` and screenshot comparison: Playwright's `expect(page).toHaveScreenshot()` with a stored baseline image, or assert `canvas.toDataURL().length > threshold` (a blank canvas produces a very short data URL).

### Phase 20: Architecture Document
**Risk:** The Mermaid component diagram doesn't render in GitHub's Markdown preview because it uses syntax features that GitHub's Mermaid renderer doesn't support (e.g., `classDef` with coloring, `click` events, or subgraph nesting deeper than 2 levels).
**Detection:** Push the doc to GitHub and view it in the browser. If the diagram shows as raw text instead of a rendered graphic, it's broken.
**Mitigation:** Test the Mermaid syntax in the Mermaid Live Editor before committing. Stick to simple `flowchart TD` with basic nodes and edges. Avoid styling directives. As a fallback, render the diagram locally and embed it as a PNG.

### Phase 21: MuPDF Engine Adapter
**Risk:** MuPDF's WASM module requires `SharedArrayBuffer`, which browsers only expose when the page is served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. Without these, `new SharedArrayBuffer()` throws `TypeError`, and MuPDF fails to initialize — but the error surfaces deep inside the WASM glue code as an opaque "memory allocation failed" message, not as a clear COOP/COEP error.
**Detection:** Select MuPDF engine, open a PDF. If the console shows `TypeError: SharedArrayBuffer is not defined` or `RuntimeError: memory access out of bounds`, the headers are missing.
**Mitigation:** Configure Vite's dev server to send both headers: `server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } }` in `vite.config.ts`. Add a runtime check in `MuPdfEngine.loadFromBuffer`: test `typeof SharedArrayBuffer !== 'undefined'` before initializing, and throw a clear `PdfEngineError('LOAD_FAILED', 'MuPDF requires COOP/COEP headers for SharedArrayBuffer. See README.')` if missing. Note: these headers break cross-origin resources (e.g. Google Fonts via CDN) — verify no external resources are loaded, or add `crossorigin` attributes where needed.

### Phase 22: Annotations (Text + Rectangle Redaction)
**Risk:** MuPDF's annotation API operates in WASM memory on the C-side document, but our rendering pipeline re-renders pages via `renderPage()` which may cache the previous rasterization. After adding a text annotation or applying a redaction, the canvas shows the old page without the annotation because MuPDF's internal render cache was not invalidated.
**Detection:** Add a text annotation, then look at the canvas. If the annotation text is not visible on the rendered page, the cache is stale.
**Mitigation:** After any annotation mutation, call `renderPage()` again with a fresh `AbortController` signal. Ensure the `MuPdfEngine.renderPage` implementation does not cache rasterized output — it should re-rasterize from the MuPDF document object on every call. If MuPDF does cache internally, call the WASM-side cache invalidation function (e.g., dropping and re-creating the display list for that page) before rendering.

### Phase 23: Bookmarks Read/Write Panel
**Risk:** MuPDF's bookmark/outline API exposes a flat or nested C struct, and mapping it to/from our `Bookmark` TypeScript interface requires careful index management. Adding a bookmark at the WASM level then reading the outline back may produce a different tree structure than expected if nested bookmarks are not handled correctly (e.g., a child bookmark appears as a root sibling).
**Detection:** Add a bookmark, save, re-open. If the bookmark tree in the panel doesn't match what was created (wrong nesting, missing children, duplicate entries), the mapping is incorrect.
**Mitigation:** Write the bookmark read/write integration against MuPDF's outline API incrementally: first verify `getOutline()` reads an existing outline correctly, then add one flat bookmark and verify round-trip, then test nested bookmarks. Keep the `Bookmark` interface flat enough that the mapping is straightforward (parent pointer via index rather than deep nesting).

### Phase 24: Cursor AI Usage Log
**Risk:** Cursor's chat export truncates long conversations or omits tool-use blocks, making the log incomplete — the evaluator sees "you used AI" but can't assess how or what you changed.
**Detection:** Export the transcript and search for the planning conversation from Prompt 1. If it's missing or truncated, the export is incomplete.
**Mitigation:** Supplement the export with manual notes written during each phase: a 2-3 sentence entry per phase noting "AI suggested X, I kept/changed Y, validated by Z." Keep these notes in `docs/cursor-log.md` incrementally.

---

## 10. Acceptance Criteria

### A.1 — PDF Viewing and Navigation

- [ ] **REQ-1: Open a sample PDF** — On the entry screen, click "Try a sample." The sample PDF renders in the viewer within 2 seconds. The filename appears in the toolbar.
- [ ] **REQ-2: Open a local PDF via file picker** — On the entry screen, click "Choose PDF", select a PDF from disk. The file renders in the viewer. Alternatively, drag-and-drop a PDF onto the drop zone — same result.
- [ ] **REQ-3: High-fidelity rendering** — Open a PDF with mixed content (text, images, vector graphics, embedded fonts). Compare visually to the same file in Chrome's native PDF viewer. Text is crisp; images are not pixelated; vector lines are smooth.
- [ ] **REQ-4: Zoom in** — Click the zoom-in button three times. Each click increases the displayed zoom percentage. Page content scales up and remains sharp.
- [ ] **REQ-5: Zoom out** — Click the zoom-out button three times. Each click decreases the displayed zoom percentage. Page content scales down.
- [ ] **REQ-6: Fit-to-width** — Click the fit-to-width button. The page width matches the viewport width exactly. Resize the browser window — the page width adjusts to match.
- [ ] **REQ-7: Fit-to-page** — Click the fit-to-page button. The entire page (including height) is visible without scrolling. Resize the browser — the page rescales to stay fully visible.
- [ ] **REQ-8: Continuous scroll mode** — Select continuous mode. All pages appear in a single scrollable column. Scrolling smoothly transitions between pages. The page navigator updates as you scroll.
- [ ] **REQ-9: Single-page mode** — Select single-page mode. Only one page is visible. Click next/prev to navigate. No partial pages are shown.
- [ ] **REQ-10: Two-page spread mode** — Select spread mode. Two pages appear side-by-side. A 5-page document shows spreads [1], [2-3], [4-5]. Navigate with next/prev.
- [ ] **REQ-11: Page navigation — prev/next** — Click the next-page arrow repeatedly until the last page. The prev-page arrow navigates back. At page 1, prev is disabled. At the last page, next is disabled.
- [ ] **REQ-12: Page navigation — direct input** — Type "7" into the page number input and press Enter. The viewport jumps to page 7. Type "999" — the input clamps to the last page, no error.
- [ ] **REQ-13: Linearized loading** — Open the linearized sample PDF. A progress bar appears. Page 1 renders while the progress bar is still incomplete. Scrolling to an unloaded page shows a spinner until its data arrives.

### A.2 — PDF Editing (Document Editor)

- [ ] **REQ-14: Enter editor mode** — Click the "Edit Pages" button in the toolbar. The main area switches to a page grid showing all pages as thumbnails with checkboxes. The editor toolbar shows all 13 buttons.
- [ ] **REQ-15: Exit editor mode** — Click "Edit Pages" again to leave editor mode. The viewer renders the document with all edits applied. Page count in the navigator reflects any deletions or imports.
- [ ] **REQ-16: Page selection** — Click a page card — it gets a blue selection border and checkbox. Click again — it deselects. Click "Select None" — all deselected.
- [ ] **REQ-17: Page rotation** — Select pages 1 and 3. Click "Rotate Pages Right". Both thumbnails rotate 90 degrees clockwise. Click "Rotate Pages Right" again — they're now at 180 degrees. Switch to viewer mode — pages 1 and 3 render rotated.
- [ ] **REQ-18: Page reordering** — Drag page 4 and drop it before page 2. The grid shows the new order. Switch to viewer mode — the page order matches the reordered grid.
- [ ] **REQ-19: Page deletion** — Select pages 2 and 3 in a 5-page document. Click "Delete Pages". The grid now shows 3 pages. Page count reads "3". Attempt to delete all remaining pages — an error message appears, deletion is blocked.
- [ ] **REQ-20: Copy and Paste Pages** — Select pages 1 and 3. Click "Copy Pages". Click "Paste Pages" — pages 1 and 3 are duplicated at the end of the document. Page count increases by 2. Paste again — another copy appears. With nothing copied, Paste is disabled.
- [ ] **REQ-21: Page import / merge** — In editor mode, click "Import" in the toolbar. A native file picker opens. Select a second PDF from disk. All pages of that PDF are inserted into the current document at the position after the currently selected page (or at the end if no page is selected). Page count increases by the imported document's page count. Undo removes all imported pages.
- [ ] **REQ-22: Page extraction** — Select pages 2, 4, and 5. Click "Extract Pages". A new PDF downloads containing exactly those 3 pages in that order. Open the downloaded file in another viewer to confirm.
- [ ] **REQ-23: Undo** — Rotate a page, then click Undo. The rotation reverts. The grid shows the page at its original orientation.
- [ ] **REQ-24: Redo** — After undoing, click Redo. The rotation re-applies. Redo is disabled when there's nothing to redo.
- [ ] **REQ-25: Editor thumbnail zoom** — Click Zoom In in the editor toolbar — page thumbnails in the grid grow larger. Click Zoom Out — they shrink. The grid reflows to fit the new size.
- [ ] **REQ-26: Export edited PDF** — Rotate page 1, delete page 3, reorder page 4 to position 2. Click "Download". A PDF downloads. Open it in Chrome's native viewer — page 1 is rotated, page 3 is gone, the page that was 4 is now second.

### A.3 — Printing

- [ ] **REQ-27: Print action** — Click the Print button. The browser print dialog opens. The print preview shows only the PDF pages — no toolbar or app UI is visible. All pages are present and correctly oriented.

### A.4 — Export and Conversion

- [ ] **REQ-28: Export with specific pages** — Enter editor mode, select pages 1, 3, 5. Click "Extract Pages". The downloaded PDF contains exactly pages 1, 3, 5. File size is smaller than the original.
- [ ] **REQ-29: Save PDF to local** — Open a PDF, make no edits, click "Download". The original PDF downloads to the local filesystem with the original filename.
- [ ] **REQ-30: Save edited PDF to local** — Make edits (rotate + delete), click "Download". The downloaded file opens in an external viewer and reflects all edits.

### A.5 — WebAssembly Tier (MuPDF Engine)

- [ ] **REQ-31: Redaction — rectangle** — *Requires MuPDF engine.* Select the rectangle redaction tool. Draw a rectangle over sensitive text. The area is visually blacked out. Click "Apply Redactions." Save the PDF — the redacted content is irrecoverably removed from the file (verify by searching for the original text in the saved file).
- [ ] **REQ-32: Text annotations** — *Requires MuPDF engine.* Select the text annotation tool. Click on a page and type a note. The annotation appears as a positioned text box. Save and reopen — the annotation persists.
- [ ] **REQ-33: Signature form fields** — *Requires MuPDF engine.* Open a PDF that contains a signature form field. The field area is rendered as a static visual with a label indicating it's a signature field. Clicking it does NOT open an input UI.
- [ ] **REQ-34: Widget annotations** — *Requires MuPDF engine.* Open a PDF with form fields. Checkboxes and text inputs are rendered as static visuals matching their declared state in the PDF. Clicking them does nothing.
- [ ] **REQ-35: Bookmarks — read** — *Requires MuPDF engine.* Open a PDF that contains an outline/bookmark tree. A bookmark panel displays the tree. Click a bookmark — the viewer navigates to the target page.
- [ ] **REQ-36: Bookmarks — write** — *Requires MuPDF engine.* Add a new bookmark titled "My Note" pointing to page 5. Save the PDF, reopen it — the bookmark appears in the outline tree.
- [ ] **REQ-37: Engine selector** — On the entry screen, toggle the engine selector to MuPDF. A warning displays ("~10 MB WASM download, no progressive loading"). Open a PDF — it loads via MuPDF (verify via toolbar engine indicator). Toggle back to PDF.js, re-open — it loads via PDF.js. The WASM binary is only fetched on first MuPDF selection (verify Network tab).
- [ ] **REQ-38: Annotation tools disabled under PDF.js** — With PDF.js active, the annotation toolbar buttons are visible but disabled. Hovering shows a tooltip: "Requires MuPDF engine." No crash or error when clicking a disabled button.

### B — Architecture & Design Document

- [ ] **REQ-39: Component diagram** — `B/architecture.md` contains a Mermaid (or image) component diagram showing all major components including the dual-engine path.
- [ ] **REQ-40: State management description** — The document explains Context + useReducer, the two context split (Viewer/Editor), and why external libraries were not used.
- [ ] **REQ-41: Key tradeoffs** — At least three tradeoff decisions are discussed with alternatives considered, including the dual-engine (PDF.js default / MuPDF opt-in) rationale.
- [ ] **REQ-42: "If I had 1 more day" roadmap** — A concrete list of next steps, not vague aspirations.

### C — Cursor AI Usage Log

- [ ] **REQ-43: Plan mode output** — `docs/cursor-log.md` includes the planning conversation or a summary of key decisions made during planning.
- [ ] **REQ-44: Exported transcript** — At least one full Composer session transcript is included or linked.
- [ ] **REQ-45: Change notes** — A table or list documenting at least 5 instances where AI output was modified, with the original suggestion, the change made, and the reason.
- [ ] **REQ-46: Validation notes** — For each major feature, a sentence describing how correctness was verified.

---

## 11. Quality Bar

These are not in the spec but a senior reviewer will check them:

- [ ] **QA-1: TypeScript strict mode** — `tsconfig.json` has `"strict": true`. Running `npx tsc --noEmit` produces zero errors.
- [ ] **QA-2: No console errors** — Open the app in Chrome, navigate through all major flows (open PDF, zoom, edit, save, print). The console shows zero `Error`-level messages.
- [ ] **QA-3: No unexpected console warnings** — Console warnings are limited to known PDF.js noise (`Warning: TT: undefined function` from malformed fonts). No React warnings (`key` prop, deprecated lifecycle, act() warnings).
- [ ] **QA-4: Accessibility — critical/serious** — Run axe DevTools on the entry screen and the PDF viewer. Zero critical or serious violations. (Minor/moderate are acceptable for canvas-based content.)
- [ ] **QA-5: README setup instructions** — `README.md` contains: prerequisites (Node version), install command (`npm install`), dev command (`npm run dev`), build command (`npm run build`), and a one-sentence project description. A fresh clone following these steps results in a running app.
- [ ] **QA-6: Clean build** — `npm run build` completes with zero errors and zero warnings. The `dist/` output is servable via `npx vite preview`.
- [ ] **QA-7: Deliverable structure** — The repo root contains the three deliverables clearly organized: the app source (`src/`), architecture doc (`B/architecture.md`), and Cursor log (`docs/cursor-log.md`).
- [ ] **QA-8: No secrets or large binaries committed** — `.gitignore` excludes `node_modules/`, `dist/`, `.env`. Sample PDFs in `public/samples/` are under 5 MB each.
- [ ] **QA-9: Retina rendering** — On a HiDPI display (or with Chrome DevTools DPR override set to 2), PDF text is sharp and not blurry.
- [ ] **QA-10: Responsive layout** — At 768px viewport width, the app is usable: toolbar wraps or uses overflow menu, page grid adjusts column count.

---

## 12. Known Limitations

- **Scan button** — the "Scan" button in the editor toolbar is a stub that logs to console. Scanner hardware integration is out of scope for a browser-based SDK.
- **pdf-lib font deduplication** — `pdf-lib`'s `copyPages` does not deduplicate embedded fonts/images across imports. Repeated imports of the same PDF will cause output file size to grow linearly. Documented in the architecture tradeoffs.
- **Linearized loading with MuPDF** — MuPDF does not support progressive/linearized rendering. When MuPDF is selected, the full PDF must be downloaded before the first page renders. The progress bar still displays download progress.
- **COOP/COEP headers** — MuPDF's `SharedArrayBuffer` requirement means the Vite dev server must serve COOP/COEP headers. This can break cross-origin resources (fonts, images loaded from CDNs). The app uses no external CDN resources to avoid this conflict.
- **Text-highlighter redaction** — requires text-layer hit testing and selection state management; rectangle redaction provides equivalent capability for the demo.
- **Interactive signature creation** — read-only rendering of existing signature fields is supported; drawing/applying new signatures is out of scope.
- **Interactive form widgets** — read-only rendering of checkboxes/text inputs/radios is supported; user-driven form filling is out of scope.
