import styles from './ErrorBanner.module.css';

export interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <p className={styles.text}>{message}</p>
      <button type="button" className={styles.dismiss} aria-label="Dismiss error" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
