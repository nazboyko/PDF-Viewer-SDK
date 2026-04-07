import { PDFDocument, degrees } from 'pdf-lib';

const LOAD_OPTS = { ignoreEncryption: true } as const;

function assertInRange1(page: number, pageCount: number): void {
  if (!Number.isFinite(page) || Math.floor(page) !== page || page < 1 || page > pageCount) {
    throw new RangeError(`Page ${page} out of range [1, ${pageCount}]`);
  }
}

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

/**
 * DocumentModel — single mutation point for PDF editing (pdf-lib).
 * Public API uses 1-indexed page numbers; pdf-lib indices stay internal.
 */
export class DocumentModel {
  private constructor(private readonly pdfDoc: PDFDocument) {}

  static async fromBytes(bytes: Uint8Array): Promise<DocumentModel> {
    if (bytes.byteLength === 0) {
      throw new Error('Empty PDF bytes');
    }
    const pdfDoc = await PDFDocument.load(bytes, LOAD_OPTS);
    return new DocumentModel(pdfDoc);
  }

  pageCount(): number {
    return this.pdfDoc.getPageCount();
  }

  async rotatePages(pageNumbers: number[], deltaDegrees: 90 | -90 | 180): Promise<void> {
    const pc = this.pageCount();
    if (pageNumbers.length === 0) {
      return;
    }
    const unique = uniqueSorted(pageNumbers);
    for (const p of unique) {
      assertInRange1(p, pc);
    }
    for (const p of unique) {
      const page = this.pdfDoc.getPage(p - 1);
      const { angle } = page.getRotation();
      const next = ((angle + deltaDegrees) % 360 + 360) % 360;
      page.setRotation(degrees(next));
    }
  }

  async deletePages(pageNumbers: number[]): Promise<void> {
    const pc = this.pageCount();
    if (pageNumbers.length === 0) {
      return;
    }
    const unique = uniqueSorted(pageNumbers);
    for (const p of unique) {
      assertInRange1(p, pc);
    }
    if (unique.length === pc) {
      throw new Error('Cannot delete all pages');
    }
    const indices0 = unique.map((p) => p - 1).sort((a, b) => b - a);
    for (const i of indices0) {
      this.pdfDoc.removePage(i);
    }
  }

  async reorderPages(fromIndex: number, toIndex: number): Promise<void> {
    const pc = this.pageCount();
    assertInRange1(fromIndex, pc);
    assertInRange1(toIndex, pc);
    const from0 = fromIndex - 1;
    const to0 = toIndex - 1;
    if (from0 === to0) {
      return;
    }
    const [copied] = await this.pdfDoc.copyPages(this.pdfDoc, [from0]);
    this.pdfDoc.removePage(from0);
    this.pdfDoc.insertPage(to0, copied);
  }

  async extractPages(pageNumbers: number[]): Promise<DocumentModel> {
    const pc = this.pageCount();
    if (pageNumbers.length === 0) {
      throw new Error('Must extract at least one page');
    }
    for (const p of pageNumbers) {
      assertInRange1(p, pc);
    }
    const indices0 = pageNumbers.map((p) => p - 1);
    const target = await PDFDocument.create();
    const copied = await target.copyPages(this.pdfDoc, indices0);
    for (const page of copied) {
      target.addPage(page);
    }
    return new DocumentModel(target);
  }

  async mergePdf(otherBytes: Uint8Array, atPageIndex: number): Promise<void> {
    const pc = this.pageCount();
    if (atPageIndex < 1 || atPageIndex > pc + 1) {
      throw new RangeError(`atPageIndex ${atPageIndex} out of range [1, ${pc + 1}]`);
    }
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(otherBytes, LOAD_OPTS);
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    const n = source.getPageCount();
    if (n === 0) {
      return;
    }
    const srcIndices = Array.from({ length: n }, (_, i) => i);
    const copied = await this.pdfDoc.copyPages(source, srcIndices);
    const start0 = atPageIndex - 1;
    for (let i = 0; i < copied.length; i++) {
      this.pdfDoc.insertPage(start0 + i, copied[i]!);
    }
  }

  async save(): Promise<Uint8Array> {
    const bytes = await this.pdfDoc.save();
    return bytes;
  }
}
