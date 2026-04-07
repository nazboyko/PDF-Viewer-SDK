/** Unscaled (CSS-point) dimensions of a single PDF page, as declared in the page's MediaBox. */
export interface PageDimensions {
  /** Width in PDF points (1 point = 1/72 inch). */
  readonly widthPt: number;
  /** Height in PDF points. */
  readonly heightPt: number;
  /** Inherent page rotation declared in the PDF (0, 90, 180, 270). */
  readonly rotation: 0 | 90 | 180 | 270;
}

/** A single node in the PDF outline (bookmark) tree. */
export interface OutlineNode {
  /** Display title of the bookmark. */
  readonly title: string;
  /** 0-indexed destination page, or null if the bookmark is a named action / external link. */
  readonly pageIndex: number | null;
  /** Child bookmarks. Empty array if leaf node. */
  readonly children: ReadonlyArray<OutlineNode>;
}

/** Progress report emitted during document loading. */
export interface LoadProgress {
  /** Bytes received so far. */
  readonly loaded: number;
  /** Total bytes if known (Content-Length header present), otherwise undefined. */
  readonly total: number | undefined;
  /** Fraction 0..1 if total is known, otherwise undefined. */
  readonly fraction: number | undefined;
}

/** Options passed to renderPage(). */
export interface RenderOptions {
  /** 0-indexed page number. */
  readonly pageIndex: number;
  /** Device-pixel scale factor (e.g. 2.0 for Retina). Applied on top of `scale`. */
  readonly devicePixelRatio: number;
  /** Viewport scale factor (1.0 = 100%). */
  readonly scale: number;
  /**
   * Additional rotation to apply on top of the page's inherent rotation.
   * Additive with PageDimensions.rotation: effective = (inherent + this) % 360.
   */
  readonly rotation: 0 | 90 | 180 | 270;
  /** Target canvas. The engine sizes and paints into this canvas. */
  readonly canvas: HTMLCanvasElement;
  /** AbortSignal — when aborted, the engine cancels any in-flight render and the promise rejects with PdfEngineError('RENDER_CANCELLED'). */
  readonly signal?: AbortSignal;
}

/** A single text span positioned on a page. */
export interface TextItem {
  /** The unicode string content. */
  readonly str: string;
  /** Bounding box in PDF-point coordinates, origin at bottom-left of the page. */
  readonly rect: Readonly<{ x: number; y: number; width: number; height: number }>;
  /** 6-element transform matrix [a, b, c, d, tx, ty] mapping from glyph space to page space. */
  readonly transform: readonly [number, number, number, number, number, number];
  /** Font name as declared in the PDF (e.g. "Helvetica", "TimesNewRoman"). */
  readonly fontName: string;
}

/**
 * Discriminated error codes for PdfEngine operations.
 *
 * - LOAD_FAILED:       the document could not be parsed (corrupt / not a PDF)
 * - PASSWORD_REQUIRED: the document is encrypted and no password was supplied
 * - PAGE_NOT_FOUND:    pageIndex is out of range [0, pageCount)
 * - RENDER_CANCELLED:  the render was aborted via AbortSignal
 * - NETWORK_ERROR:     fetch/range-request failure during URL loading
 * - ENGINE_DESTROYED:  method called after destroy()
 * - UNSUPPORTED:       feature not available in this engine adapter
 */
export type PdfEngineErrorCode =
  | 'LOAD_FAILED'
  | 'PASSWORD_REQUIRED'
  | 'PAGE_NOT_FOUND'
  | 'RENDER_CANCELLED'
  | 'NETWORK_ERROR'
  | 'ENGINE_DESTROYED'
  | 'UNSUPPORTED';

export class PdfEngineError extends Error {
  readonly code: PdfEngineErrorCode;

  constructor(code: PdfEngineErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'PdfEngineError';
    this.code = code;
  }
}

export interface PdfEngine {
  // -- Identity --

  /**
   * Human-readable engine name for diagnostics and UI display.
   * @example "pdfjs" | "mupdf-wasm"
   */
  readonly name: string;

  // -- Loading --

  /**
   * Load a PDF document from raw bytes.
   *
   * After the returned promise resolves, `pageCount` and `getPageDimensions`
   * are available synchronously.
   *
   * @param data - Complete PDF file as an ArrayBuffer.
   * @param onProgress - Optional progress callback.
   *
   * @throws {PdfEngineError} code 'LOAD_FAILED' if the buffer is not a valid PDF.
   * @throws {PdfEngineError} code 'PASSWORD_REQUIRED' if the PDF is encrypted.
   *
   * Supported: PDF.js, MuPDF.
   */
  loadFromBuffer(data: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void>;

  /**
   * Load a PDF document from a URL.
   *
   * Uses HTTP Range requests when the server supports them, enabling
   * linearized (progressive) rendering.
   *
   * @param url - Absolute or relative URL to a PDF resource.
   * @param onProgress - Fires repeatedly as chunks arrive.
   *
   * @throws {PdfEngineError} code 'NETWORK_ERROR' on fetch failure.
   * @throws {PdfEngineError} code 'LOAD_FAILED' if the response is not a valid PDF.
   * @throws {PdfEngineError} code 'PASSWORD_REQUIRED' if the PDF is encrypted.
   *
   * Supported: PDF.js (full linearization), MuPDF (loads entire blob first).
   */
  loadFromUrl(url: string, onProgress?: (p: LoadProgress) => void): Promise<void>;

  // -- Synchronous accessors (available after load resolves) --

  /**
   * Total number of pages in the document.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  readonly pageCount: number;

  /**
   * Returns the unscaled dimensions of the given page. Synchronous.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getPageDimensions(pageIndex: number): PageDimensions;

  // -- Rendering --

  /**
   * Render a single page into the supplied canvas.
   *
   * Abort support: pass `options.signal` from an `AbortController`.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'RENDER_CANCELLED' if signal is aborted.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  renderPage(options: RenderOptions): Promise<void>;

  // -- Text layer --

  /**
   * Returns the text content of a page as an array of positioned items.
   *
   * @param pageIndex - 0-indexed page number.
   *
   * @throws {PdfEngineError} code 'PAGE_NOT_FOUND' if pageIndex is out of range.
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (native), MuPDF (via structured-text API).
   */
  getTextContent(pageIndex: number): Promise<ReadonlyArray<TextItem>>;

  // -- Outline --

  /**
   * Returns the document's outline (bookmark tree).
   * Returns an empty array if the PDF has no outline dictionary.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js (read-only), MuPDF (read/write).
   */
  getOutline(): Promise<ReadonlyArray<OutlineNode>>;

  // -- Raw bytes --

  /**
   * Returns the original (unmodified) PDF bytes that were loaded.
   * Used to initialise the pdf-lib DocumentModel for the editing pipeline.
   *
   * @throws {PdfEngineError} code 'ENGINE_DESTROYED' if called after destroy().
   *
   * Supported: PDF.js, MuPDF.
   */
  getDocumentBytes(): Promise<Uint8Array>;

  // -- Lifecycle --

  /**
   * Releases all resources held by the engine.
   * After calling destroy(), every other method throws PdfEngineError('ENGINE_DESTROYED').
   * Calling destroy() more than once is a safe no-op.
   *
   * Supported: PDF.js (terminates worker), MuPDF (frees WASM heap).
   */
  destroy(): void;
}
