import type { PageViewport } from 'pdfjs-dist';

/**
 * Sets canvas bitmap size and CSS size from a PDF.js viewport built with
 * `scale = userScale × devicePixelRatio` so output is sharp on high-DPI displays.
 */
export function sizeCanvasForViewport(
  canvas: HTMLCanvasElement,
  viewport: PageViewport,
  devicePixelRatio: number,
): void {
  const w = Math.floor(viewport.width);
  const h = Math.floor(viewport.height);
  canvas.width = w;
  canvas.height = h;
  const cssW = viewport.width / devicePixelRatio;
  const cssH = viewport.height / devicePixelRatio;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}
