import styles from './LoadingBar.module.css';

export interface LoadingBarProps {
  /** 0..1 download / parse progress */
  progress: number;
}

export function LoadingBar({ progress }: LoadingBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const indeterminate = clamped <= 0;

  return (
    <div
      className={styles.wrap}
      role="progressbar"
      aria-label="Loading document"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped * 100)}
    >
      <div className={styles.track}>
        {indeterminate ? (
          <div className={styles.fillIndeterminate} />
        ) : (
          <div className={styles.fill} style={{ width: `${clamped * 100}%` }} />
        )}
      </div>
    </div>
  );
}
