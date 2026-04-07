import type { EnginePreference, FitMode, PageDescriptor, ScrollMode } from './model';

/**
 * Stand-ins for `pdfjs-dist` / `pdf-lib` document handles until Phases 4 and 6 add those
 * dependencies; replace with real imports when packages are installed.
 */
export type PDFDocumentProxy = object;
export type PDFDocument = object;

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
  /** 0-indexed target page */
  pageIndex: number;
  children: Bookmark[];
}

export interface AppState {
  // -- Document instances --
  pdfEngine: PDFDocumentProxy | null;
  documentModel: PDFDocument | null;
  /** Display name of the open file */
  filename: string | null;

  // -- Engine selection --
  /** Which engine to instantiate on next document load */
  enginePreference: EnginePreference;
  /** Which engine is currently loaded (null = no doc) */
  activeEngineName: 'pdfjs' | 'mupdf' | null;

  // -- Viewer --
  pageCount: number;
  /** 1-indexed visible page */
  currentPage: number;
  /** Scale factor: 1.0 = 100%. Authoritative when fitMode is 'none' */
  zoomLevel: number;
  /** 'none': manual zoom; 'width'/'page': computed by PageViewport */
  fitMode: FitMode;
  /** Layout strategy for PageViewport */
  scrollMode: ScrollMode;
  /** Visual-only rotation applied in viewer (does not mutate PDF) */
  viewRotation: 0 | 90 | 180 | 270;

  // -- Editor --
  /** true = show EditorPanel, false = show PageViewport */
  isEditorMode: boolean;
  /** Ordered page list; source of truth for page order/rotation */
  pages: PageDescriptor[];
  /** Indices into pages[] currently selected in editor */
  selectedPages: Set<number>;
  /** Indices into pages[] stored by COPY_PAGES, consumed by PASTE_PAGES */
  copiedPageIndices: number[];
  /** Scale factor for page grid thumbnails: 1.0 = default, 0.5..2.0 range */
  editorThumbnailScale: number;
  /** Previous page-list snapshots (most recent last) */
  undoStack: ReadonlyArray<PageDescriptor[]>;
  /** Undone snapshots available for redo */
  redoStack: ReadonlyArray<PageDescriptor[]>;

  // -- Loading / Error --
  isLoading: boolean;
  /** 0..1 fraction; updated by PDF.js onProgress callback */
  loadingProgress: number;
  /** Non-null = display error banner */
  error: string | null;

  // -- Annotations (active when MuPDF engine is loaded) --
  activeAnnotationTool: AnnotationTool;
  /** Page number (1-indexed) -> rects drawn on that page */
  redactionOverlays: Map<number, RedactionRect[]>;
  /** Bookmark tree (read from PDF or user-created) */
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

export type AppAction =
  // === Document lifecycle — dispatched by <PdfWorkspace> ===
  | { type: 'DOCUMENT_LOAD_START'; filename: string }
  | { type: 'DOCUMENT_LOAD_PROGRESS'; progress: number }
  | {
      type: 'DOCUMENT_LOADED';
      engine: PDFDocumentProxy;
      model: PDFDocument;
      pageCount: number;
      pages: PageDescriptor[];
    }
  | { type: 'DOCUMENT_LOAD_ERROR'; error: string }
  | { type: 'DOCUMENT_CLOSED' }

  // === Engine selection ===
  | { type: 'SET_ENGINE_PREFERENCE'; preference: EnginePreference }

  // === Navigation ===
  | { type: 'SET_CURRENT_PAGE'; page: number }

  // === Zoom ===
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'SET_ZOOM'; level: number }
  | { type: 'SET_FIT_MODE'; mode: FitMode }

  // === Scroll / view mode ===
  | { type: 'SET_SCROLL_MODE'; mode: ScrollMode }

  // === View rotation (visual only, does not mutate the PDF) ===
  | { type: 'ROTATE_VIEW'; delta: 90 | -90 }
  | { type: 'RELOAD_DOCUMENT' }

  // === Editor mode toggle ===
  | { type: 'ENTER_EDITOR' }
  | { type: 'EXIT_EDITOR' }

  // === Page selection (editor) — none of these touch undoStack ===
  | { type: 'TOGGLE_PAGE_SELECTION'; index: number }
  | { type: 'SET_SELECTED_PAGES'; indices: Set<number> }
  | { type: 'SELECT_ALL_PAGES' }
  | { type: 'CLEAR_SELECTION' }

  // === Page manipulation (editor) — all push to undoStack, clear redoStack ===
  | { type: 'ROTATE_PAGES'; indices: number[]; delta: 90 | -90 }
  | { type: 'REORDER_PAGE'; fromIndex: number; toIndex: number }
  | { type: 'DELETE_PAGES'; indices: number[] }
  | { type: 'IMPORT_PAGES'; newPages: PageDescriptor[]; atIndex: number }

  // === Copy / Paste pages (editor) ===
  | { type: 'COPY_PAGES' }
  | { type: 'PASTE_PAGES' }

  // === Editor thumbnail zoom ===
  | { type: 'SET_EDITOR_THUMBNAIL_SCALE'; scale: number }

  // === Undo / Redo ===
  | { type: 'UNDO' }
  | { type: 'REDO' }

  // === Annotations (MuPDF-only; reducer no-ops if activeEngineName !== 'mupdf') ===
  | { type: 'SET_ANNOTATION_TOOL'; tool: AnnotationTool }
  | { type: 'ADD_REDACTION'; pageNumber: number; rect: RedactionRect }
  | { type: 'REMOVE_REDACTION'; pageNumber: number; rectIndex: number }
  | { type: 'APPLY_REDACTIONS' }
  | { type: 'SET_BOOKMARKS'; bookmarks: Bookmark[] }
  | { type: 'ADD_BOOKMARK'; bookmark: Bookmark }
  | { type: 'UPDATE_BOOKMARK'; id: string; updates: Partial<Pick<Bookmark, 'title' | 'pageIndex'>> }
  | { type: 'REMOVE_BOOKMARK'; id: string };
