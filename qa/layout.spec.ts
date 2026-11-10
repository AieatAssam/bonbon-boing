import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const;

const screens = [
  'title',
  'play',
  'combo',
  'results',
  'gallery',
] as const;

mkdirSync(join(process.cwd(), 'qa/shots'), { recursive: true });

for (const [w, h] of viewports) {
  test.describe(`viewport ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });

    for (const screen of screens) {
      test(`${screen} layout`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        const mid = screen === 'play' || screen === 'combo' ? '&autoplay=3' : '';
        const freeze =
          screen === 'play' || screen === 'combo' ? '' : '&freeze=1';
        await page.goto(`/?qa&screen=${screen}${freeze}${mid}`, {
          timeout: 90_000,
        });
        await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, {
          timeout: 30_000,
        });
        const check = await page.evaluate(() => {
          const w = window as unknown as {
            __checkOverlaps?: () => { overlaps: unknown[]; offscreen: string[] };
          };
          return w.__checkOverlaps?.() ?? { overlaps: [], offscreen: [] };
        });
        expect(check.overlaps, JSON.stringify(check)).toEqual([]);
        expect(check.offscreen).toEqual([]);
        const blank = await page.evaluate(() => {
          const c = document.getElementById('field') as HTMLCanvasElement | null;
          if (!c) return true;
          const ctx = c.getContext('2d');
          if (!ctx) return true;
          const d = ctx.getImageData(
            Math.floor(c.width / 2),
            Math.floor(c.height / 3),
            1,
            1,
          ).data;
          return d[0] + d[1] + d[2] === 0 && d[3] === 0;
        });
        if (screen !== 'gallery') expect(blank).toBe(false);
        expect(errors).toEqual([]);
        await page.screenshot({
          path: `qa/shots/${screen}_${w}x${h}.png`,
          fullPage: true,
        });
      });
    }
  });
}
