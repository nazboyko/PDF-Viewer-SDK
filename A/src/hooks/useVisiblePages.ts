import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type RefObject } from 'react';

import type { AppAction } from '@/types/state';

const THRESHOLDS = [0, 0.05, 0.25, 0.5, 0.75, 1] as const;

function expandRenderSet(visibleIndices: ReadonlySet<number>, pageCount: number): Set<number> {
  const out = new Set<number>();
  for (const i of visibleIndices) {
    for (const d of [-1, 0, 1]) {
      const j = i + d;
      if (j >= 0 && j < pageCount) {
        out.add(j);
      }
    }
  }
  return out;
}

function pickDominantPage(ratioByPage: ReadonlyMap<number, number>): number | null {
  let bestIdx = -1;
  let bestRatio = -1;
  ratioByPage.forEach((r, i) => {
    if (r > bestRatio) {
      bestRatio = r;
      bestIdx = i;
    }
  });
  if (bestIdx < 0 || bestRatio <= 0) {
    return null;
  }
  return bestIdx;
}

/**
 * Tracks which PDF page slots intersect the scroll container and expands by ±1 page for rendering.
 * Updates viewer `currentPage` to the page with the highest intersection ratio while scrolling.
 */
export function useVisiblePages(
  scrollRootRef: RefObject<HTMLElement | null>,
  pageCount: number,
  dispatch: Dispatch<AppAction>,
  currentPage: number,
  isDocumentReady: boolean,
): {
  setPageElementRef: (pageIndex: number, el: HTMLDivElement | null) => void;
  shouldRenderPage: (pageIndex: number) => boolean;
} {
  const [ratioByPage, setRatioByPage] = useState<Map<number, number>>(() => new Map());
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const visibleIndices = useMemo(() => {
    const s = new Set<number>();
    ratioByPage.forEach((r, i) => {
      if (r > 0) {
        s.add(i);
      }
    });
    return s;
  }, [ratioByPage]);

  const renderSet = useMemo(
    () => expandRenderSet(visibleIndices, pageCount),
    [visibleIndices, pageCount],
  );

  useEffect(() => {
    // Avoid replacing state with a new empty Map when already empty — prevents needless renders (Bug 1).
    setRatioByPage((prev) => (prev.size === 0 ? prev : new Map()));
  }, [pageCount]);

  useLayoutEffect(() => {
    if (pageCount === 0 || !isDocumentReady) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const root = scrollRootRef.current;
    if (!root) {
      return;
    }

    // One observer instance; recreated only when the scroll root is ready or page count is cleared — not on every ratio update (Bug 2).
    if (observerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setRatioByPage((prev) => {
          // Return `prev` when ratios are unchanged — new Map instances would still trigger updates (Bug 1).
          let next: Map<number, number> | null = null;
          for (const entry of entries) {
            const raw = entry.target.getAttribute('data-page-index');
            if (raw == null) {
              continue;
            }
            const idx = Number.parseInt(raw, 10);
            if (!Number.isFinite(idx)) {
              continue;
            }
            const newR = entry.intersectionRatio;
            const oldR = prev.get(idx);
            if (oldR === newR) {
              continue;
            }
            if (next === null) {
              next = new Map(prev);
            }
            next.set(idx, newR);
          }
          if (next === null) {
            return prev;
          }
          return next;
        });
      },
      { root, rootMargin: '0px', threshold: [...THRESHOLDS] },
    );

    observerRef.current = observer;
    for (const el of elementsRef.current.values()) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [pageCount, isDocumentReady, scrollRootRef]);

  const setPageElementRef = useCallback((pageIndex: number, el: HTMLDivElement | null) => {
    const observer = observerRef.current;
    const prev = elementsRef.current.get(pageIndex);
    if (prev && observer) {
      observer.unobserve(prev);
    }
    if (el) {
      elementsRef.current.set(pageIndex, el);
      observer?.observe(el);
    } else {
      elementsRef.current.delete(pageIndex);
      setRatioByPage((p) => {
        // Skip setState when the index was not present — keeps Map reference stable (Bug 1).
        if (!p.has(pageIndex)) {
          return p;
        }
        const next = new Map(p);
        next.delete(pageIndex);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const dominant = pickDominantPage(ratioByPage);
    if (dominant === null) {
      return;
    }
    const nextPage = dominant + 1;
    if (nextPage !== currentPageRef.current) {
      dispatch({ type: 'SET_CURRENT_PAGE', page: nextPage });
    }
  }, [dispatch, ratioByPage]);

  const shouldRenderPage = useCallback(
    (pageIndex: number) => renderSet.has(pageIndex),
    [renderSet],
  );

  return { setPageElementRef, shouldRenderPage };
}
