import { useCallback, useEffect, useRef, useState } from 'react';

import { useEditor } from '@/context/AppContext';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';

import { DraggablePageCard } from './DraggablePageCard';

import styles from './PageGrid.module.css';

export function PageGrid() {
  const { state, dispatch } = useEditor();
  const { reorder } = useDocumentEditor();
  const { pages, selectedPages, editorThumbnailScale } = state;

  const [dragState, setDragState] = useState<{ sourceIndex: number; overIndex: number } | null>(null);
  const dragRef = useRef<{ sourceIndex: number; overIndex: number } | null>(null);
  const reorderRef = useRef(reorder);
  reorderRef.current = reorder;

  const onSelect = useCallback(
    (index: number) => {
      dispatch({ type: 'TOGGLE_PAGE_SELECTION', index });
    },
    [dispatch],
  );

  const onDragStart = useCallback((index: number) => {
    const next = { sourceIndex: index, overIndex: index };
    dragRef.current = next;
    setDragState(next);
  }, []);

  const onDragOver = useCallback((index: number) => {
    setDragState((prev) => {
      if (!prev) return null;
      const n = { ...prev, overIndex: index };
      dragRef.current = n;
      return n;
    });
  }, []);

  useEffect(() => {
    const finish = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      if (!d || d.sourceIndex === d.overIndex) return;
      void reorderRef.current(d.sourceIndex, d.overIndex);
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, []);

  return (
    <div
      className={styles.grid}
      role="list"
      aria-label="Page thumbnails"
    >
      {pages.map((page, index) => (
        <div
          key={page.id}
          className={styles.cell}
          role="listitem"
          data-drag-over={dragState?.overIndex === index ? 'true' : undefined}
        >
          <DraggablePageCard
            page={page}
            index={index}
            isSelected={selectedPages.has(index)}
            onSelect={onSelect}
            thumbnailScale={editorThumbnailScale}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
          />
        </div>
      ))}
    </div>
  );
}
