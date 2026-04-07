import { test, expect } from '@playwright/test';

async function openSample(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load bundled sample PDF' }).click();
  await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' })).toBeVisible({
    timeout: 45_000,
  });
}

test.describe('Viewer', () => {
  test('opens bundled sample and shows filename', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Load bundled sample PDF' }).click();
    await expect(page.getByText('sample-basic.pdf')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' })).toBeVisible();
  });

  test('first page canvas has non-trivial raster data', async ({ page }) => {
    await openSample(page);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const dataUrlLen = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL().length);
    expect(dataUrlLen).toBeGreaterThan(500);
  });

  test('zoom in updates zoom readout', async ({ page }) => {
    await openSample(page);
    const toolbar = page.getByRole('toolbar', { name: 'Viewer toolbar' });
    const readout = toolbar.getByText(/^\d+%$/);
    const before = await readout.textContent();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    const after = await readout.textContent();
    expect(before).not.toEqual(after);
  });

  test('next page control advances page readout', async ({ page }) => {
    await openSample(page);
    const totalText = await page.getByText(/\/\s*\d+/).first().textContent();
    const totalMatch = totalText?.match(/\/\s*(\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1]!, 10) : 1;
    test.skip(total <= 1, 'needs a multi-page sample PDF');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByRole('textbox', { name: 'Current page number' })).toHaveValue('2');
  });

  test('view mode can switch to spread', async ({ page }) => {
    await openSample(page);
    await page.getByLabel('View mode').selectOption('spread');
    await expect(page.getByLabel('View mode')).toHaveValue('spread');
  });
});
