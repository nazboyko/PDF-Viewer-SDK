import type {
  LoadProgress,
  OutlineNode,
  PageDimensions,
  PdfEngine,
  RenderOptions,
  TextItem,
} from '@/types/engine';
import { PdfEngineError } from '@/types/engine';
import type { Bookmark } from '@/types/state';

import { loadMuPdf } from './loadMuPdf';

import type { Document, Matrix as MuMatrix, PDFPage, Pixmap, Quad, Rect } from 'mupdf';

type MupdfOutlineItem = {
  title?: string;
  uri?: string;
  open: boolean;
  down?: MupdfOutlineItem[];
  page?: number;
};

type MuPdfNs = Awaited<ReturnType<typeof loadMuPdf>>;

function normalizeRotation(degrees: number): 0 | 90 | 180 | 270 {
  const r = ((degrees % 360) + 360) % 360;
  return r === 0 || r === 90 || r === 180 || r === 270 ? r : 0;
}

function pdfPageRotation(page: PDFPage): 0 | 90 | 180 | 270 {
  try {
    const r = page.getObject().get('Rotate');
    if (r && r.isNumber()) return normalizeRotation(r.asNumber());
  } catch {
    /* ignore */
  }
  return 0;
}

function rectWidthHeight(r: Rect): { w: number; h: number } {
  return { w: r[2]! - r[0]!, h: r[3]! - r[1]! };
}

