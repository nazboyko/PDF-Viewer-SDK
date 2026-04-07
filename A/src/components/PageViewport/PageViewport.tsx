import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { ViewerToolbar } from '@/components/ViewerToolbar/ViewerToolbar';
import { useViewer } from '@/context/AppContext';
import { useVisiblePages } from '@/hooks/useVisiblePages';

import { EmbeddedPageCanvas } from './PageCanvas';

import styles from './PageViewport.module.css';

export function PageViewport() {
  const { state, dispatch } = useViewer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const engine = state.pdfEngine;
  const pageCount = state.pageCount;

  const isDocumentReady =
    !state.isLoading && !state.error && engine !== null && pageCount > 0;

  const { setPageElementRef, shouldRenderPage } = useVisiblePages(
    scrollRef,
    pageCount,
    dispatch,
    state.currentPage,
    isDocumentReady,
  );

  const setPageElementRefLatest = useRef(setPageElementRef);
  setPageElementRefLatest.current = setPageElementRef;

  const stableSlotRefByIndex = useRef<Record<number, (el: HTMLDivElement | null) => void>>({});

  const refForSlot = useCallback((i: number) => {
    // One stable function per index so React does not treat the ref as changed every render (Bug 3).
    if (stableSlotRefByIndex.current[i] === undefined) {
      stableSlotRefByIndex.current[i] = (el) => {
        setPageElementRefLatest.current(i, el);
      };
    }
    return stableSlotRefByIndex.current[i]!;
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewportSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewportSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    return () => {
      ro.disconnect();
    };
  }, []);

  if (state.isLoading || state.error || !engine || pageCount === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <ViewerToolbar />
      <div ref={scrollRef} className={styles.scroll} role="region" aria-label="PDF document pages">
        {Array.from({ length: pageCount }, (_, i) => (
          <div
            key={`page-row-${i}`}
            ref={refForSlot(i)}
            className={styles.slot}
            data-page-index={i}
          >
            <EmbeddedPageCanvas
              pageIndex={i}
              shouldRender={shouldRenderPage(i)}
              slotViewport={{ width: viewportSize.w, height: viewportSize.h }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
