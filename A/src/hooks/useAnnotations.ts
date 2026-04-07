import { useCallback } from 'react';

import { MuPdfEngine } from '@/engine/MuPdfEngine';
import { useViewer } from '@/context/AppContext';
import { DocumentModel } from '@/model';
import type { PDFDocument } from '@/types/state';

import type { PageDimensions, PdfEngine } from '@/types/engine';
import type { RedactionRect } from '@/types/state';

export function displayDimensionsPt(
  dims: PageDimensions,
  viewRotation: 0 | 90 | 180 | 270,
): { w: number; h: number } {
  const t = (dims.rotation + viewRotation) % 360;
  if (t === 90 || t === 270) {
    return { w: dims.heightPt, h: dims.widthPt };
  }
  return { w: dims.widthPt, h: dims.heightPt };
}

/** CSS rect (relative to canvas, top-left origin) → PDF RedactionRect (origin bottom-left). */
/** PDF redaction rect → CSS pixels relative to canvas top-left. */
export function pdfRedactionRectToCss(
  r: RedactionRect,
  canvasW: number,
  canvasH: number,
  dispW: number,
  dispH: number,
): { left: number; top: number; width: number; height: number } {
  const left = (r.x / dispW) * canvasW;
  const width = (r.width / dispW) * canvasW;
  const height = (r.height / dispH) * canvasH;
  const top = canvasH - ((r.y + r.height) / dispH) * canvasH;
  return { left, top, width, height };
}

export function cssRectToPdfRedactionRect(
  relX: number,
  relY: number,
  relW: number,
  relH: number,
  canvasW: number,
  canvasH: number,
  dispW: number,
  dispH: number,
): { x: number; y: number; width: number; height: number } {
  const x = (relX / canvasW) * dispW;
  const width = (relW / canvasW) * dispW;
  const height = (relH / canvasH) * dispH;
  const yTop = dispH - (relY / canvasH) * dispH;
  const yBottom = yTop - height;
  return { x, y: yBottom, width, height };
}

/** Click on canvas → FreeText box in PDF coords (lower-left x,y for MuPDF). */
export function cssClickToPdfTextPlacement(
  relX: number,
  relY: number,
  canvasW: number,
  canvasH: number,
  dispW: number,
  dispH: number,
): { left: number; bottom: number } {
  const left = (relX / canvasW) * dispW;
  const top = dispH - (relY / canvasH) * dispH;
  const bottom = top - 28;
  return { left, bottom };
}

export function useAnnotations() {
  const { state, dispatch } = useViewer();

  const syncModel = useCallback(async () => {
    const eng = state.pdfEngine as PdfEngine | null;
    if (!eng || state.activeEngineName !== 'mupdf') return;
    const bytes = await eng.getDocumentBytes();
    const model = await DocumentModel.fromBytes(bytes);
    dispatch({ type: 'DOCUMENT_SYNC_AFTER_MUTATION', model: model as unknown as PDFDocument });
  }, [dispatch, state.pdfEngine, state.activeEngineName]);

  const applyPendingRedactions = useCallback(async () => {
    if (state.activeEngineName !== 'mupdf') return;
    const eng = state.pdfEngine as MuPdfEngine | null;
    if (!eng) return;
    const pending = state.redactionOverlays;
    for (const [pageNum, rects] of pending) {
      const idx = pageNum - 1;
      for (const r of rects) {
        eng.addRedaction(idx, r);
      }
    }
    eng.applyRedactions();
    await syncModel();
    dispatch({ type: 'APPLY_REDACTIONS' });
    dispatch({ type: 'SET_ANNOTATION_TOOL', tool: null });
  }, [dispatch, state.pdfEngine, state.activeEngineName, state.redactionOverlays, syncModel]);

  const placeTextFromCanvasClick = useCallback(
    async (
      pageIndex: number,
      relX: number,
      relY: number,
      canvasW: number,
      canvasH: number,
      text: string,
    ) => {
      if (state.activeEngineName !== 'mupdf') return;
      const eng = state.pdfEngine as MuPdfEngine | null;
      if (!eng || !text.trim()) return;
      const dims = eng.getPageDimensions(pageIndex);
      const { w: dispW, h: dispH } = displayDimensionsPt(dims, state.viewRotation);
      const { left, bottom } = cssClickToPdfTextPlacement(
        relX,
        relY,
        canvasW,
        canvasH,
        dispW,
        dispH,
      );
      eng.addTextAnnotation(pageIndex, left, bottom, text.trim());
      await syncModel();
      dispatch({ type: 'SET_ANNOTATION_TOOL', tool: null });
    },
    [dispatch, state.pdfEngine, state.activeEngineName, state.viewRotation, syncModel],
  );

  return {
    syncModel,
    applyPendingRedactions,
    placeTextFromCanvasClick,
  };
}