function quadBounds(q: Quad): { x: number; y: number; width: number; height: number } {
  const xs = [q[0], q[2], q[4], q[6]];
  const ys = [q[1], q[3], q[5], q[7]];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function mapOutlineTree(items: MupdfOutlineItem[]): OutlineNode[] {
  return items.map((it) => ({
    title: it.title ?? '',
    pageIndex: it.page != null ? it.page : null,
    children: it.down?.length ? mapOutlineTree(it.down) : [],
  }));
}

export class MuPdfEngine implements PdfEngine {
  readonly name = 'mupdf';
  private destroyed = false;
  private mupdf: MuPdfNs | null = null;
  private doc: Document | null = null;
  private storedBytes: Uint8Array | null = null;
  private dimensions: PageDimensions[] = [];
  /** Maps bookmark id (app state) to outline iterator path; kept in sync via syncBookmarkPathsFromTree. */
  private bookmarkPaths = new Map<string, number[]>();

  get pageCount(): number {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    return this.doc?.countPages() ?? 0;
  }

  private assertReady(): void {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.doc) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
  }

  private async ensureMuPdf(): Promise<MuPdfNs> {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new PdfEngineError(
        'LOAD_FAILED',
        'MuPDF requires COOP/COEP headers for SharedArrayBuffer. See README.',
      );
    }
    if (!this.mupdf) {
      try {
        this.mupdf = await loadMuPdf();
      } catch (e) {
        throw new PdfEngineError('LOAD_FAILED', e instanceof Error ? e.message : String(e));
      }
    }
    return this.mupdf;
  }

  private async openFromBytes(data: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void> {
    const mupdf = await this.ensureMuPdf();
    const u8 = new Uint8Array(data);
    this.storedBytes = new Uint8Array(u8);
    onProgress?.({
      loaded: u8.byteLength,
      total: u8.byteLength,
      fraction: 1,
    });
    try {
      this.doc = mupdf.Document.openDocument(u8, 'application/pdf');
    } catch (e) {
      this.doc = null;
      this.storedBytes = null;
      throw new PdfEngineError('LOAD_FAILED', e instanceof Error ? e.message : String(e));
    }
    if (this.doc.needsPassword()) {
      this.doc.destroy();
      this.doc = null;
      this.storedBytes = null;
      throw new PdfEngineError('PASSWORD_REQUIRED', 'Encrypted PDF');
    }
    const n = this.doc.countPages();
    const dims: PageDimensions[] = [];
    for (let i = 0; i < n; i++) {
      const page = this.doc.loadPage(i) as PDFPage;
      try {
        const b = page.getBounds('MediaBox');
        const { w, h } = rectWidthHeight(b);
        dims.push({
          widthPt: w,
          heightPt: h,
          rotation: pdfPageRotation(page),
        });
      } finally {
        page.destroy();
      }
    }
    this.dimensions = dims;
  }

  async loadFromBuffer(data: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    this.closeDocument();
    await this.openFromBytes(data, onProgress);
  }

  async loadFromUrl(url: string, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    this.closeDocument();
    let response: Response;
    try {
      response = await fetch(url);
    } catch (e) {
      throw new PdfEngineError('NETWORK_ERROR', e instanceof Error ? e.message : String(e));
    }
    if (!response.ok) {
      throw new PdfEngineError('NETWORK_ERROR', `HTTP ${response.status}`);
    }
    const total = response.headers.get('content-length');
    const totalNum = total != null ? parseInt(total, 10) : undefined;
    const body = response.body;
    if (!body) {
      const buf = await response.arrayBuffer();
      await this.openFromBytes(buf, (p) => onProgress?.(p));
      return;
    }
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        if (onProgress && totalNum != null && totalNum > 0) {
          onProgress({
            loaded,
            total: totalNum,
            fraction: loaded / totalNum,
          });
        }
      }
    }
    const out = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    await this.openFromBytes(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), (p) =>
      onProgress?.(p),
    );
  }

  private closeDocument(): void {
    try {
      this.doc?.destroy();
    } finally {
      this.doc = null;
      this.storedBytes = null;
      this.dimensions = [];
      this.bookmarkPaths.clear();
    }
  }

  getPageDimensions(pageIndex: number): PageDimensions {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.dimensions.length) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    return this.dimensions[pageIndex]!;
  }

  async renderPage(options: RenderOptions): Promise<void> {
    this.assertReady();
    const { pageIndex, canvas, scale, devicePixelRatio, rotation, signal } = options;
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    if (signal?.aborted) {
      throw new PdfEngineError('RENDER_CANCELLED');
    }

    const mupdf = await this.ensureMuPdf();
    const page = this.doc!.loadPage(pageIndex) as PDFPage;
    let pix: Pixmap | null = null;
    try {
      if (signal?.aborted) {
        throw new PdfEngineError('RENDER_CANCELLED');
      }
      const z = scale * devicePixelRatio;
      const { Matrix, ColorSpace } = mupdf;
      let mat: MuMatrix = Matrix.concat(Matrix.scale(z, z), page.getTransform());
      if (rotation !== 0) {
        mat = Matrix.concat(Matrix.rotate(rotation), mat);
      }
      pix = page.toPixmap(mat, ColorSpace.DeviceRGB, false, true, 'View', 'CropBox');
      if (signal?.aborted) {
        throw new PdfEngineError('RENDER_CANCELLED');
      }
      const w = pix.getWidth();
      const h = pix.getHeight();
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w / devicePixelRatio}px`;
      canvas.style.height = `${h / devicePixelRatio}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new PdfEngineError('LOAD_FAILED', 'Canvas 2D context unavailable');
      }
      const comps = pix.getNumberOfComponents();
      const pixels = pix.getPixels();
      const img = ctx.createImageData(w, h);
      const data = img.data;
      if (comps === 4) {
        data.set(pixels);
      } else if (comps === 3) {
        let o = 0;
        for (let i = 0; i < w * h; i++) {
          const j = i * 3;
          data[o++] = pixels[j]!;
          data[o++] = pixels[j + 1]!;
          data[o++] = pixels[j + 2]!;
          data[o++] = 255;
        }
      } else {
        throw new PdfEngineError('LOAD_FAILED', `Unexpected pixmap components: ${comps}`);
      }
      ctx.putImageData(img, 0, 0);
    } finally {
      pix?.destroy();
      page.destroy();
    }
  }

  async getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>> {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const page = this.doc!.loadPage(pageIndex) as PDFPage;
    const out: TextItem[] = [];
    try {
      const st = page.toStructuredText('preserve-whitespace');
      st.walk({
        onChar: (c: string, _origin: [number, number], font, _size: number, quad: Quad) => {
          const rect = quadBounds(quad);
          const fn = font.getName();
          out.push({
            str: c,
            rect,
            transform: [1, 0, 0, 1, rect.x, rect.y] as const,
            fontName: fn,
          });
        },
      });
      st.destroy();
    } finally {
      page.destroy();
    }
    return out;
  }

  async getOutline(): Promise<ReadonlyArray<OutlineNode>> {
    this.assertReady();
    const raw = this.doc!.loadOutline();
    if (!raw?.length) {
      return [];
    }
    return mapOutlineTree(raw);
  }

  /**
   * Rebuilds id → outline path mapping from the current bookmark tree and the loaded PDF outline.
   * Call after SET_BOOKMARKS matches `loadOutline()` (e.g. after load or refetch) before remove/update.
   */
  syncBookmarkPathsFromTree(bookmarks: readonly Bookmark[]): void {
    this.assertReady();
    this.bookmarkPaths.clear();
    const raw = this.doc!.loadOutline() ?? [];
    const walk = (nodes: readonly Bookmark[], ol: MupdfOutlineItem[], prefix: number[]): void => {
      if (nodes.length !== ol.length) {
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        const path = [...prefix, i];
        this.bookmarkPaths.set(nodes[i]!.id, path);
        const chN = nodes[i]!.children;
        const chO = ol[i]?.down;
        if (chN.length > 0 && chO && chO.length > 0) {
          walk(chN, chO, path);
        }
      }
    };
    walk(bookmarks, raw, []);
  }

  private appendRootOutlineItem(item: MupdfOutlineItem): void {
    const mupdf = this.mupdf;
    if (!mupdf) {
      throw new PdfEngineError('LOAD_FAILED', 'MuPDF not initialized');
    }
    const { OutlineIterator } = mupdf;
    const iter = this.doc!.outlineIterator();
    const outline = this.doc!.loadOutline();
    const insertItem = {
      title: item.title ?? '',
      uri: item.uri,
      open: item.open,
    };
    if (!outline?.length) {
      iter.insert(insertItem);
      return;
    }
    let code = iter.next();
    if (code < 0) {
      throw new PdfEngineError('LOAD_FAILED', 'Outline iterator could not start');
    }
    for (;;) {
      if (code === OutlineIterator.ITERATOR_AT_EMPTY) {
        iter.insert(insertItem);
        return;
      }
      if (code !== OutlineIterator.ITERATOR_AT_ITEM) {
        throw new PdfEngineError('LOAD_FAILED', 'Unexpected outline iterator state');
      }
      code = iter.next();
      if (code < 0) {
        throw new PdfEngineError('LOAD_FAILED', 'Outline iterator failed');
      }
      if (code === OutlineIterator.ITERATOR_AT_EMPTY) {
        iter.insert(insertItem);
        return;
      }
    }
  }

  private navigateIteratorToPath(path: number[]): ReturnType<Document['outlineIterator']> {
    const mupdf = this.mupdf;
    if (!mupdf) {
      throw new PdfEngineError('LOAD_FAILED', 'MuPDF not initialized');
    }
    const { OutlineIterator } = mupdf;
    const iter = this.doc!.outlineIterator();
    let code = iter.next();
    if (code < 0) {
      throw new PdfEngineError('PAGE_NOT_FOUND', 'Outline is empty');
    }
    for (let depth = 0; depth < path.length; depth++) {
      const idx = path[depth]!;
      if (depth > 0) {
        code = iter.down();
        if (code < 0) {
          throw new PdfEngineError('PAGE_NOT_FOUND', 'Invalid outline depth');
        }
      }
      for (let s = 0; s < idx; s++) {
        code = iter.next();
        if (code !== OutlineIterator.ITERATOR_AT_ITEM) {
          throw new PdfEngineError('PAGE_NOT_FOUND', 'Invalid outline sibling index');
        }
      }
      if (code !== OutlineIterator.ITERATOR_AT_ITEM) {
        throw new PdfEngineError('PAGE_NOT_FOUND', 'Outline item not found');
      }
    }
    return iter;
  }

  addBookmark(title: string, pageIndex: number): void {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const mupdf = this.mupdf;
    if (!mupdf) {
      throw new PdfEngineError('LOAD_FAILED', 'MuPDF not initialized');
    }
    const { LinkDestination } = mupdf;
    const uri = this.doc!.formatLinkURI(new LinkDestination(0, pageIndex, LinkDestination.FIT));
    this.appendRootOutlineItem({ title, uri, open: true });
    this.syncBytesFromPdf();
  }

  removeBookmark(id: string): void {
    this.assertReady();
    const path = this.bookmarkPaths.get(id);
    if (!path?.length) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `Unknown bookmark id ${id}`);
    }
    const iter = this.navigateIteratorToPath(path);
    iter.delete();
    this.syncBytesFromPdf();
  }

  updateBookmark(id: string, title: string, pageIndex: number): void {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const path = this.bookmarkPaths.get(id);
    if (!path?.length) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `Unknown bookmark id ${id}`);
    }
    const mupdf = this.mupdf;
    if (!mupdf) {
      throw new PdfEngineError('LOAD_FAILED', 'MuPDF not initialized');
    }
    const { LinkDestination } = mupdf;
    const uri = this.doc!.formatLinkURI(new LinkDestination(0, pageIndex, LinkDestination.FIT));
    const iter = this.navigateIteratorToPath(path);
    iter.update({ title, uri, open: true });
    this.syncBytesFromPdf();
  }

  private syncBytesFromPdf(): void {
    this.assertReady();
    const pdf = this.doc!.asPDF();
    if (!pdf) throw new PdfEngineError('LOAD_FAILED', 'Not a PDF document');
    this.storedBytes = new Uint8Array(pdf.saveToBuffer().asUint8Array());
  }

  addRedaction(pageIndex: number, rect: { x: number; y: number; width: number; height: number }): void {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const page = this.doc!.loadPage(pageIndex) as PDFPage;
    try {
      const a = page.createAnnotation('Redact');
      a.setRect([rect.x, rect.y, rect.x + rect.width, rect.y + rect.height]);
      a.update();
      page.update();
    } finally {
      page.destroy();
    }
  }

  applyRedactions(): void {
    this.assertReady();
    for (let i = 0; i < this.pageCount; i++) {
      const page = this.doc!.loadPage(i) as PDFPage;
      try {
        page.applyRedactions(true, 2, 1, 0);
        page.update();
      } finally {
        page.destroy();
      }
    }
    this.syncBytesFromPdf();
  }

  addTextAnnotation(pageIndex: number, x: number, y: number, text: string): void {
    this.assertReady();
    if (pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new PdfEngineError('PAGE_NOT_FOUND', `pageIndex ${pageIndex}`);
    }
    const page = this.doc!.loadPage(pageIndex) as PDFPage;
    try {
      const a = page.createAnnotation('FreeText');
      a.setContents(text);
      a.setRect([x, y, x + 200, y + 28]);
      a.setDefaultAppearance('Helv', 12, [0, 0, 0]);
      a.update();
      page.update();
    } finally {
      page.destroy();
    }
    this.syncBytesFromPdf();
  }

  async getDocumentBytes(): Promise<Uint8Array> {
    if (this.destroyed) {
      throw new PdfEngineError('ENGINE_DESTROYED');
    }
    if (!this.storedBytes) {
      throw new PdfEngineError('LOAD_FAILED', 'No document loaded');
    }
    return new Uint8Array(this.storedBytes);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    try {
      this.closeDocument();
    } finally {
      this.mupdf = null;
      this.destroyed = true;
    }
  }
}
