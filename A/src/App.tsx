import { useCallback, useState } from 'react';

import type { EnginePreference } from '@/types/model';

import { AppStateProvider } from './context/AppContext';
import { FilePicker } from './components/FilePicker/FilePicker';
import { PdfWorkspace } from './components/PdfWorkspace/PdfWorkspace';

const ENGINE_STORAGE_KEY = 'pdf-viewer-sdk-engine-preference';

function readStoredEngine(): EnginePreference {
  try {
    const v = localStorage.getItem(ENGINE_STORAGE_KEY);
    if (v === 'pdfjs' || v === 'mupdf') {
      return v;
    }
  } catch {
    /* private mode or storage blocked */
  }
  return 'pdfjs';
}

export type SelectedFile = { source: File | string; name: string };

export function App() {
  const [currentView, setCurrentView] = useState<'picker' | 'viewer'>('picker');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [enginePreference, setEnginePreference] = useState<EnginePreference>(() => readStoredEngine());

  const persistEngine = useCallback((preference: EnginePreference) => {
    setEnginePreference(preference);
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    console.log('onFileSelected', file.name);
    setSelectedFile({ source: file, name: file.name });
    setCurrentView('viewer');
  }, []);

  const handleSampleSelected = useCallback((url: string, name: string) => {
    console.log('onSampleSelected', url, name);
    setSelectedFile({ source: url, name });
    setCurrentView('viewer');
  }, []);

  const backToPicker = useCallback(() => {
    setSelectedFile(null);
    setCurrentView('picker');
  }, []);

  if (currentView === 'viewer' && selectedFile) {
    return (
      <AppStateProvider>
        <PdfWorkspace source={selectedFile.source} filename={selectedFile.name} onClose={backToPicker} />
      </AppStateProvider>
    );
  }

  return (
    <FilePicker
      enginePreference={enginePreference}
      onChangeEngine={persistEngine}
      onFileSelected={handleFileSelected}
      onSampleSelected={handleSampleSelected}
    />
  );
}
