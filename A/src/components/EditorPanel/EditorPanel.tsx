import { ViewerToolbar } from '@/components/ViewerToolbar/ViewerToolbar';

import { EditorToolbar } from './EditorToolbar';
import { PageGrid } from './PageGrid';

import styles from './EditorPanel.module.css';

export function EditorPanel() {
  return (
    <div className={styles.root}>
      <ViewerToolbar />
      <EditorToolbar />
      <div className={styles.gridWrap}>
        <PageGrid />
      </div>
    </div>
  );
}
