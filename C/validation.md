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