import type { EnginePreference } from '@/types/model';

import styles from './EngineSelector.module.css';

export interface EngineSelectorProps {
  currentEngine: EnginePreference;
  onChangeEngine: (preference: EnginePreference) => void;
}

export function EngineSelector({ currentEngine, onChangeEngine }: EngineSelectorProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label} id="engine-selector-label">
        Rendering engine
      </span>
      <div
        className={styles.toggleRow}
        role="group"
        aria-labelledby="engine-selector-label"
      >
        <button
          type="button"
          className={currentEngine === 'pdfjs' ? styles.active : styles.option}
          aria-pressed={currentEngine === 'pdfjs'}
          aria-label="Use PDF.js engine"
          onClick={() => {
            onChangeEngine('pdfjs');
          }}
        >
          PDF.js
        </button>
        <button
          type="button"
          className={currentEngine === 'mupdf' ? styles.active : styles.option}
          aria-pressed={currentEngine === 'mupdf'}
          aria-label="Use MuPDF WASM engine"
          onClick={() => {
            onChangeEngine('mupdf');
          }}
        >
          MuPDF
        </button>
      </div>
      {currentEngine === 'mupdf' ? (
        <p className={styles.warn} role="status">
          WASM engine: ~10 MB download, no progressive loading.
        </p>
      ) : null}
    </div>
  );
}
