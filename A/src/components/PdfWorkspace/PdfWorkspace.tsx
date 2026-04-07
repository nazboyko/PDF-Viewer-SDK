import { useEffect, useRef } from 'react';

import { useViewer } from '@/context/AppContext';
import { MuPdfEngine } from '@/engine/MuPdfEngine';
import { PdfJsEngine } from '@/engine/PdfJsEngine';
import { DocumentModel } from '@/model';
import type { EnginePreference, PageDescriptor } from '@/types/model';
import type { PDFDocument, PDFDocumentProxy } from '@/types/state';

import { BookmarkPanel } from '@/components/BookmarkPanel/BookmarkPanel';
import { ErrorBanner } from '@/components/ErrorBanner/ErrorBanner';
import { outlineNodesToBookmarks } from '@/hooks/useBookmarks';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { EditorPanel } from '../EditorPanel/EditorPanel';
import { PageViewport } from '../PageViewport/PageViewport';

import { LoadingBar } from './LoadingBar';

import styles from './PdfWorkspace.module.css';

const ENGINE_STORAGE_KEY = 'pdf-viewer-sdk-engine-preference';

function readStoredEnginePreference(): EnginePreference {
  try {
    const v = localStorage.getItem(ENGINE_STORAGE_KEY);
    if (v === 'pdfjs' || v === 'mupdf') {
      return v;
    }
  } catch {
    /* private mode or storage blocked */
  }
  return 'pdfjs';
}

export interface PdfWorkspaceProps {
  /** Local file or URL string (e.g. bundled sample path). */
  source: File | string;
  filename: string;
  onClose: () => void;
}

export function PdfWorkspace({ source, filename, onClose }: PdfWorkspaceProps) {
  const { dispatch } = useViewer();
  const engineRef = useRef<PdfJsEngine | MuPdfEngine | null>(null);

  useEffect(() => {
    let cancelled = false;
    const preference = readStoredEnginePreference();
    dispatch({ type: 'SET_ENGINE_PREFERENCE', preference });
    const engine = preference === 'mupdf' ? new MuPdfEngine() : new PdfJsEngine();
    engineRef.current = engine;

    async function run(): Promise<void> {
      dispatch({ type: 'DOCUMENT_LOAD_START', filename });

      try {
        if (typeof source === 'string') {
          await engine.loadFromUrl(source, (p) => {
            const prog =
              p.fraction ??
              (p.total != null && p.total > 0 ? p.loaded / p.total : undefined);
            if (prog != null) {
              dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: prog });
            }
          });
        } else {
          const buf = await source.arrayBuffer();
          await engine.loadFromBuffer(buf, (p) => {
            const prog =
              p.fraction ??
              (p.total != null && p.total > 0 ? p.loaded / p.total : undefined);
            if (prog != null) {
              dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: prog });
            }
          });
        }

        if (cancelled) {
          engine.destroy();
          return;
        }

        const bytes = await engine.getDocumentBytes();
        const model = await DocumentModel.fromBytes(bytes);
        const pageCount = engine.pageCount;

        const pages: PageDescriptor[] = Array.from({ length: pageCount }, (_, i) => {
          const d = engine.getPageDimensions(i);
          return {
            id: globalThis.crypto.randomUUID(),
            sourceIndex: i,
            rotation: d.rotation,
          };
        });

        if (cancelled) {
          engine.destroy();
          return;
        }

        dispatch({
          type: 'DOCUMENT_LOADED',
          engine: engine as unknown as PDFDocumentProxy,
          model: model as unknown as PDFDocument,
          pageCount,
          pages,
        });

        try {
          const outline = await engine.getOutline();
          dispatch({ type: 'SET_BOOKMARKS', bookmarks: outlineNodesToBookmarks(outline) });
        } catch {
          dispatch({ type: 'SET_BOOKMARKS', bookmarks: [] });
        }
      } catch (e) {
        engine.destroy();
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          dispatch({ type: 'DOCUMENT_LOAD_ERROR', error: message });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      const e = engineRef.current;
      engineRef.current = null;
      dispatch({ type: 'DOCUMENT_CLOSED' });
      e?.destroy();
    };
  }, [dispatch, filename, source]);

  return (
    <div className={styles.workspace}>
      <header className={styles.toolbar}>
        <span className={styles.filename}>{filename}</span>
        <button type="button" className={styles.closeBtn} aria-label="Close document" onClick={onClose}>
          Close
        </button>
      </header>

      <PdfWorkspaceBody />
    </div>
  );
}

function PdfWorkspaceBody() {
  const { state, dispatch } = useViewer();
  const { onKeyDown } = useKeyboardShortcuts(null);

  if (state.isEditorMode && !state.isLoading && !state.error) {
    return (
      <div className={styles.main}>
        <EditorPanel />
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className={styles.main} role="status" aria-live="polite">
        <LoadingBar progress={state.loadingProgress} />
        <p className={styles.status}>Loading…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.main}>
        <ErrorBanner
          message={state.error}
          onDismiss={() => dispatch({ type: 'RELOAD_DOCUMENT' })}
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.main} ${styles.keyboardShell}`}
      role="region"
      aria-label="PDF viewer"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PageViewport />
        </div>
        <BookmarkPanel />
      </div>
    </div>
  );
}
