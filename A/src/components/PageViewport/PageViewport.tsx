import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { ViewerToolbar } from '@/components/ViewerToolbar/ViewerToolbar';
import { useViewer } from '@/context/AppContext';
import { useVisiblePages } from '@/hooks/useVisiblePages';

import { EmbeddedPageCanvas } from './PageCanvas';

import styles from './PageViewport.module.css';

const SPREAD_GAP_PX = 8;

/**
 * 0-indexed page indices for the spread row that contains the given 1-indexed current page.
 * Cover convention (1-based): spread 0 = [1]; spread k≥1 = [2k, 2k+1] while 2k+1 ≤ N; last spread is a
 * single page when N is odd after the first (e.g. page 6 alone in a 6-page doc).
 */
function spreadPageIndicesForCurrentPage(currentPage: number, pageCount: number): number[] {
  if (pageCount <= 0) {
    return [];
  }
  const ci = Math.min(Math.max(0, currentPage - 1), pageCount - 1);
  if (ci === 0) {
    return [0];
  }
  const k = Math.floor((ci - 1) / 2);
  const left = 2 * k + 1;
  const right = Math.min(left + 1, pageCount - 1);
  if (left === right) {
    return [left];
  }
  return [left, right];
}

function useScrollContainerSize(scrollRef: RefObject<HTMLDivElement | null>) {
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
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
  return viewportSize;
}

function ContinuousViewport() {
  const { state, dispatch } = useViewer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportSize = useScrollContainerSize(scrollRef);

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
    if (stableSlotRefByIndex.current[i] === undefined) {
      stableSlotRefByIndex.current[i] = (el) => {
        setPageElementRefLatest.current(i, el);
      };
    }
    return stableSlotRefByIndex.current[i]!;
  }, []);

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

function SingleViewport() {
  const { state } = useViewer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportSize = useScrollContainerSize(scrollRef);

  const pageCount = state.pageCount;
  const pageIndex = Math.min(Math.max(0, state.currentPage - 1), Math.max(0, pageCount - 1));

  return (
    <div className={styles.root}>
      <ViewerToolbar />
      <div ref={scrollRef} className={styles.scroll} role="region" aria-label="PDF document pages">
        <div className={styles.slot}>
          <EmbeddedPageCanvas
            pageIndex={pageIndex}
            shouldRender
            slotViewport={{ width: viewportSize.w, height: viewportSize.h }}
          />
        </div>
      </div>
    </div>
  );
}

function SpreadViewport() {
  const { state } = useViewer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportSize = useScrollContainerSize(scrollRef);

  const pageCount = state.pageCount;
  const indices = spreadPageIndicesForCurrentPage(state.currentPage, pageCount);

  const colW =
    indices.length === 1
      ? viewportSize.w
      : Math.max(1, (viewportSize.w - SPREAD_GAP_PX) / 2);

  return (
    <div className={styles.root}>
      <ViewerToolbar />
      <div ref={scrollRef} className={styles.scroll} role="region" aria-label="PDF document pages">
        <div
          className={styles.slot}
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: `${SPREAD_GAP_PX}px`,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {indices.map((idx) => (
            <div
              key={`spread-slot-${idx}`}
              style={{
                width: colW,
                maxWidth: colW,
                flex: '0 0 auto',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <EmbeddedPageCanvas
                pageIndex={idx}
                shouldRender
                slotViewport={{ width: colW, height: viewportSize.h }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageViewport() {
  const { state } = useViewer();

  if (state.isLoading || state.error || !state.pdfEngine || state.pageCount === 0) {
    return null;
  }

  if (state.scrollMode === 'continuous') {
    return <ContinuousViewport />;
  }
  if (state.scrollMode === 'single') {
    return <SingleViewport />;
  }
  return <SpreadViewport />;
}
