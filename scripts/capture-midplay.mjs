import { chromium } from '@playwright/test';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';

mkdirSync('/opt/cursor/artifacts', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4173/bonbon-boing/?qa&screen=play&aim=1&freeze=1', {
  waitUntil: 'networkidle',
});
await page.waitForFunction(() => window.__ready === true, { timeout: 30_000 });
await page.waitForTimeout(200);
await page.screenshot({
  path: '/opt/cursor/artifacts/mid-play-390x844.png',
  fullPage: true,
  animations: 'disabled',
});
const vid = await page.video();
await page.close();
const src = await vid?.path();
if (src && existsSync(src)) {
  copyFileSync(src, '/opt/cursor/artifacts/gameplay-390x844.webm');
}
await browser.close();
