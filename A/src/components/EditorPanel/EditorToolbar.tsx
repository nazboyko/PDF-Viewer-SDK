import { useRef } from 'react';

import { useEditor } from '@/context/AppContext';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';

import styles from './EditorToolbar.module.css';

export function EditorToolbar() {
  const { state, dispatch } = useEditor();
  const editor = useDocumentEditor();
  const importInputRef = useRef<HTMLInputElement>(null);
  const scale = state.editorThumbnailScale;
  const disabled = editor.isBusy;
  const hasSelection = state.selectedPages.size > 0;

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
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const buf = await file.arrayBuffer();
          editor.importPages(new Uint8Array(buf));
        }}
      />
      <button
        type="button"
        className={styles.btn}
        aria-label="Delete selected pages"
        disabled={disabled || !hasSelection}
        onClick={() => editor.deleteSelected()}
      >
        Delete Pages
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Rotate selected pages left"
        disabled={disabled || !hasSelection}
        onClick={() => editor.rotateLeft()}
      >
        Rotate Pages Left
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Rotate selected pages right"
        disabled={disabled || !hasSelection}
        onClick={() => editor.rotateRight()}
      >
        Rotate Pages Right
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Extract selected pages"
        disabled={disabled || !hasSelection}
        onClick={() => editor.extractPages()}
      >
        Extract Pages
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Undo"
        disabled={disabled || !editor.canUndo}
        onClick={() => editor.undo()}
      >
        Undo
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Redo"
        disabled={disabled || !editor.canRedo}
        onClick={() => editor.redo()}
      >
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
      <button
        type="button"
        className={styles.btn}
        aria-label="Copy selected pages"
        disabled={!hasSelection}
        onClick={() => editor.copy()}
      >
        Copy Pages
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Paste pages"
        disabled={disabled || state.copiedPageIndices.length === 0}
        onClick={() => editor.paste()}
      >
        Paste Pages
      </button>
    </div>
  );
}
