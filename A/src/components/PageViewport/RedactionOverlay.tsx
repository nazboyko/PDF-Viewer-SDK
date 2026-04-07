import { useCallback, useRef, useState } from 'react';

import { useViewer } from '@/context/AppContext';
import {
  cssRectToPdfRedactionRect,
  displayDimensionsPt,
  pdfRedactionRectToCss,
  useAnnotations,
} from '@/hooks/useAnnotations';
import type { PdfEngine } from '@/types/engine';

import styles from './RedactionOverlay.module.css';

export interface RedactionOverlayProps {
  pageIndex: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layoutTick: number;
}

export function RedactionOverlay({ pageIndex, canvasRef, layoutTick }: RedactionOverlayProps) {
  const { state, dispatch } = useViewer();
  const { placeTextFromCanvasClick } = useAnnotations();
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const engine = state.pdfEngine as PdfEngine | null;
  const tool = state.activeAnnotationTool;
  const mupdf = state.activeEngineName === 'mupdf';
  const overlayOn = mupdf && (tool === 'redact-rect' || tool === 'text');

  const pageNumber = pageIndex + 1;
  const committed = state.redactionOverlays.get(pageNumber) ?? [];

  const relPos = useCallback(
    (clientX: number, clientY: number) => {
      const c = canvasRef.current;
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top, cw: r.width, ch: r.height };
    },
    [canvasRef],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayOn || !engine) return;
    const rel = relPos(e.clientX, e.clientY);
    if (!rel) return;
    if (rel.x < 0 || rel.y < 0 || rel.x > rel.cw || rel.y > rel.ch) return;

    if (tool === 'text') {
      e.preventDefault();
      const t = window.prompt('Annotation text', 'Hello');
      if (t !== null && t.trim() !== '') {
        void placeTextFromCanvasClick(pageIndex, rel.x, rel.y, rel.cw, rel.ch, t);
      }
      return;
    }

    if (tool === 'redact-rect') {
      e.preventDefault();
      dragStartRef.current = { x: rel.x, y: rel.y };
      setDraft({ x: rel.x, y: rel.y, w: 0, h: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== 'redact-rect' || !dragStartRef.current) return;
    const rel = relPos(e.clientX, e.clientY);
    if (!rel) return;
    const s = dragStartRef.current;
    const x = Math.min(s.x, rel.x);
    const y = Math.min(s.y, rel.y);
    const w = Math.abs(rel.x - s.x);
    const h = Math.abs(rel.y - s.y);
    setDraft({ x, y, w, h });
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDraft(null);
    if (tool !== 'redact-rect' || !start || !engine) {
      return;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const rel = relPos(e.clientX, e.clientY);
    if (!rel) return;
    const x = Math.min(start.x, rel.x);
    const y = Math.min(start.y, rel.y);
    const w = Math.abs(rel.x - start.x);
    const h = Math.abs(rel.y - start.y);
    if (w < 2 || h < 2) return;
    const dims = engine.getPageDimensions(pageIndex);
    const { w: dispW, h: dispH } = displayDimensionsPt(dims, state.viewRotation);
    const pdfR = cssRectToPdfRedactionRect(x, y, w, h, rel.cw, rel.ch, dispW, dispH);
    dispatch({ type: 'ADD_REDACTION', pageNumber, rect: pdfR });
  };

  const dd =
    engine !== null
      ? displayDimensionsPt(engine.getPageDimensions(pageIndex), state.viewRotation)
      : null;
  const c = canvasRef.current;
  const cw = c?.clientWidth ?? 0;
  const ch = c?.clientHeight ?? 0;

  return (
    <div
      key={layoutTick}
      className={`${styles.overlay} ${overlayOn ? styles.overlayActive : ''}`}
      aria-hidden={!overlayOn}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      {dd &&
        cw > 1 &&
        ch > 1 &&
        committed.map((r, i) => {
          const css = pdfRedactionRectToCss(r, cw, ch, dd.w, dd.h);
          return (
            <div
              key={`r-${i}-${r.x}-${r.y}`}
              className={styles.rect}
              style={{ left: css.left, top: css.top, width: css.width, height: css.height }}
            />
          );
        })}
      {draft && draft.w > 0 && draft.h > 0 && (
        <div
          className={styles.rect}
          style={{ left: draft.x, top: draft.y, width: draft.w, height: draft.h }}
        />
      )}
    </div>
  );
}
