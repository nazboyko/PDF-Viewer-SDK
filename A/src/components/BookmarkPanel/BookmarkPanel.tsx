import { useState } from 'react';

import { useBookmarks } from '@/hooks/useBookmarks';

import { BookmarkNode } from './BookmarkNode';

import styles from './BookmarkPanel.module.css';

export function BookmarkPanel() {
  const { bookmarks, canWrite, addBookmark, removeBookmark, saveBookmark, goToBookmark } =
    useBookmarks();
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={`${styles.panel} ${open ? styles.panelExpanded : styles.panelCollapsed}`}
      aria-label="Bookmarks panel"
    >
      <div className={styles.header}>
        {open ? (
          <>
            <h2 className={styles.title}>Bookmarks</h2>
            <button
              type="button"
              className={styles.collapseBtn}
              aria-label="Collapse bookmarks panel"
              onClick={() => setOpen(false)}
            >
              ›
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.expandBtn}
            aria-label="Expand bookmarks panel"
            onClick={() => setOpen(true)}
          >
            «
          </button>
        )}
      </div>
      {open ? (
        <>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.addBtn}
              disabled={!canWrite}
              title={
                canWrite
                  ? 'Add bookmark for current page'
                  : 'Switch to MuPDF engine to enable this feature.'
              }
              aria-label={
                canWrite ? 'Add bookmark for current page' : 'Add bookmark (requires MuPDF engine)'
              }
              onClick={() => void addBookmark()}
            >
              Add bookmark
            </button>
          </div>
          {bookmarks.length === 0 ? (
            <p className={styles.empty}>No bookmarks in this document.</p>
          ) : (
            <ul className={styles.tree} role="tree">
              {bookmarks.map((b) => (
                <BookmarkNode
                  key={b.id}
                  bookmark={b}
                  depth={0}
                  canWrite={canWrite}
                  onNavigate={goToBookmark}
                  onRemove={(id) => void removeBookmark(id)}
                  onSave={(id, title, pageIndex) => void saveBookmark(id, title, pageIndex)}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </aside>
  );
}
