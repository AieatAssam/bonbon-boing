import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

mkdirSync('/opt/cursor/artifacts', { recursive: true });

const sizes = [
  ['390', '844'],
  ['360', '640'],
  ['844', '390'],
];

const browser = await chromium.launch();
const base = 'http://127.0.0.1:4173/bonbon-boing/';

for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  await page.goto(`${base}?qa&screen=play&aim=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 45_000 });
  await page.evaluate(() => {
    const a = window.__bbApp;
    if (a) {
      a.freeze = true;
      a.draw();
    }
  });
  await page.waitForTimeout(150);
  const cap = `/opt/cursor/artifacts/mid-play-${w}x${h}.png`;
  await page.screenshot({ path: cap, fullPage: true, animations: 'disabled' });
  const mock = `/workspace/docs/mockups/play_${w}x${h}.png`;
  const out = `/opt/cursor/artifacts/compare-play-${w}x${h}.png`;
  if (existsSync(mock)) {
    execSync(
      `ffmpeg -y -i "${mock}" -i "${cap}" -filter_complex "[1:v][0:v]scale2ref=oh*mdar:ih[1s][0s];[0s][1s]hstack=inputs=2" "${out}" 2>/dev/null`,
    );
  }
  await page.close();
}

await browser.close();
console.log('Compare captures written to /opt/cursor/artifacts/compare-play-*.png');
