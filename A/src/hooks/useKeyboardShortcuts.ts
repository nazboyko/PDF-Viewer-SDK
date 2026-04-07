import { useCallback, type KeyboardEvent } from 'react';

import { useViewer } from '@/context/AppContext';
import type { DocumentEditorApi } from '@/hooks/useDocumentEditor';

/** Next 1-based page anchor when stepping by spread (cover, then pair starts 2,4,6,…). */
function nextSpreadPage(currentPage: number, pageCount: number): number {
  if (pageCount <= 1) {
    return currentPage;
  }
  if (currentPage <= 1) {
    return Math.min(2, pageCount);
  }
  const spreadStart = 2 + 2 * Math.floor((currentPage - 2) / 2);
  const nextStart = spreadStart + 2;
  return nextStart <= pageCount ? nextStart : currentPage;
}

/** Previous 1-based page anchor when stepping by spread. */
function prevSpreadPage(currentPage: number): number {
  if (currentPage <= 1) {
    return 1;
  }
  if (currentPage === 2) {
    return 1;
  }
  const spreadStart = 2 + 2 * Math.floor((currentPage - 2) / 2);
  const prevStart = spreadStart - 2;
  return prevStart >= 2 ? prevStart : 1;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) {
    return false;
  }
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (t.isContentEditable) {
    return true;
  }
  return false;
}

/**
 * Keyboard shortcuts when focus is inside the PDF workspace (see Phase 18 mitigation).
 * Pass `null` for editorApi in viewer-only layout; pass `useDocumentEditor()` in editor layout.
 * Uses unmodified `-` / `=` for zoom; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z / Ctrl+Y for editor undo/redo.
 */
export function useKeyboardShortcuts(editorApi: DocumentEditorApi | null): {
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
} {
  const { state, dispatch } = useViewer();

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (isEditableTarget(e.target)) {
        return;
      }
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'z' && !e.shiftKey) {
        if (editorApi) {
          e.preventDefault();
          void editorApi.undo();
        }
        return;
      }
      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (editorApi) {
          e.preventDefault();
          void editorApi.redo();
        }
        return;
      }

      if (!isMod && e.key === '-') {
        e.preventDefault();
        dispatch({ type: 'ZOOM_OUT' });
        return;
      }
      if (!isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        dispatch({ type: 'ZOOM_IN' });
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const cp = state.currentPage;
        const isSpread = state.scrollMode === 'spread';
        const prev = isSpread ? prevSpreadPage(cp) : cp - 1;
        dispatch({ type: 'SET_CURRENT_PAGE', page: Math.max(1, prev) });
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const n = Math.max(1, state.pageCount);
        const cp = state.currentPage;
        const isSpread = state.scrollMode === 'spread';
        const next = isSpread ? nextSpreadPage(cp, n) : cp + 1;
        dispatch({ type: 'SET_CURRENT_PAGE', page: Math.min(n, next) });
        return;
      }
    },
    [
      editorApi,
      dispatch,
      state.pageCount,
      state.currentPage,
      state.scrollMode,
    ],
  );

  return { onKeyDown };
}
