import {
  getDocument,
  GlobalWorkerOptions,
  InvalidPDFException,
  MissingPDFException,
  UnexpectedResponseException,
} from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import type { LoadProgress, OutlineNode, PageDimensions, PdfEngine, RenderOptions, TextItem } from '@/types/engine';
import { PdfEngineError } from '@/types/engine';

import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

function normalizeRotation(degrees: number): 0 | 90 | 180 | 270 {
  const r = ((degrees % 360) + 360) % 360;
  if (r === 0 || r === 90 || r === 180 || r === 270) {
    return r;
  }
  return 0;
}

function mapLoadError(err: unknown): PdfEngineError {
  if (err instanceof PdfEngineError) {
    return err;
  }
  if (err instanceof InvalidPDFException) {
    return new PdfEngineError('LOAD_FAILED', err.message);
  }
  if (err instanceof MissingPDFException) {
    return new PdfEngineError('NETWORK_ERROR', err.message);
  }
  if (err instanceof UnexpectedResponseException) {
    return new PdfEngineError('NETWORK_ERROR', err.message);
  }
  if (err instanceof Error && err.name === 'PasswordException') {
    return new PdfEngineError('PASSWORD_REQUIRED', err.message);
  }
  if (err instanceof Error) {
    return new PdfEngineError('LOAD_FAILED', err.message);
  }
  return new PdfEngineError('LOAD_FAILED', String(err));
}

function attachProgress(
  task: ReturnType<typeof getDocument>,
  onProgress?: (p: LoadProgress) => void,
): void {
  if (!onProgress) return;
  task.onProgress = (progress: { loaded: number; total: number }) => {
    const total = progress.total > 0 ? progress.total : undefined;
    const fraction =
      total !== undefined && total > 0 ? progress.loaded / total : undefined;
    onProgress({
      loaded: progress.loaded,
      total,
      fraction,
    });
  };
}

export class PdfJsEngine implements PdfEngine {
  readonly name = 'pdfjs';

  private destroyed = false;

  private doc: PDFDocumentProxy | null = null;

  private dimensions: PageDimensions[] = [];

  get pageCount(): number {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    return this.doc?.numPages ?? 0;
  }

  async loadFromBuffer(data: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    await this.replaceDocument(async () => {
      const task = getDocument({ data: new Uint8Array(data) });
      attachProgress(task, onProgress);
      try {
        this.doc = await task.promise;
      } catch (e) {
        throw mapLoadError(e);
      }
    });
  }

  async loadFromUrl(url: string, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    await this.replaceDocument(async () => {
      const task = getDocument({ url });
      attachProgress(task, onProgress);
      try {
        this.doc = await task.promise;
      } catch (e) {
        throw mapLoadError(e);
      }
    });
  }

  private async replaceDocument(load: () => Promise<void>): Promise<void> {
    this.doc?.destroy();
    this.doc = null;
    this.dimensions = [];
    await load();
    await this.cachePageDimensions();
  }

  private async cachePageDimensions(): Promise<void> {
    if (!this.doc) return;
    const n = this.doc.numPages;
    const dims: PageDimensions[] = [];
    for (let i = 0; i < n; i++) {
      const page = await this.doc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1, rotation: 0 });
      dims.push({
        widthPt: viewport.width,
        heightPt: viewport.height,
        rotation: normalizeRotation(page.rotate),
      });
    }
    this.dimensions = dims;
  }

  getPageDimensions(pageIndex: number): PageDimensions {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    if (pageIndex < 0 || pageIndex >= this.dimensions.length) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    return this.dimensions[pageIndex]!;
  }

  async renderPage(options: RenderOptions): Promise<void> {
    void options;
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    throw new PdfEngineError('UNSUPPORTED', 'renderPage is implemented in Phase 5');
  }

  async getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>> {
    void pageIndex;
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    throw new PdfEngineError('UNSUPPORTED', 'getTextContent is implemented in Phase 5');
  }

  async getOutline(): Promise<ReadonlyArray<OutlineNode>> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    throw new PdfEngineError('UNSUPPORTED', 'getOutline is implemented in Phase 5');
  }

  async getDocumentBytes(): Promise<Uint8Array> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    throw new PdfEngineError('UNSUPPORTED', 'getDocumentBytes is implemented in Phase 5');
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    try {
      this.doc?.destroy();
    } finally {
      this.doc = null;
      this.dimensions = [];
      this.destroyed = true;
    }
  }
}
