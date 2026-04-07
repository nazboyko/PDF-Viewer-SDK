import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { DocumentModel } from '@/model/DocumentModel';

async function pdfBytesWithPageCount(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) {
    doc.addPage([612, 792]);
  }
  return new Uint8Array(await doc.save());
}

describe('DocumentModel', () => {
  it('empty rotatePages is a no-op', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(2));
    await m.rotatePages([], 90);
    expect(m.pageCount()).toBe(2);
  });

  it('empty deletePages is a no-op', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(2));
    await m.deletePages([]);
    expect(m.pageCount()).toBe(2);
  });

  it('throws RangeError for out-of-range page on rotatePages', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(2));
    await expect(m.rotatePages([3], 90)).rejects.toThrow(RangeError);
    await expect(m.rotatePages([0], 90)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for non-integer page on rotatePages', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(2));
    await expect(m.rotatePages([1.5], 90)).rejects.toThrow(RangeError);
  });

  it('deduplicates duplicate page numbers in rotatePages', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(1));
    await m.rotatePages([1, 1, 1], 90);
    const bytes = await m.save();
    const verify = await PDFDocument.load(bytes);
    expect(verify.getPage(0).getRotation().angle).toBe(90);
  });

  it('throws RangeError when deleting all pages', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(1));
    await expect(m.deletePages([1])).rejects.toThrow(RangeError);
  });

  it('reorderPages(n, n) is a no-op', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(3));
    await m.reorderPages(2, 2);
    expect(m.pageCount()).toBe(3);
  });

  it('reorderPages(1, 3) on a 5-page doc moves first page to third position', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(5));
    await m.rotatePages([1], 90);
    await m.reorderPages(1, 3);
    const verify = await PDFDocument.load(await m.save());
    expect(verify.getPageCount()).toBe(5);
    expect(verify.getPage(0).getRotation().angle).toBe(0);
    expect(verify.getPage(1).getRotation().angle).toBe(0);
    expect(verify.getPage(2).getRotation().angle).toBe(90);
    expect(verify.getPage(3).getRotation().angle).toBe(0);
    expect(verify.getPage(4).getRotation().angle).toBe(0);
  });

  it('mergePdf at pageCount + 1 appends all pages', async () => {
    const base = await DocumentModel.fromBytes(await pdfBytesWithPageCount(3));
    const other = await pdfBytesWithPageCount(2);
    await base.mergePdf(other, 4);
    expect(base.pageCount()).toBe(5);
  });

  it('extractPages with duplicate page numbers copies the page twice', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(3));
    const extracted = await m.extractPages([1, 1]);
    expect(extracted.pageCount()).toBe(2);
  });

  it('throws RangeError for empty merge bytes', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(1));
    await expect(m.mergePdf(new Uint8Array(), 1)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for invalid merge insert index', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(1));
    const other = await pdfBytesWithPageCount(1);
    await expect(m.mergePdf(other, 0)).rejects.toThrow(RangeError);
    await expect(m.mergePdf(other, 3)).rejects.toThrow(RangeError);
  });

  it('fromBytes throws RangeError for empty bytes', async () => {
    await expect(DocumentModel.fromBytes(new Uint8Array())).rejects.toThrow(RangeError);
  });

  it('extractPages throws RangeError when empty array', async () => {
    const m = await DocumentModel.fromBytes(await pdfBytesWithPageCount(1));
    await expect(m.extractPages([])).rejects.toThrow(RangeError);
  });
});
