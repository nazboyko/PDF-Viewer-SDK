## Phase 1 — Project Scaffold
- npm install: clean
- npm run dev: serves on :5173
- COOP/COEP headers present in response
- tsc --noEmit: 0 errors
- React placeholder renders

## Phase 2 — Core Types
- All four type files created in A/src/types/
- tsc --noEmit: 0 errors
- AppState/AppAction match plan section 5

## Phase 3 — App State & Context
- Two contexts (Viewer + Editor) created
- Reducer exhaustive, default case has never check
- All Set/Map updates create new instances
- tsc --noEmit: 0 errors

## Phase 4 — PdfEngine Interface + PDF.js Adapter (Loading)
- PdfJsEngine class implements interface
- Worker import uses ?url suffix (verified by hand)
- tsc --noEmit: 0 errors
- Render method stubbed, will be implemented in Phase 5

## Phase 5 — PDF.js Adapter (Rendering)
- renderPage uses devicePixelRatio for crisp retina rendering
- AbortSignal handler calls renderTask.cancel
- getOutline maps PDF.js outline to OutlineNode[]
- tsc --noEmit: 0 errors

## Phase 6 — DocumentModel
- All 8 methods implemented
- deletePages sorts descending before loop
- reorderPages handles from<to and from>to cases
- 1-indexed public API, 0-indexed pdf-lib internal
- tsc --noEmit: 0 errors
- Tests come in Phase 7

## Phase 7 — DocumentModel tests
- vitest installed
- N tests pass (replace N)
- Edge cases covered: empty array, out-of-range, delete-all, duplicate pages
- Reorder tested both directions

## Phase 8 — File Picker Entry Screen
- FilePicker renders centered on entry
- EngineSelector toggle persists to localStorage (verified across reload)
- File picker reads arrayBuffer immediately in onChange
- Drag-and-drop drop zone highlights on dragover

## Phase 9 — PdfWorkspace + Single-Page Rendering
- End-to-end byte flow works: FilePicker → engine → render
- Page 1 of sample PDF renders crisp
- No fake worker warning
- Engine destroyed on workspace unmount

## Phase 10 — Viewer Toolbar + Zoom Controls
- All 16 toolbar buttons present in correct order
- Zoom in/out, fit-to-page, fit-to-width all work
- Page input navigates correctly
- Edit Pages button visually toggles active state
- ResizeObserver triggers fit recalc on window resize

## Phase 11 — Continuous scroll
- Virtualized: only ±1 page rendered to canvas
- Scrolled through 100+ page PDF, GPU memory stayed below 200 MB
- Page input still navigates correctly
- Scroll-driven currentPage updates work