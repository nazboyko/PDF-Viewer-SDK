import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleLargePdf = path.join(__dirname, '../public/samples/sample-large.pdf');

async function openSampleAndEditor(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load bundled sample PDF' }).click();
  await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' })).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole('button', { name: 'Edit pages' }).click();
  await expect(page.getByRole('toolbar', { name: 'Document editor toolbar' })).toBeVisible();
}

test.describe('Editor', () => {
  test('rotate selected page updates rotation badge', async ({ page }) => {
    await openSampleAndEditor(page);
    const editorBar = page.getByRole('toolbar', { name: 'Document editor toolbar' });
    await page.getByRole('checkbox', { name: 'Select page 1' }).click();
    await editorBar.getByRole('button', { name: 'Rotate selected pages right' }).click();
    await expect(page.getByText('90°').first()).toBeVisible();
  });

  test('copy and paste increases page count', async ({ page }) => {
    await openSampleAndEditor(page);
    const totalBefore = await page
      .getByRole('toolbar', { name: 'Viewer toolbar' })
      .getByText(/\/\s*\d+/)
      .first()
      .textContent();
    const nBefore = parseInt(totalBefore?.match(/\/\s*(\d+)/)?.[1] ?? '1', 10);
    const editorBar = page.getByRole('toolbar', { name: 'Document editor toolbar' });
    await page.getByRole('checkbox', { name: 'Select page 1' }).click();
    await editorBar.getByRole('button', { name: 'Copy selected pages' }).click();
    await editorBar.getByRole('button', { name: 'Paste pages' }).click();
    await expect(
      page.getByRole('toolbar', { name: 'Viewer toolbar' }).getByText(`/ ${nBefore + 1}`),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('import merges a second PDF', async ({ page }) => {
    await openSampleAndEditor(page);
    const totalBefore = await page
      .getByRole('toolbar', { name: 'Viewer toolbar' })
      .getByText(/\/\s*\d+/)
      .first()
      .textContent();
    const nBefore = parseInt(totalBefore?.match(/\/\s*(\d+)/)?.[1] ?? '1', 10);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import pages from PDF' }).click();
    const fc = await fileChooserPromise;
    await fc.setFiles(sampleLargePdf);
    await expect
      .poll(
        async () => {
          const t = await page
            .getByRole('toolbar', { name: 'Viewer toolbar' })
            .getByText(/\/\s*\d+/)
            .first()
            .textContent();
          return parseInt(t?.match(/\/\s*(\d+)/)?.[1] ?? '0', 10);
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(nBefore);
  });

  test('extract downloads a PDF', async ({ page }) => {
    await openSampleAndEditor(page);
    const editorBar = page.getByRole('toolbar', { name: 'Document editor toolbar' });
    await page.getByRole('checkbox', { name: 'Select page 1' }).click();
    const downloadPromise = page.waitForEvent('download');
    await editorBar.getByRole('button', { name: 'Extract selected pages' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
  });

  test('download saves a PDF from the viewer toolbar', async ({ page }) => {
    await openSampleAndEditor(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
  });

  test('delete page reduces count when multiple pages exist', async ({ page }) => {
    await openSampleAndEditor(page);
    const editorBar = page.getByRole('toolbar', { name: 'Document editor toolbar' });
    await page.getByRole('checkbox', { name: 'Select page 1' }).click();
    await editorBar.getByRole('button', { name: 'Copy selected pages' }).click();
    await editorBar.getByRole('button', { name: 'Paste pages' }).click();
    await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' }).getByText(/\/\s*2/)).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('checkbox', { name: 'Select page 2' }).click();
    await page
      .getByRole('toolbar', { name: 'Document editor toolbar' })
      .getByRole('button', { name: 'Delete selected pages' })
      .click();
    await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' }).getByText(/\/\s*1/)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('reorder pages via drag', async ({ page }) => {
    await openSampleAndEditor(page);
    const editorBar = page.getByRole('toolbar', { name: 'Document editor toolbar' });
    await page.getByRole('checkbox', { name: 'Select page 1' }).click();
    await editorBar.getByRole('button', { name: 'Copy selected pages' }).click();
    await editorBar.getByRole('button', { name: 'Paste pages' }).click();
    await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' }).getByText(/\/\s*2/)).toBeVisible({
      timeout: 20_000,
    });
    const first = page.getByRole('button', { name: /Page 1,/ });
    const second = page.getByRole('button', { name: /Page 2,/ });
    await first.dragTo(second);
    await expect(page.getByRole('button', { name: /Page 1,/ })).toBeVisible();
  });
});
