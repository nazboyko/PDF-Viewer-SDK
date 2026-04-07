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

## Phase 12 — Single-page and Spread modes
- Three view modes work, dropdown opens correctly
- Spread mode handles odd page count (last page alone, not stretched)
- currentPage preserved across mode switches

## Phase 13 — Editor Panel
- All 13 editor toolbar buttons present
- Page thumbnails render in 4-col grid
- Selection state works with single + multi-select
- Editor zoom resizes thumbnails (separate from document zoom)
- No mutations wired yet (Phase 14)

## Phase 14 — Editor Operations
- Rotate, Delete, Reorder, Copy, Paste all work
- Undo/Redo work across all operations
- Engine reload after mutation does not throw "destroyed document"
- Viewer reflects edits after exiting editor mode

## Phase 15 — Import / Extract
- Import inserts pages at correct position (after selected, or at end)
- Extract downloads new PDF with correct pages
- Downloaded file opens correctly in external viewer

## Phase 16 — Save + Print
- Download triggers file save with current document state
- Edited files reflect mutations correctly
- Print dialog shows PDF pages only, no app chrome
- Print uses isolated iframe approach

## Phase 17 — Linearized Loading
- Generated sample-linearized.pdf with qpdf
- Verified linearization with qpdf --check-linearization
- Network tab shows multiple HTTP 206 responses
- Progress bar fills smoothly
- Page 1 renders before progress completes