import { useCallback, useEffect } from 'react';

import { useViewer } from '@/context/AppContext';
import { MuPdfEngine } from '@/engine/MuPdfEngine';
import type { OutlineNode } from '@/types/engine';
import type { Bookmark } from '@/types/state';

export function outlineNodesToBookmarks(nodes: ReadonlyArray<OutlineNode>): Bookmark[] {
  return nodes.map((n) => ({
    id: globalThis.crypto.randomUUID(),
    title: n.title,
    pageIndex: n.pageIndex ?? 0,
    children: n.children.length > 0 ? outlineNodesToBookmarks(n.children) : [],
  }));
}

export function useBookmarks() {
  const { state, dispatch } = useViewer();
  const engine = state.pdfEngine;
  const bookmarks = state.bookmarks;

  useEffect(() => {
    if (engine instanceof MuPdfEngine) {
      engine.syncBookmarkPathsFromTree(bookmarks);
    }
  }, [engine, bookmarks]);

  const addBookmark = useCallback(async () => {
    if (!(engine instanceof MuPdfEngine)) {
      return;
    }
    const pageIndex = Math.max(0, Math.min(state.pageCount - 1, state.currentPage - 1));
    engine.addBookmark('New bookmark', pageIndex);
    const outline = await engine.getOutline();
    dispatch({ type: 'SET_BOOKMARKS', bookmarks: outlineNodesToBookmarks(outline) });
  }, [dispatch, engine, state.currentPage, state.pageCount]);

  const removeBookmark = useCallback(
    async (id: string) => {
      if (!(engine instanceof MuPdfEngine)) {
        return;
      }
      engine.syncBookmarkPathsFromTree(bookmarks);
      engine.removeBookmark(id);
      const outline = await engine.getOutline();
      dispatch({ type: 'SET_BOOKMARKS', bookmarks: outlineNodesToBookmarks(outline) });
    },
    [bookmarks, dispatch, engine],
  );

  const saveBookmark = useCallback(
    async (id: string, title: string, pageIndex: number) => {
      if (!(engine instanceof MuPdfEngine)) {
        return;
      }
      engine.syncBookmarkPathsFromTree(bookmarks);
      engine.updateBookmark(id, title, pageIndex);
      const outline = await engine.getOutline();
      dispatch({ type: 'SET_BOOKMARKS', bookmarks: outlineNodesToBookmarks(outline) });
    },
    [bookmarks, dispatch, engine],
  );

  const goToBookmark = useCallback(
    (b: Bookmark) => {
      if (b.pageIndex < 0 || b.pageIndex >= state.pageCount) {
        return;
      }
      dispatch({ type: 'SET_CURRENT_PAGE', page: b.pageIndex + 1 });
    },
    [dispatch, state.pageCount],
  );

  const canWrite = state.activeEngineName === 'mupdf' && engine instanceof MuPdfEngine;

  return {
    bookmarks,
    canWrite,
    addBookmark,
    removeBookmark,
    saveBookmark,
    goToBookmark,
  };
}
