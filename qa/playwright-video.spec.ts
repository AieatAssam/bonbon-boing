import { test, expect } from '@playwright/test';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';

test.use({ video: 'on' });

mkdirSync('/opt/cursor/artifacts', { recursive: true });

test.describe.configure({ mode: 'serial' });

test('gameplay video 390x844', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?qa&screen=play&autoplay=4&aim=1', { timeout: 60_000 });
  await page.waitForFunction(() => (window as { __ready?: boolean }).__ready === true, {
    timeout: 40_000,
  });
  await page.screenshot({
    path: '/opt/cursor/artifacts/mid-play-390x844.png',
    animations: 'disabled',
  });
  const video = page.video();
  await page.close();
  const src = await video?.path();
  expect(src).toBeTruthy();
  if (src && existsSync(src)) {
    copyFileSync(src, '/opt/cursor/artifacts/gameplay-390x844.webm');
  }
});
