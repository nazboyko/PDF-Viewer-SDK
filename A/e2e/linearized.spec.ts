import { test, expect } from '@playwright/test';

test.describe('Progressive loading', () => {
  test('linearized sample asset is served', async ({ request }) => {
    const res = await request.get('/samples/sample-linearized.pdf');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type'] ?? '').toContain('pdf');
  });

  test('shows loading progress bar while PDF request is delayed', async ({ page }) => {
    await page.route('**/samples/sample-basic.pdf', async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.continue();
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Load bundled sample PDF' }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading document' })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('toolbar', { name: 'Viewer toolbar' })).toBeVisible({
      timeout: 60_000,
    });
  });
});
