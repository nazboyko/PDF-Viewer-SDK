import { useCallback, type KeyboardEvent } from 'react';

import { EmbeddedPageCanvas } from '@/components/PageViewport/PageCanvas';
import type { PageDescriptor } from '@/types/model';

import styles from './DraggablePageCard.module.css';

export interface DraggablePageCardProps {
  page: PageDescriptor;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  thumbnailScale: number;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: (fromIndex: number, toIndex: number) => void;
}

const BASE_W = 140;
const BASE_H = 180;

export function DraggablePageCard({
  page,
  index,
  isSelected,
  onSelect,
  thumbnailScale,
  onDragStart,
  onDragOver,
}: DraggablePageCardProps) {
  const w = Math.round(BASE_W * thumbnailScale);
  const h = Math.round(BASE_H * thumbnailScale);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(index);
      }
    },
    [index, onSelect],
  );

  return (
    <div
      className={styles.card}
      data-selected={isSelected ? 'true' : undefined}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Page ${index + 1}, rotation ${page.rotation} degrees`}
      onClick={() => onSelect(index)}
      onKeyDown={onKeyDown}
      onPointerDown={() => onDragStart?.(index)}
      onPointerEnter={() => onDragOver?.(index)}
    >
      <label className={styles.checkWrap}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          aria-label={`Select page ${index + 1}`}
          onChange={() => onSelect(index)}
          onClick={(e) => e.stopPropagation()}
        />
      </label>
      <div className={styles.thumb} style={{ width: w, height: h }}>
        <EmbeddedPageCanvas
          pageIndex={page.sourceIndex}
          shouldRender
          slotViewport={{ width: w, height: h }}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.pageNum}>{index + 1}</span>
        <span className={styles.rotBadge} aria-hidden="true">
          {page.rotation}°
        </span>
      </div>
    </div>
  );
}
