/* eslint-disable react-refresh/only-export-components -- provider + hooks live together */
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { AppAction, AppState } from '@/types/state';
import { initialState } from '@/types/state';

import { appReducer } from './appReducer';

export interface ViewerState {
  pdfEngine: AppState['pdfEngine'];
  documentModel: AppState['documentModel'];
  filename: AppState['filename'];
  enginePreference: AppState['enginePreference'];
  activeEngineName: AppState['activeEngineName'];
  pageCount: AppState['pageCount'];
  currentPage: AppState['currentPage'];
  zoomLevel: AppState['zoomLevel'];
  fitMode: AppState['fitMode'];
  scrollMode: AppState['scrollMode'];
  viewRotation: AppState['viewRotation'];
  isLoading: AppState['isLoading'];
  loadingProgress: AppState['loadingProgress'];
  error: AppState['error'];
  activeAnnotationTool: AppState['activeAnnotationTool'];
  redactionOverlays: AppState['redactionOverlays'];
  bookmarks: AppState['bookmarks'];
  isEditorMode: AppState['isEditorMode'];
}

export interface EditorState {
  pages: AppState['pages'];
  selectedPages: AppState['selectedPages'];
  copiedPageIndices: AppState['copiedPageIndices'];
  editorThumbnailScale: AppState['editorThumbnailScale'];
  undoStack: AppState['undoStack'];
  redoStack: AppState['redoStack'];
}

export interface ViewerContextValue {
  state: ViewerState;
  dispatch: Dispatch<AppAction>;
}

export interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<AppAction>;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);
const EditorContext = createContext<EditorContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const viewerState = useMemo((): ViewerState => {
    return {
      pdfEngine: state.pdfEngine,
      documentModel: state.documentModel,
      filename: state.filename,
      enginePreference: state.enginePreference,
      activeEngineName: state.activeEngineName,
      pageCount: state.pageCount,
      currentPage: state.currentPage,
      zoomLevel: state.zoomLevel,
      fitMode: state.fitMode,
      scrollMode: state.scrollMode,
      viewRotation: state.viewRotation,
      isLoading: state.isLoading,
      loadingProgress: state.loadingProgress,
      error: state.error,
      activeAnnotationTool: state.activeAnnotationTool,
      redactionOverlays: state.redactionOverlays,
      bookmarks: state.bookmarks,
      isEditorMode: state.isEditorMode,
    };
  }, [
    state.pdfEngine,
    state.documentModel,
    state.filename,
    state.enginePreference,
    state.activeEngineName,
    state.pageCount,
    state.currentPage,
    state.zoomLevel,
    state.fitMode,
    state.scrollMode,
    state.viewRotation,
    state.isLoading,
    state.loadingProgress,
    state.error,
    state.activeAnnotationTool,
    state.redactionOverlays,
    state.bookmarks,
    state.isEditorMode,
  ]);

  const editorState = useMemo((): EditorState => {
    return {
      pages: state.pages,
      selectedPages: state.selectedPages,
      copiedPageIndices: state.copiedPageIndices,
      editorThumbnailScale: state.editorThumbnailScale,
      undoStack: state.undoStack,
      redoStack: state.redoStack,
    };
  }, [
    state.pages,
    state.selectedPages,
    state.copiedPageIndices,
    state.editorThumbnailScale,
    state.undoStack,
    state.redoStack,
  ]);

  const viewerValue = useMemo(
    (): ViewerContextValue => ({ state: viewerState, dispatch }),
    [viewerState, dispatch],
  );

  const editorValue = useMemo(
    (): EditorContextValue => ({ state: editorState, dispatch }),
    [editorState, dispatch],
  );

  return (
    <ViewerContext.Provider value={viewerValue}>
      <EditorContext.Provider value={editorValue}>{children}</EditorContext.Provider>
    </ViewerContext.Provider>
  );
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (ctx === null) {
    throw new Error('useViewer must be used within AppStateProvider');
  }
  return ctx;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (ctx === null) {
    throw new Error('useEditor must be used within AppStateProvider');
  }
  return ctx;
}
