import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import type { EnginePreference } from '@/types/model';

import { EngineSelector } from './EngineSelector';
import styles from './FilePicker.module.css';

export interface FilePickerProps {
  onFileSelected: (file: File) => void;
  onSampleSelected: (url: string, name: string) => void;
  enginePreference: EnginePreference;
  onChangeEngine: (preference: EnginePreference) => void;
}

export function FilePicker({
  onFileSelected,
  onSampleSelected,
  enginePreference,
  onChangeEngine,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const syncDragDepth = useCallback((delta: number) => {
    dragDepthRef.current += delta;
    if (dragDepthRef.current < 0) {
      dragDepthRef.current = 0;
    }
    setIsDragOver(dragDepthRef.current > 0);
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      syncDragDepth(1);
    },
    [syncDragDepth],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      syncDragDepth(-1);
    },
    [syncDragDepth],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type === 'application/pdf') {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
      e.target.value = '';
    },
    [onFileSelected],
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const loadSample = useCallback(() => {
    onSampleSelected('/samples/sample-basic.pdf', 'sample-basic.pdf');
  }, [onSampleSelected]);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>PDF Viewer SDK</h1>
        <p className={styles.lead}>Open a PDF to get started.</p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className={styles.hiddenInput}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />

        <button type="button" className={styles.primaryBtn} aria-label="Choose PDF file" onClick={openPicker}>
          Choose PDF
        </button>

        <div
          className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          aria-label="Drop a PDF file here"
        >
          <span className={styles.dropText}>Drag and drop a PDF here</span>
        </div>

        <button type="button" className={styles.linkBtn} aria-label="Load bundled sample PDF" onClick={loadSample}>
          Try a sample
        </button>

        <EngineSelector currentEngine={enginePreference} onChangeEngine={onChangeEngine} />
      </div>
    </div>
  );
}
