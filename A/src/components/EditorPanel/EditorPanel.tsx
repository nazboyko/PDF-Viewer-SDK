import { ViewerToolbar } from '@/components/ViewerToolbar/ViewerToolbar';
import { EditorDocumentProvider, useDocumentEditor } from '@/hooks/useDocumentEditor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { EditorToolbar } from './EditorToolbar';
import { PageGrid } from './PageGrid';

import styles from './EditorPanel.module.css';

export function EditorPanel() {
  return (
    <EditorDocumentProvider>
      <EditorPanelShell />
    </EditorDocumentProvider>
  );
}

function EditorPanelShell() {
  const editor = useDocumentEditor();
  const { onKeyDown } = useKeyboardShortcuts(editor);

  return (
    <div
      className={styles.root}
      role="region"
      aria-label="PDF editor"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <ViewerToolbar />
      <EditorToolbar />
      <div className={styles.gridWrap}>
        <PageGrid />
      </div>
    </div>
  );
}
