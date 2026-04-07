import { useRef } from 'react';

import { useEditor } from '@/context/AppContext';

import styles from './EditorToolbar.module.css';

export function EditorToolbar() {
  const { state, dispatch } = useEditor();
  const importInputRef = useRef<HTMLInputElement>(null);
  const scale = state.editorThumbnailScale;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Document editor toolbar">
      <button
        type="button"
        className={styles.btn}
        aria-label="Scan"
        onClick={() => {
          console.log('Scan: not implemented');
        }}
      >
        Scan
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Import pages from PDF"
        onClick={() => importInputRef.current?.click()}
      >
        Import
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
        onChange={() => {
          /* wired in Phase 15 */
        }}
      />
      <button type="button" className={styles.btn} aria-label="Delete selected pages" onClick={() => {}}>
        Delete Pages
      </button>
      <button type="button" className={styles.btn} aria-label="Rotate selected pages left" onClick={() => {}}>
        Rotate Pages Left
      </button>
      <button type="button" className={styles.btn} aria-label="Rotate selected pages right" onClick={() => {}}>
        Rotate Pages Right
      </button>
      <button type="button" className={styles.btn} aria-label="Extract selected pages" onClick={() => {}}>
        Extract Pages
      </button>
      <button type="button" className={styles.btn} aria-label="Undo" onClick={() => {}}>
        Undo
      </button>
      <button type="button" className={styles.btn} aria-label="Redo" onClick={() => {}}>
        Redo
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Zoom out thumbnails"
        onClick={() => dispatch({ type: 'SET_EDITOR_THUMBNAIL_SCALE', scale: scale / 1.1 })}
      >
        Zoom Out
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Zoom in thumbnails"
        onClick={() => dispatch({ type: 'SET_EDITOR_THUMBNAIL_SCALE', scale: scale * 1.1 })}
      >
        Zoom In
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Select none"
        onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
      >
        Select None
      </button>
      <button type="button" className={styles.btn} aria-label="Copy selected pages" onClick={() => {}}>
        Copy Pages
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Paste pages"
        disabled={state.copiedPageIndices.length === 0}
        onClick={() => {}}
      >
        Paste Pages
      </button>
    </div>
  );
}
