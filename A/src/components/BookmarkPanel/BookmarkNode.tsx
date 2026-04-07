import { useState } from 'react';

import { useViewer } from '@/context/AppContext';
import type { Bookmark } from '@/types/state';

import styles from './BookmarkPanel.module.css';

export interface BookmarkNodeProps {
  bookmark: Bookmark;
  depth: number;
  canWrite: boolean;
  onNavigate: (b: Bookmark) => void;
  onRemove: (id: string) => void;
  onSave: (id: string, title: string, pageIndex: number) => void;
}

export function BookmarkNode({
  bookmark: b,
  depth,
  canWrite,
  onNavigate,
  onRemove,
  onSave,
}: BookmarkNodeProps) {
  const { state } = useViewer();
  const pageCount = state.pageCount;
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(b.title);
  const [pageDraft, setPageDraft] = useState(String(b.pageIndex + 1));

  const hasChildren = b.children.length > 0;

  return (
    <li className={styles.node} role="treeitem" style={{ paddingLeft: depth * 12 }}>
      <div className={styles.row}>
        {editing && canWrite ? (
          <form
            className={styles.editForm}
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseInt(pageDraft, 10);
              const page1 = Number.isFinite(parsed)
                ? Math.max(1, Math.min(pageCount, parsed))
                : 1;
              void onSave(b.id, titleDraft.trim() || 'Untitled', page1 - 1);
              setEditing(false);
            }}
          >
            <input
              aria-label="Bookmark title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <label className={styles.pageLabel}>
              Page
              <input
                aria-label="Bookmark target page"
                type="number"
                min={1}
                max={Math.max(1, pageCount)}
                value={pageDraft}
                onChange={(e) => setPageDraft(e.target.value)}
              />
            </label>
            <button type="submit" aria-label="Save bookmark">
              Save
            </button>
            <button
              type="button"
              aria-label="Cancel editing"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className={styles.linkBtn}
              aria-label={`Go to ${b.title}`}
              onClick={() => onNavigate(b)}
            >
              {b.title}
            </button>
            {canWrite ? (
              <>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Edit bookmark ${b.title}`}
                  onClick={() => {
                    setTitleDraft(b.title);
                    setPageDraft(String(b.pageIndex + 1));
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Remove bookmark ${b.title}`}
                  onClick={() => onRemove(b.id)}
                >
                  Remove
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
      {hasChildren ? (
        <ul className={styles.children} role="group">
          {b.children.map((ch) => (
            <BookmarkNode
              key={ch.id}
              bookmark={ch}
              depth={depth + 1}
              canWrite={canWrite}
              onNavigate={onNavigate}
              onRemove={onRemove}
              onSave={onSave}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
