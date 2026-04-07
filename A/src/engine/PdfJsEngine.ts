import {
  getDocument,
  GlobalWorkerOptions,
  InvalidPDFException,
  MissingPDFException,
  RenderingCancelledException,
  UnexpectedResponseException,
} from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type {
  LoadProgress,
  OutlineNode,
  PageDimensions,
  PdfEngine,
  RenderOptions,
  TextItem,
} from '@/types/engine';
import { PdfEngineError } from '@/types/engine';

import { sizeCanvasForViewport } from './renderUtils';

GlobalWorkerOptions.workerSrc = workerSrc;

type PdfOutlineRaw = {
  title: string;
  dest?: string | unknown[] | null;
  url?: string | null;
  items?: PdfOutlineRaw[];
};

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

async function resolveOutlineDest(
  doc: PDFDocumentProxy,
  dest: string | unknown[] | null | undefined,
): Promise<number | null> {
  if (dest == null) return null;
  try {
    let explicit: unknown[] | null = null;
    if (typeof dest === 'string') {
      explicit = await doc.getDestination(dest);
    } else if (Array.isArray(dest)) {
      explicit = dest;
    }
    if (!explicit?.length) return null;
    const head = explicit[0];
    if (typeof head === 'number') {
      return Math.max(0, Math.floor(head) - 1);
    }
    type PageRef = Parameters<PDFDocumentProxy['getPageIndex']>[0];
    return await doc.getPageIndex(head as PageRef);
  } catch {
    return null;
  }
}

async function mapOutlineNode(
  doc: PDFDocumentProxy,
  node: PdfOutlineRaw,
): Promise<OutlineNode> {
  let pageIndex: number | null = null;
  if (node.url) {
    pageIndex = null;
  } else {
    pageIndex = await resolveOutlineDest(doc, node.dest ?? null);
  }
  const rawKids = node.items ?? [];
  const children: OutlineNode[] = await Promise.all(
    rawKids.map((ch) => mapOutlineNode(doc, ch)),
  );
  return { title: node.title, pageIndex, children };
}

function pdfTextItemToEngineItem(item: {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}): TextItem {
  const t = item.transform;
  const a = t[0] ?? 0;
  const b = t[1] ?? 0;
  const c = t[2] ?? 0;
  const d = t[3] ?? 0;
  const tx = t[4] ?? 0;
  const ty = t[5] ?? 0;
  return {
    str: item.str,
    rect: { x: tx, y: ty, width: item.width, height: item.height },
    transform: [a, b, c, d, tx, ty] as const,
    fontName: item.fontName,
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
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    const { pageIndex, canvas, scale, devicePixelRatio, rotation, signal } = options;
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    if (signal?.aborted) {
      throw new PdfEngineError('RENDER_CANCELLED');
    }

    const page: PDFPageProxy = await this.doc.getPage(pageIndex + 1);
    const totalRot = ((page.rotate + rotation) % 360 + 360) % 360;
    const viewport = page.getViewport({
      scale: scale * devicePixelRatio,
      rotation: totalRot,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new PdfEngineError('LOAD_FAILED', 'Canvas 2D context unavailable');
    }

    sizeCanvasForViewport(canvas, viewport, devicePixelRatio);

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      intent: 'display',
      background: 'rgb(255, 255, 255)',
    });

    const onAbort = (): void => {
      void renderTask.cancel();
    };
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      await renderTask.promise;
    } catch (e) {
      if (signal?.aborted || e instanceof RenderingCancelledException) {
        throw new PdfEngineError('RENDER_CANCELLED');
      }
      throw mapLoadError(e);
    } finally {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
  }

  async getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const page = await this.doc.getPage(pageIndex + 1);
    const content = await page.getTextContent();
    const out: TextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item) || typeof item.str !== 'string') continue;
      out.push(
        pdfTextItemToEngineItem({
          str: item.str,
          transform: item.transform as number[],
          width: item.width,
          height: item.height,
          fontName: item.fontName,
        }),
      );
    }
    return out;
  }

  async getOutline(): Promise<ReadonlyArray<OutlineNode>> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    const raw = await this.doc.getOutline();
    if (!raw?.length) {
      return [];
    }
    return Promise.all(raw.map((n) => mapOutlineNode(this.doc!, n as PdfOutlineRaw)));
  }

  async getDocumentBytes(): Promise<Uint8Array> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    return this.doc.getData();
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
