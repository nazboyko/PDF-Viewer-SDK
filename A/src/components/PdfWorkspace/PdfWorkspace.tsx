import { useEffect, useRef } from 'react';

import { useViewer } from '@/context/AppContext';
import { PdfJsEngine } from '@/engine/PdfJsEngine';
import { DocumentModel } from '@/model';
import type { PageDescriptor } from '@/types/model';
import type { PDFDocument, PDFDocumentProxy } from '@/types/state';

import { PageCanvas } from '../PageViewport/PageCanvas';

import styles from './PdfWorkspace.module.css';

export interface PdfWorkspaceProps {
  /** Local file or URL string (e.g. bundled sample path). */
  source: File | string;
  filename: string;
  onClose: () => void;
}

export function PdfWorkspace({ source, filename, onClose }: PdfWorkspaceProps) {
  const { dispatch } = useViewer();
  const engineRef = useRef<PdfJsEngine | null>(null);

  useEffect(() => {
    let cancelled = false;
    const engine = new PdfJsEngine();
    engineRef.current = engine;

    async function run(): Promise<void> {
      dispatch({ type: 'DOCUMENT_LOAD_START', filename });

      try {
        if (typeof source === 'string') {
          await engine.loadFromUrl(source, (p) => {
            if (p.fraction != null) {
              dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: p.fraction });
            }
          });
        } else {
          const buf = await source.arrayBuffer();
          await engine.loadFromBuffer(buf, (p) => {
            if (p.fraction != null) {
              dispatch({ type: 'DOCUMENT_LOAD_PROGRESS', progress: p.fraction });
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
  const { state } = useViewer();

  if (state.isLoading) {
    return (
      <div className={styles.main} role="status" aria-live="polite">
        <p className={styles.status}>Loading…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.main}>
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <PageCanvas />
    </div>
  );
}
