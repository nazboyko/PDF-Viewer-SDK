import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { useViewer } from '@/context/AppContext';
import { PrintButton } from '@/components/PdfWorkspace/PrintButton';
import { SaveButton } from '@/components/PdfWorkspace/SaveButton';
import type { PdfEngine } from '@/types/engine';
import type { PageDescriptor, ScrollMode } from '@/types/model';
import type { PDFDocument, PDFDocumentProxy } from '@/types/state';
import { DocumentModel } from '@/model';

import styles from './ViewerToolbar.module.css';

const SCROLL_OPTIONS: { value: ScrollMode; label: string }[] = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'single', label: 'Single Page' },
  { value: 'spread', label: 'Two-Page Spread' },
];

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

function buildPages(engine: PdfEngine): { pageCount: number; pages: PageDescriptor[] } {
  const pageCount = engine.pageCount;
  const pages = Array.from({ length: pageCount }, (_, i) => {
    const d = engine.getPageDimensions(i);
    return {
      id: globalThis.crypto.randomUUID(),
      sourceIndex: i,
      rotation: d.rotation,
    };
  });
  return { pageCount, pages };
}

export function ViewerToolbar() {
  const { state, dispatch } = useViewer();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [pageDraft, setPageDraft] = useState('');
  const viewModeId = useId();

  useEffect(() => {
    setPageDraft('');
  }, [state.currentPage]);

  const engine = state.pdfEngine as PdfEngine | null;
  const hasDoc = engine !== null && state.pageCount > 0;
  const filename = state.filename ?? 'document.pdf';

  const runReload = useCallback(async () => {
    if (!engine || !hasDoc) {
      return;
    }
    dispatch({ type: 'DOCUMENT_LOAD_START', filename });
    try {
      const bytes = await engine.getDocumentBytes();
      const buf = Uint8Array.from(bytes);
      await engine.loadFromBuffer(buf.buffer, (p) => {
        if (p.fraction != null) {
          dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: p.fraction });
        }
      });
      const outBytes = await engine.getDocumentBytes();
      const model = await DocumentModel.fromBytes(outBytes);
      const { pageCount, pages } = buildPages(engine);
      dispatch({
        type: 'DOCUMENT_LOADED',
        engine: engine as unknown as PDFDocumentProxy,
        model: model as unknown as PDFDocument,
        pageCount,
        pages,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      dispatch({ type: 'DOCUMENT_LOAD_ERROR', error: message });
    }
  }, [dispatch, engine, filename, hasDoc]);

  const runUpload = useCallback(
    async (file: File) => {
      if (!engine || file.type !== 'application/pdf') {
        return;
      }
      dispatch({ type: 'DOCUMENT_LOAD_START', filename: file.name });
      try {
        const buf = await file.arrayBuffer();
        await engine.loadFromBuffer(buf, (p) => {
          if (p.fraction != null) {
            dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: p.fraction });
          }
        });
        const bytes = await engine.getDocumentBytes();
        const model = await DocumentModel.fromBytes(bytes);
        const { pageCount, pages } = buildPages(engine);
        dispatch({
          type: 'DOCUMENT_LOADED',
          engine: engine as unknown as PDFDocumentProxy,
          model: model as unknown as PDFDocument,
          pageCount,
          pages,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        dispatch({ type: 'DOCUMENT_LOAD_ERROR', error: message });
      }
    },
    [dispatch, engine],
  );

  const onUploadChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) {
        void runUpload(file);
      }
    },
    [runUpload],
  );

  const onRefresh = useCallback(() => {
    dispatch({ type: 'RELOAD_DOCUMENT' });
    void runReload();
  }, [dispatch, runReload]);

  const onPageInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const v = parseInt(e.currentTarget.value, 10);
        if (!Number.isNaN(v)) {
          dispatch({ type: 'SET_CURRENT_PAGE', page: v });
        }
        setPageDraft('');
      }
    },
    [dispatch],
  );

  const onPageInputBlur = useCallback(() => {
    const v = parseInt(pageDraft, 10);
    if (!Number.isNaN(v)) {
      dispatch({ type: 'SET_CURRENT_PAGE', page: v });
    }
    setPageDraft('');
  }, [dispatch, pageDraft]);

  const showPageInput = pageDraft !== '' ? pageDraft : String(state.currentPage);

  const isSpread = state.scrollMode === 'spread';
  const n = Math.max(1, state.pageCount);
  const cp = state.currentPage;
  const nextPageTarget = isSpread ? nextSpreadPage(cp, n) : cp + 1;
  const prevPageTarget = isSpread ? prevSpreadPage(cp) : cp - 1;
  const atLastSpread = isSpread && nextSpreadPage(cp, n) === cp;
  const atFirstSpread = isSpread && cp <= 1;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Viewer toolbar">
      <div className={styles.group}>
        <label htmlFor={viewModeId} className={styles.srOnly}>
          View mode
        </label>
        <span className={styles.viewModeIcon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4z"
              fill="currentColor"
            />
          </svg>
        </span>
        <select
          id={viewModeId}
          className={styles.select}
          value={state.scrollMode}
          aria-label="View mode"
          disabled={!hasDoc}
          onChange={(e) => {
            dispatch({ type: 'SET_SCROLL_MODE', mode: e.target.value as ScrollMode });
          }}
        >
          {SCROLL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M3 4.5L6 8l3-3.5H3z" />
          </svg>
        </span>
      </div>

      <PrintButton className={styles.iconBtn} />

      <SaveButton className={styles.iconBtn} />

      <button
        type="button"
        className={styles.iconBtn}
        data-active={state.isEditorMode ? 'true' : undefined}
        aria-label="Edit pages"
        aria-pressed={state.isEditorMode}
        disabled={!hasDoc}
        onClick={() => {
          dispatch({ type: state.isEditorMode ? 'EXIT_EDITOR' : 'ENTER_EDITOR' });
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M11.5 2.5l2 2-8 8H3.5v-2l8-8zm1-1.5l1 1-1 1-2-2 1-1zM2 14h12v1H2v-1z"
          />
        </svg>
      </button>

      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Refresh document"
        disabled={!hasDoc}
        onClick={onRefresh}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 2a6 6 0 104.24 10.24l-.8-.72A5 5 0 118 3V1l3 2-3 2V3z"
          />
        </svg>
      </button>

      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Upload PDF"
        disabled={!hasDoc}
        onClick={() => uploadInputRef.current?.click()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 2L3 7h3v6h4V7h3L8 2zm-5 12h12v2H3v-2z"
          />
        </svg>
      </button>
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
        onChange={onUploadChange}
      />

      <span className={styles.divider} role="separator" aria-orientation="vertical" />

      <div className={styles.pageNav}>
        <span className={styles.pageLabel}>Page</span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Previous page"
          disabled={!hasDoc || (isSpread ? atFirstSpread : state.currentPage <= 1)}
          onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', page: prevPageTarget })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path fill="currentColor" d="M10 3L5 8l5 5V3z" />
          </svg>
        </button>
        <input
          type="text"
          inputMode="numeric"
          className={styles.pageInput}
          aria-label="Current page number"
          disabled={!hasDoc}
          value={showPageInput}
          onChange={(e) => setPageDraft(e.target.value)}
          onBlur={onPageInputBlur}
          onKeyDown={onPageInputKeyDown}
        />
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Next page"
          disabled={!hasDoc || (isSpread ? atLastSpread : state.currentPage >= state.pageCount)}
          onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', page: nextPageTarget })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path fill="currentColor" d="M6 3l5 5-5 5V3z" />
          </svg>
        </button>
        <span className={styles.pageTotal} aria-live="polite">
          / {Math.max(1, state.pageCount)}
        </span>
      </div>

      <span className={styles.divider} role="separator" aria-orientation="vertical" />

      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Fit page"
        disabled={!hasDoc}
        onClick={() => dispatch({ type: 'SET_FIT_MODE', mode: 'page' })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 3h4v2H5v2H3V3zm6 0h4v4h-2V5H9V3zM3 9h2v2h2v2H3V9zm8 0h4v4h-4v-2h2v-2h-2V9z"
          />
        </svg>
      </button>

      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Zoom out"
        disabled={!hasDoc}
        onClick={() => dispatch({ type: 'ZOOM_OUT' })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M3 7h10v2H3V7z" />
        </svg>
      </button>
      <span className={styles.zoomReadout} aria-live="polite">
        {Math.round(state.zoomLevel * 100)}%
      </span>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Zoom in"
        disabled={!hasDoc}
        onClick={() => dispatch({ type: 'ZOOM_IN' })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M7 3h2v4h4v2h-4v4H7v-4H3V7h4V3z" />
        </svg>
      </button>
      <span className={styles.divider} role="separator" aria-orientation="vertical" />
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Rotate view left"
        disabled={!hasDoc}
        onClick={() => dispatch({ type: 'ROTATE_VIEW', delta: -90 })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M8 3v2.5A4.5 4.5 0 1012.5 10H14A6 6 0 118 3zm-1 0L4 6h3V3z" />
        </svg>
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Rotate view right"
        disabled={!hasDoc}
        onClick={() => dispatch({ type: 'ROTATE_VIEW', delta: 90 })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M8 3v2.5A4.5 4.5 0 113.5 10H2A6 6 0 108 3zm1 0l3 3H9V3z" />
        </svg>
      </button>
    </div>
  );
}
