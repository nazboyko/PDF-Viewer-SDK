import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ViewerToolbar } from '@/components/ViewerToolbar/ViewerToolbar';
import { useViewer } from '@/context/AppContext';
import type { PdfEngine } from '@/types/engine';
import { PdfEngineError } from '@/types/engine';
import type { PageDimensions } from '@/types/engine';
import type { FitMode } from '@/types/model';

import styles from './PageCanvas.module.css';

const PageViewportLazy = lazy(async () => {
  const m = await import('./PageViewport');
  return { default: m.PageViewport };
});

function displayDimensionsPt(
  dims: PageDimensions,
  viewRotation: 0 | 90 | 180 | 270,
): { w: number; h: number } {
  const t = (dims.rotation + viewRotation) % 360;
  if (t === 90 || t === 270) {
    return { w: dims.heightPt, h: dims.widthPt };
  }
  return { w: dims.widthPt, h: dims.heightPt };
}

function computeCssDimensions(
  engine: PdfEngine,
  pageIndex: number,
  cw: number,
  ch: number,
  zoomLevel: number,
  fitMode: FitMode,
  viewRotation: 0 | 90 | 180 | 270,
): { cssW: number; cssH: number } {
  const dims = engine.getPageDimensions(pageIndex);
  const { w: dispW, h: dispH } = displayDimensionsPt(dims, viewRotation);
  let scale = zoomLevel;
  if (fitMode === 'width') {
    scale = (cw / dispW) * zoomLevel;
  } else if (fitMode === 'page') {
    scale = Math.min(cw / dispW, ch / dispH) * zoomLevel;
  }
  return { cssW: dispW * scale, cssH: dispH * scale };
}

export interface EmbeddedPageCanvasProps {
  pageIndex: number;
  shouldRender: boolean;
  slotViewport: { width: number; height: number };
}

export function EmbeddedPageCanvas({
  pageIndex,
  shouldRender,
  slotViewport,
}: EmbeddedPageCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useViewer();
  const [layoutTick, setLayoutTick] = useState(0);

  const engine = state.pdfEngine as PdfEngine | null;
  const { zoomLevel, fitMode, viewRotation, isLoading, error, pageCount } = state;

  const cw = Math.max(1, slotViewport.width);
  const ch = Math.max(1, slotViewport.height);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => {
      setLayoutTick((n) => n + 1);
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (
      !shouldRender ||
      !wrap ||
      !canvas ||
      isLoading ||
      error ||
      !engine ||
      pageCount === 0
    ) {
      return;
    }

    const ac = new AbortController();

    const run = async (): Promise<void> => {
      const rect = wrap.getBoundingClientRect();
      const useW = Math.max(1, rect.width);
      const useH = Math.max(1, rect.height);
      const dims = engine.getPageDimensions(pageIndex);
      const { w: dispW, h: dispH } = displayDimensionsPt(dims, viewRotation);

      let scale = zoomLevel;
      if (fitMode === 'width') {
        scale = (useW / dispW) * zoomLevel;
      } else if (fitMode === 'page') {
        scale = Math.min(useW / dispW, useH / dispH) * zoomLevel;
      }

      try {
        await engine.renderPage({
          pageIndex,
          canvas,
          scale,
          devicePixelRatio: window.devicePixelRatio || 1,
          rotation: viewRotation,
          signal: ac.signal,
        });
      } catch (e) {
        if (e instanceof PdfEngineError && e.code === 'RENDER_CANCELLED') {
          return;
        }
      }
    };

    void run();

    return () => {
      ac.abort();
    };
  }, [
    ch,
    cw,
    engine,
    error,
    fitMode,
    isLoading,
    layoutTick,
    pageCount,
    pageIndex,
    shouldRender,
    viewRotation,
    zoomLevel,
  ]);

  if (isLoading || error || !engine || pageCount === 0) {
    return null;
  }

  if (!shouldRender) {
    const { cssH } = computeCssDimensions(engine, pageIndex, cw, ch, zoomLevel, fitMode, viewRotation);
    return (
      <div
        ref={wrapRef}
        className={styles.placeholder}
        style={{ minHeight: cssH }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`PDF page ${pageIndex + 1}`}
      />
    </div>
  );
}

export function PageCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useViewer();
  const [layoutTick, setLayoutTick] = useState(0);

  const engine = state.pdfEngine as PdfEngine | null;
  const {
    isLoading,
    error,
    currentPage,
    zoomLevel,
    fitMode,
    viewRotation,
    pageCount,
    scrollMode,
  } = state;

  const pageIndex = Math.min(Math.max(0, currentPage - 1), Math.max(0, pageCount - 1));

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => {
      setLayoutTick((n) => n + 1);
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || isLoading || error || !engine || pageCount === 0) {
      return;
    }

    const ac = new AbortController();

    const run = async (): Promise<void> => {
      const rect = wrap.getBoundingClientRect();
      const useW = Math.max(1, rect.width);
      const useH = Math.max(1, rect.height);
      const dims = engine.getPageDimensions(pageIndex);
      const { w: dispW, h: dispH } = displayDimensionsPt(dims, viewRotation);

      let scale = zoomLevel;
      if (fitMode === 'width') {
        scale = (useW / dispW) * zoomLevel;
      } else if (fitMode === 'page') {
        scale = Math.min(useW / dispW, useH / dispH) * zoomLevel;
      }

      try {
        await engine.renderPage({
          pageIndex,
          canvas,
          scale,
          devicePixelRatio: window.devicePixelRatio || 1,
          rotation: viewRotation,
          signal: ac.signal,
        });
      } catch (e) {
        if (e instanceof PdfEngineError && e.code === 'RENDER_CANCELLED') {
          return;
        }
      }
    };

    void run();

    return () => {
      ac.abort();
    };
  }, [
    engine,
    error,
    fitMode,
    isLoading,
    layoutTick,
    pageCount,
    pageIndex,
    scrollMode,
    viewRotation,
    zoomLevel,
  ]);

  if (isLoading || error || !engine || pageCount === 0) {
    return null;
  }

  if (scrollMode === 'continuous' || scrollMode === 'spread') {
    return (
      <Suspense fallback={null}>
        <PageViewportLazy />
      </Suspense>
    );
  }

  return (
    <div className={styles.viewport}>
      <ViewerToolbar />
      <div ref={wrapRef} className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label={`PDF page ${currentPage}`} />
      </div>
    </div>
  );
}
