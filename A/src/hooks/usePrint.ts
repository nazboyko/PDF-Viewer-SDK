import { useCallback, useRef, useState } from 'react';

import { useViewer } from '@/context/AppContext';
import type { PdfEngine } from '@/types/engine';

const PRINT_SCALE = 1.5;
const PRINT_DPR = 2;

function normalizeViewRot(n: number): 0 | 90 | 180 | 270 {
  const r = ((n % 360) + 360) % 360;
  if (r === 0 || r === 90 || r === 180 || r === 270) {
    return r;
  }
  return 0;
}

async function printViaIframe(
  engine: PdfEngine,
  pageCount: number,
  viewRotation: number,
): Promise<void> {
  const rotation = normalizeViewRot(viewRotation);
  const parts: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const canvas = document.createElement('canvas');
    await engine.renderPage({
      pageIndex: i,
      scale: PRINT_SCALE,
      devicePixelRatio: PRINT_DPR,
      rotation,
      canvas,
    });
    parts.push(`<img src="${canvas.toDataURL('image/png')}" alt="" />`);
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#fff}
img{display:block;width:100%;max-width:100%;page-break-after:always}
img:last-child{page-break-after:auto}
</style></head><body>${parts.join('')}</body></html>`;

  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve();
    };
    iframe.onload = () => {
      try {
        const w = iframe.contentWindow;
        if (!w) {
          done();
          return;
        }
        w.focus();
        w.print();
        setTimeout(done, 500);
      } catch (e) {
        if (!settled) {
          settled = true;
          iframe.remove();
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }
    };
    iframe.onerror = () => {
      if (!settled) {
        settled = true;
        iframe.remove();
        reject(new Error('Print iframe failed to load'));
      }
    };
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}

export function usePrint(): { print: () => Promise<void>; isPrinting: boolean } {
  const { state } = useViewer();
  const [isPrinting, setIsPrinting] = useState(false);
  const busyRef = useRef(false);

  const print = useCallback(async () => {
    const engine = state.pdfEngine as PdfEngine | null;
    if (!engine || state.pageCount === 0 || busyRef.current) {
      return;
    }
    busyRef.current = true;
    setIsPrinting(true);
    try {
      await printViaIframe(engine, state.pageCount, state.viewRotation);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setIsPrinting(false);
    }
  }, [state.pdfEngine, state.pageCount, state.viewRotation]);

  return { print, isPrinting };
}
