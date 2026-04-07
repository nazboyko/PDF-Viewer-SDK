import type { PageDescriptor } from '@/types/model';
import type { AppAction, AppState, Bookmark } from '@/types/state';
import { initialState as baseInitialState } from '@/types/state';

const ZOOM_PRESETS: readonly number[] = [
  0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5,
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function nextZoomUp(current: number): number {
  const i = ZOOM_PRESETS.findIndex((z) => z > current);
  return i === -1 ? ZOOM_PRESETS[ZOOM_PRESETS.length - 1]! : ZOOM_PRESETS[i]!;
}

function nextZoomDown(current: number): number {
  const rev = [...ZOOM_PRESETS].reverse();
  const i = rev.findIndex((z) => z < current);
  return i === -1 ? ZOOM_PRESETS[0]! : rev[i]!;
}

function rotatePageRotation(
  r: PageDescriptor['rotation'],
  delta: 90 | -90,
): PageDescriptor['rotation'] {
  const order: PageDescriptor['rotation'][] = [0, 90, 180, 270];
  return order[(order.indexOf(r) + delta / 90 + 4) % 4]!;
}

function snapshotPages(pages: readonly PageDescriptor[]): PageDescriptor[] {
  return pages.map((p) => ({ ...p }));
}

function reorderArray<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function updBm(
  list: readonly Bookmark[],
  id: string,
  u: Partial<Pick<Bookmark, 'title' | 'pageIndex'>>,
): Bookmark[] {
  return list.map((b) =>
    b.id === id
      ? { ...b, ...u, children: [...b.children] }
      : {
          ...b,
          children: b.children.length ? updBm(b.children, id, u) : [...b.children],
        },
  );
}

function rmBm(list: readonly Bookmark[], id: string): Bookmark[] {
  return list
    .filter((b) => b.id !== id)
    .map((b) => ({ ...b, children: rmBm(b.children, id) }));
}

function cloneBm(b: Bookmark): Bookmark {
  return { ...b, children: b.children.map(cloneBm) };
}

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function emptyDoc(enginePreference: AppState['enginePreference']): AppState {
  return {
    ...baseInitialState,
    enginePreference,
    selectedPages: new Set(),
    redactionOverlays: new Map(),
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'DOCUMENT_LOAD_START':
      return { ...state, filename: action.filename, isLoading: true, loadingProgress: 0, error: null };
    case 'DOCUMENT_LOAD_PROGRESS':
      return { ...state, loadingProgress: clamp(action.progress, 0, 1) };
    case 'DOCUMENT_LOADED':
      return {
        ...state,
        pdfEngine: action.engine,
        documentModel: action.model,
        pageCount: action.pageCount,
        currentPage: 1,
        pages: action.pages,
        isEditorMode: false,
        selectedPages: new Set(),
        copiedPageIndices: [],
        undoStack: [],
        redoStack: [],
        isLoading: false,
        loadingProgress: 1,
        error: null,
        activeEngineName: state.enginePreference,
      };
    case 'DOCUMENT_LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'DOCUMENT_CLOSED':
      return emptyDoc(state.enginePreference);
    case 'SET_ENGINE_PREFERENCE':
      return { ...state, enginePreference: action.preference };
    case 'SET_CURRENT_PAGE': {
      const max = Math.max(1, state.pageCount);
      return { ...state, currentPage: clamp(action.page, 1, max) };
    }
    case 'ZOOM_IN':
      return { ...state, zoomLevel: nextZoomUp(state.zoomLevel), fitMode: 'none' };
    case 'ZOOM_OUT':
      return { ...state, zoomLevel: nextZoomDown(state.zoomLevel), fitMode: 'none' };
    case 'SET_ZOOM':
      return { ...state, zoomLevel: clamp(action.level, 0.25, 5), fitMode: 'none' };
    case 'SET_FIT_MODE':
      return { ...state, fitMode: action.mode };
    case 'SET_SCROLL_MODE':
      return { ...state, scrollMode: action.mode };
    case 'ROTATE_VIEW': {
      const next = (state.viewRotation + action.delta + 360) % 360;
      const r = (next === 0 || next === 90 || next === 180 || next === 270 ? next : 0) as AppState['viewRotation'];
      return { ...state, viewRotation: r };
    }
    case 'RELOAD_DOCUMENT':
      return { ...state, error: null };
    case 'ENTER_EDITOR':
      return { ...state, isEditorMode: true, selectedPages: new Set() };
    case 'EXIT_EDITOR': {
      const max = Math.max(1, state.pageCount);
      return {
        ...state,
        isEditorMode: false,
        selectedPages: new Set(),
        currentPage: state.pageCount === 0 ? 1 : clamp(state.currentPage, 1, max),
      };
    }
    case 'TOGGLE_PAGE_SELECTION': {
      const next = new Set(state.selectedPages);
      if (next.has(action.index)) next.delete(action.index);
      else next.add(action.index);
      return { ...state, selectedPages: next };
    }
    case 'SET_SELECTED_PAGES':
      return { ...state, selectedPages: new Set(action.indices) };
    case 'SELECT_ALL_PAGES':
      return {
        ...state,
        selectedPages: new Set(Array.from({ length: state.pages.length }, (_, i) => i)),
      };
    case 'CLEAR_SELECTION':
      return { ...state, selectedPages: new Set() };
    case 'ROTATE_PAGES': {
      if (action.indices.length === 0) return state;
      const before = snapshotPages(state.pages);
      const nextPages = state.pages.map((p, i) =>
        action.indices.includes(i)
          ? { ...p, rotation: rotatePageRotation(p.rotation, action.delta) }
          : p,
      );
      return {
        ...state,
        pages: nextPages,
        undoStack: [...state.undoStack, before],
        redoStack: [],
      };
    }
    case 'REORDER_PAGE': {
      const { fromIndex, toIndex } = action;
      if (fromIndex < 0 || fromIndex >= state.pages.length || toIndex < 0 || toIndex >= state.pages.length) {
        return state;
      }
      const before = snapshotPages(state.pages);
      const nextPages = reorderArray(state.pages, fromIndex, toIndex);
      const curIdx = state.currentPage - 1;
      const nextCurrent = curIdx === fromIndex ? toIndex + 1 : state.currentPage;
      return {
        ...state,
        pages: nextPages,
        selectedPages: new Set(),
        undoStack: [...state.undoStack, before],
        redoStack: [],
        currentPage: nextCurrent,
      };
    }
    case 'DELETE_PAGES': {
      const delSet = new Set(action.indices);
      if (delSet.size === 0) return state;
      const before = snapshotPages(state.pages);
      const nextPages = state.pages.filter((_, i) => !delSet.has(i));
      const newCount = nextPages.length;
      return {
        ...state,
        pages: nextPages,
        pageCount: newCount,
        selectedPages: new Set(),
        undoStack: [...state.undoStack, before],
        redoStack: [],
        currentPage: newCount === 0 ? 1 : Math.min(state.currentPage, newCount),
      };
    }
    case 'IMPORT_PAGES': {
      const before = snapshotPages(state.pages);
      const next = [...state.pages];
      next.splice(action.atIndex, 0, ...action.newPages);
      return {
        ...state,
        pages: next,
        pageCount: next.length,
        selectedPages: new Set(),
        undoStack: [...state.undoStack, before],
        redoStack: [],
      };
    }
    case 'COPY_PAGES':
      return {
        ...state,
        copiedPageIndices: Array.from(state.selectedPages).sort((a, b) => a - b),
      };
    case 'PASTE_PAGES': {
      if (state.copiedPageIndices.length === 0) return state;
      const before = snapshotPages(state.pages);
      const appended = state.copiedPageIndices
        .map((i) => state.pages[i])
        .filter((p): p is PageDescriptor => p !== undefined)
        .map((p) => ({ ...p, id: newId() }));
      const nextPages = [...state.pages, ...appended];
      return {
        ...state,
        pages: nextPages,
        pageCount: nextPages.length,
        selectedPages: new Set(),
        undoStack: [...state.undoStack, before],
        redoStack: [],
      };
    }
    case 'SET_EDITOR_THUMBNAIL_SCALE':
      return { ...state, editorThumbnailScale: clamp(action.scale, 0.5, 2.0) };
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const previous = state.undoStack[state.undoStack.length - 1]!;
      const newUndo = state.undoStack.slice(0, -1);
      const currentSnap = snapshotPages(state.pages);
      return {
        ...state,
        pages: snapshotPages(previous),
        pageCount: previous.length,
        selectedPages: new Set(),
        undoStack: newUndo,
        redoStack: [...state.redoStack, currentSnap],
        currentPage:
          previous.length === 0 ? 1 : clamp(state.currentPage, 1, previous.length),
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const nextP = state.redoStack[state.redoStack.length - 1]!;
      const newRedo = state.redoStack.slice(0, -1);
      const currentSnap = snapshotPages(state.pages);
      return {
        ...state,
        pages: snapshotPages(nextP),
        pageCount: nextP.length,
        selectedPages: new Set(),
        undoStack: [...state.undoStack, currentSnap],
        redoStack: newRedo,
        currentPage: nextP.length === 0 ? 1 : clamp(state.currentPage, 1, nextP.length),
      };
    }
    case 'SET_ANNOTATION_TOOL':
      return state.activeEngineName !== 'mupdf' ? state : { ...state, activeAnnotationTool: action.tool };
    case 'ADD_REDACTION': {
      if (state.activeEngineName !== 'mupdf') return state;
      const map = new Map(state.redactionOverlays);
      const list = map.get(action.pageNumber) ?? [];
      map.set(action.pageNumber, [...list, action.rect]);
      return { ...state, redactionOverlays: map };
    }
    case 'REMOVE_REDACTION': {
      if (state.activeEngineName !== 'mupdf') return state;
      const map = new Map(state.redactionOverlays);
      const list = map.get(action.pageNumber);
      if (!list || action.rectIndex < 0 || action.rectIndex >= list.length) return state;
      const nextList = list.filter((_, i) => i !== action.rectIndex);
      if (nextList.length === 0) map.delete(action.pageNumber);
      else map.set(action.pageNumber, nextList);
      return { ...state, redactionOverlays: map };
    }
    case 'APPLY_REDACTIONS':
      return state.activeEngineName !== 'mupdf' ? state : state;
    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.bookmarks.map(cloneBm) };
    case 'ADD_BOOKMARK':
      return { ...state, bookmarks: [...state.bookmarks, cloneBm(action.bookmark)] };
    case 'UPDATE_BOOKMARK':
      return { ...state, bookmarks: updBm(state.bookmarks, action.id, action.updates) };
    case 'REMOVE_BOOKMARK':
      return { ...state, bookmarks: rmBm(state.bookmarks, action.id) };
    default:
      return state;
  }
}
