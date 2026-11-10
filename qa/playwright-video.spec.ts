import { test } from '@playwright/test';

test.use({ video: 'on' });
import { mkdirSync } from 'node:fs';

mkdirSync('/opt/cursor/artifacts', { recursive: true });

test.describe.configure({ mode: 'serial' });

test('gameplay video 390x844', async ({ page }) => {
  test.setTimeout(120_000);
  await context.clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?qa&screen=play&autoplay=5', { timeout: 60_000 });
  await page.waitForFunction(() => (window as { __ready?: boolean }).__ready === true, {
    timeout: 100_000,
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/opt/cursor/artifacts/mid-play-390x844.png' });
  await page.video()?.saveAs('/opt/cursor/artifacts/gameplay-390x844.webm');
});
