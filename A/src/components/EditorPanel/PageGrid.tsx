import { useCallback, useState } from 'react';

import { useEditor } from '@/context/AppContext';

import { DraggablePageCard } from './DraggablePageCard';

import styles from './PageGrid.module.css';

export function PageGrid() {
  const { state, dispatch } = useEditor();
  const { pages, selectedPages, editorThumbnailScale } = state;

  const [dragState, setDragState] = useState<{ sourceIndex: number; overIndex: number } | null>(null);

  const onSelect = useCallback(
    (index: number) => {
      dispatch({ type: 'TOGGLE_PAGE_SELECTION', index });
    },
    [dispatch],
  );

  const onDragStart = useCallback((index: number) => {
    setDragState({ sourceIndex: index, overIndex: index });
  }, []);

  const onDragOver = useCallback((index: number) => {
    setDragState((prev) => (prev ? { ...prev, overIndex: index } : null));
  }, []);

  const onPointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <div
      className={styles.grid}
      role="list"
      aria-label="Page thumbnails"
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
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
