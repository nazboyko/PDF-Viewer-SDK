import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useEditor, useViewer } from '@/context/AppContext';
import { PdfJsEngine } from '@/engine/PdfJsEngine';
import { DocumentModel } from '@/model';
import type { PageDescriptor } from '@/types/model';
import type { PDFDocument, PDFDocumentProxy } from '@/types/state';

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

function buildPageDescriptors(engine: PdfJsEngine): PageDescriptor[] {
  const n = engine.pageCount;
  return Array.from({ length: n }, (_, i) => {
    const d = engine.getPageDimensions(i);
    return {
      id: globalThis.crypto.randomUUID(),
      sourceIndex: i,
      rotation: d.rotation,
    };
  });
}

export interface DocumentEditorApi {
  rotateLeft: () => void;
  rotateRight: () => void;
  deleteSelected: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  copy: () => void;
  paste: () => void;
  importPages: (bytes: Uint8Array) => void;
  extractPages: () => void;
  undo: () => void;
  redo: () => void;
  isBusy: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.setAttribute('aria-hidden', 'true');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DocumentEditorContext = createContext<DocumentEditorApi | null>(null);

function useDocumentEditorValue(): DocumentEditorApi {
  const { state: viewerState, dispatch } = useViewer();
  const { state: editorState } = useEditor();

  const undoBytesRef = useRef<Uint8Array[]>([]);
  const redoBytesRef = useRef<Uint8Array[]>([]);
  const busyRef = useRef(false);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (viewerState.documentModel === null) {
      undoBytesRef.current = [];
      redoBytesRef.current = [];
      setUndoLen(0);
      setRedoLen(0);
    }
  }, [viewerState.documentModel]);

  const commitSync = useCallback(
    async (engine: PdfJsEngine, model: DocumentModel) => {
      const bytes = await model.save();
      await engine.loadFromBuffer(toArrayBuffer(bytes));
      const newModel = await DocumentModel.fromBytes(bytes);
      const pages = buildPageDescriptors(engine);
      dispatch({
        type: 'DOCUMENT_EDIT_SYNC',
        engine: engine as unknown as PDFDocumentProxy,
        model: newModel as unknown as PDFDocument,
        pageCount: engine.pageCount,
        pages,
      });
    },
    [dispatch],
  );

  const withModel = useCallback(
    async (fn: (model: DocumentModel) => Promise<void>) => {
      const eng = viewerState.pdfEngine;
      const rawModel = viewerState.documentModel;
      if (!eng || !rawModel || busyRef.current) return;
      const engine = eng as PdfJsEngine;
      const model = rawModel as DocumentModel;
      busyRef.current = true;
      setBusy(true);
      try {
        const before = new Uint8Array(await model.save());
        undoBytesRef.current.push(before);
        redoBytesRef.current = [];
        setUndoLen(undoBytesRef.current.length);
        setRedoLen(0);
        await fn(model);
        await commitSync(engine, model);
      } catch (e) {
        undoBytesRef.current.pop();
        setUndoLen(undoBytesRef.current.length);
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(msg);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [viewerState.pdfEngine, viewerState.documentModel, commitSync],
  );

  const rotatePages = useCallback(
    async (delta: 90 | -90) => {
      const sel = Array.from(editorState.selectedPages).sort((a, b) => a - b);
      if (sel.length === 0) return;
      await withModel(async (model) => {
        const nums = sel.map((i) => {
          const p = editorState.pages[i];
          if (!p) throw new RangeError('Invalid page selection');
          return p.sourceIndex + 1;
        });
        await model.rotatePages(nums, delta);
      });
    },
    [editorState.selectedPages, editorState.pages, withModel],
  );

  const runDeleteSelected = useCallback(async () => {
    const sel = Array.from(editorState.selectedPages).sort((a, b) => b - a);
    if (sel.length === 0) return;
    await withModel(async (model) => {
      const nums = sel.map((i) => {
        const p = editorState.pages[i];
        if (!p) throw new RangeError('Invalid page selection');
        return p.sourceIndex + 1;
      });
      await model.deletePages(nums);
    });
  }, [editorState.selectedPages, editorState.pages, withModel]);

  const reorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const n = editorState.pages.length;
      if (fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n) return;
      await withModel(async (model) => {
        await model.reorderPages(fromIndex + 1, toIndex + 1);
      });
    },
    [editorState.pages.length, withModel],
  );

  const paste = useCallback(async () => {
    const copied = editorState.copiedPageIndices;
    if (copied.length === 0) return;
    await withModel(async (model) => {
      const nums = copied.map((i) => {
        const p = editorState.pages[i];
        if (!p) throw new RangeError('Invalid copied indices');
        return p.sourceIndex + 1;
      });
      const extracted = await model.extractPages(nums);
      const otherBytes = await extracted.save();
      await model.mergePdf(otherBytes, model.pageCount() + 1);
    });
  }, [editorState.copiedPageIndices, editorState.pages, withModel]);

  const copy = useCallback(() => {
    dispatch({ type: 'COPY_PAGES' });
  }, [dispatch]);

  const importPages = useCallback(
    async (bytes: Uint8Array) => {
      if (bytes.byteLength === 0) return;
      const importBytes = new Uint8Array(bytes);
      await withModel(async (model) => {
        const insertSpliceIndex =
          editorState.selectedPages.size === 0
            ? editorState.pages.length
            : Math.max(...Array.from(editorState.selectedPages)) + 1;
        const mergeAt1Based = insertSpliceIndex + 1;
        await model.mergePdf(importBytes, mergeAt1Based);
      });
    },
    [editorState.selectedPages, editorState.pages.length, withModel],
  );

  const extractPages = useCallback(async () => {
    const sel = Array.from(editorState.selectedPages).sort((a, b) => a - b);
    if (sel.length === 0) return;
    const rawModel = viewerState.documentModel;
    if (!rawModel || busyRef.current) return;
    const model = rawModel as DocumentModel;
    busyRef.current = true;
    setBusy(true);
    try {
      const nums = sel.map((i) => {
        const p = editorState.pages[i];
        if (!p) throw new RangeError('Invalid page selection');
        return p.sourceIndex + 1;
      });
      const extracted = await model.extractPages(nums);
      const outBytes = await extracted.save();
      const base =
        viewerState.filename?.replace(/\.pdf$/i, '')?.trim() || 'document';
      const name = `${base}-extracted.pdf`;
      downloadPdfBytes(outBytes, name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(msg);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [viewerState.documentModel, viewerState.filename, editorState.selectedPages, editorState.pages]);

  const undo = useCallback(async () => {
    if (busyRef.current || undoBytesRef.current.length === 0) return;
    const eng = viewerState.pdfEngine;
    const rawModel = viewerState.documentModel;
    if (!eng || !rawModel) return;
    const engine = eng as PdfJsEngine;
    const model = rawModel as DocumentModel;
    busyRef.current = true;
    setBusy(true);
    try {
      const prev = undoBytesRef.current.pop();
      setUndoLen(undoBytesRef.current.length);
      if (!prev) return;
      const current = await model.save();
      redoBytesRef.current.push(new Uint8Array(current));
      setRedoLen(redoBytesRef.current.length);
      await engine.loadFromBuffer(toArrayBuffer(prev));
      const newModel = await DocumentModel.fromBytes(new Uint8Array(prev));
      const pages = buildPageDescriptors(engine);
      dispatch({
        type: 'DOCUMENT_EDIT_SYNC',
        engine: engine as unknown as PDFDocumentProxy,
        model: newModel as unknown as PDFDocument,
        pageCount: engine.pageCount,
        pages,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(msg);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [viewerState.pdfEngine, viewerState.documentModel, dispatch]);

  const redo = useCallback(async () => {
    if (busyRef.current || redoBytesRef.current.length === 0) return;
    const eng = viewerState.pdfEngine;
    const rawModel = viewerState.documentModel;
    if (!eng || !rawModel) return;
    const engine = eng as PdfJsEngine;
    const model = rawModel as DocumentModel;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = redoBytesRef.current.pop();
      setRedoLen(redoBytesRef.current.length);
      if (!next) return;
      const current = await model.save();
      undoBytesRef.current.push(new Uint8Array(current));
      setUndoLen(undoBytesRef.current.length);
      await engine.loadFromBuffer(toArrayBuffer(next));
      const newModel = await DocumentModel.fromBytes(new Uint8Array(next));
      const pages = buildPageDescriptors(engine);
      dispatch({
        type: 'DOCUMENT_EDIT_SYNC',
        engine: engine as unknown as PDFDocumentProxy,
        model: newModel as unknown as PDFDocument,
        pageCount: engine.pageCount,
        pages,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(msg);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [viewerState.pdfEngine, viewerState.documentModel, dispatch]);

  return {
    rotateLeft: () => {
      void rotatePages(-90);
    },
    rotateRight: () => {
      void rotatePages(90);
    },
    deleteSelected: () => {
      void runDeleteSelected();
    },
    reorder: (from, to) => {
      void reorder(from, to);
    },
    copy,
    paste: () => {
      void paste();
    },
    importPages: (bytes) => {
      void importPages(bytes);
    },
    extractPages: () => {
      void extractPages();
    },
    undo: () => {
      void undo();
    },
    redo: () => {
      void redo();
    },
    isBusy: busy,
    canUndo: undoLen > 0,
    canRedo: redoLen > 0,
  };
}

export function EditorDocumentProvider({ children }: { children: ReactNode }) {
  const value = useDocumentEditorValue();
  return createElement(DocumentEditorContext.Provider, { value }, children);
}

export function useDocumentEditor(): DocumentEditorApi {
  const v = useContext(DocumentEditorContext);
  if (v === null) {
    throw new Error('useDocumentEditor must be used within EditorDocumentProvider');
  }
  return v;
}
