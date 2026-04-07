import { useCallback, useState } from 'react';

import { useViewer } from '@/context/AppContext';
import { DocumentModel } from '@/model';

export interface SaveButtonProps {
  className?: string;
}

export function SaveButton({ className }: SaveButtonProps) {
  const { state } = useViewer();
  const [saving, setSaving] = useState(false);
  const hasDoc = state.pdfEngine !== null && state.pageCount > 0;
  const filename = state.filename ?? 'document.pdf';
  const downloadName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const onClick = useCallback(async () => {
    const raw = state.documentModel;
    if (!raw || saving) {
      return;
    }
    const model = raw as unknown as DocumentModel;
    setSaving(true);
    try {
      const bytes = await model.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.setAttribute('aria-hidden', 'true');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [state.documentModel, saving, downloadName]);

  return (
    <button
      type="button"
      className={className}
      aria-label="Download PDF"
      disabled={!hasDoc || saving}
      onClick={() => void onClick()}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 1v8.5l2.5-2.5 1.5 1.5L8 14 4 8.5l1.5-1.5L8 9.5V1h2zm-5 12v2h10v-2H3z"
        />
      </svg>
    </button>
  );
}
