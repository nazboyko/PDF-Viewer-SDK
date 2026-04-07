import { useMemo } from 'react';

import { useViewer } from '@/context/AppContext';
import { useAnnotations } from '@/hooks/useAnnotations';

import styles from './AnnotationToolbar.module.css';

const MU_DISABLED = 'Requires MuPDF engine.';

export function AnnotationToolbar() {
  const { state, dispatch } = useViewer();
  const { applyPendingRedactions } = useAnnotations();

  const mupdfDisabled = state.activeEngineName !== 'mupdf';

  const pendingRedactCount = useMemo(() => {
    let n = 0;
    for (const list of state.redactionOverlays.values()) {
      n += list.length;
    }
    return n;
  }, [state.redactionOverlays]);

  const toggleTool = (tool: 'text' | 'redact-rect'): void => {
    if (mupdfDisabled) return;
    const next = state.activeAnnotationTool === tool ? null : tool;
    dispatch({ type: 'SET_ANNOTATION_TOOL', tool: next });
  };

  return (
    <div className={styles.group} role="group" aria-label="PDF annotations">
      <button
        type="button"
        className={`${styles.btn} ${state.activeAnnotationTool === 'text' ? styles.btnActive : ''}`}
        aria-label="Text annotation tool"
        aria-pressed={state.activeAnnotationTool === 'text'}
        disabled={mupdfDisabled}
        title={mupdfDisabled ? MU_DISABLED : undefined}
        onClick={() => toggleTool('text')}
      >
        Text
      </button>
      <button
        type="button"
        className={`${styles.btn} ${state.activeAnnotationTool === 'redact-rect' ? styles.btnActive : ''}`}
        aria-label="Rectangle redaction tool"
        aria-pressed={state.activeAnnotationTool === 'redact-rect'}
        disabled={mupdfDisabled}
        title={mupdfDisabled ? MU_DISABLED : undefined}
        onClick={() => toggleTool('redact-rect')}
      >
        Redact
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Apply redactions"
        disabled={mupdfDisabled || pendingRedactCount === 0}
        title={mupdfDisabled ? MU_DISABLED : undefined}
        onClick={() => void applyPendingRedactions()}
      >
        Apply Redactions
      </button>
    </div>
  );
}
