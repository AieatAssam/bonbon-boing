import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

mkdirSync('/opt/cursor/artifacts', { recursive: true });

const playSizes = [
  ['390', '844'],
  ['360', '640'],
  ['430', '932'],
  ['844', '390'],
  ['932', '430'],
  ['1280', '800'],
];

const browser = await chromium.launch();
const base = 'http://127.0.0.1:4173/bonbon-boing/';

async function capPlay(w, h) {
  const page = await browser.newPage({
    viewport: { width: +w, height: +h },
    deviceScaleFactor: 2,
  });
  await page.goto(`${base}?qa&screen=play&aim=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 45_000 });
  await page.evaluate(() => {
    const a = window.__bbApp;
    if (a) {
      a.freeze = true;
      a.syncHud?.();
      a.draw();
    }
  });
  await page.waitForTimeout(200);
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

async function capCombo(w, h) {
  const page = await browser.newPage({
    viewport: { width: +w, height: +h },
    deviceScaleFactor: 2,
  });
  await page.goto(`${base}?qa&screen=combo&autoplay=2&aim=1`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__ready === true, { timeout: 60_000 });
  await page.evaluate(() => {
    const a = window.__bbApp;
    if (a) {
      a.freeze = true;
      a.draw();
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `/opt/cursor/artifacts/combo-mid-${w}x${h}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.close();
}

for (const [w, h] of playSizes) await capPlay(w, h);
await capCombo('390', '844');

await browser.close();
console.log('Compare captures written to /opt/cursor/artifacts/compare-play-*.png');
