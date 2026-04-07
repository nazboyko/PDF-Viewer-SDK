import { useViewer } from '@/context/AppContext';
import { usePrint } from '@/hooks/usePrint';

export interface PrintButtonProps {
  className?: string;
}

export function PrintButton({ className }: PrintButtonProps) {
  const { state } = useViewer();
  const { print, isPrinting } = usePrint();
  const hasDoc = state.pdfEngine !== null && state.pageCount > 0;

  return (
    <button
      type="button"
      className={className}
      aria-label="Print"
      disabled={!hasDoc || isPrinting}
      onClick={() => void print()}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4V2h8v2H4zm-1 3h10a1 1 0 011 1v4h-2v3H4v-3H2V8a1 1 0 011-1zm1 0v2h8V7H4zm2 6h4v-2H6v2z"
        />
      </svg>
    </button>
  );
}
