import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const sizes = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
];

mkdirSync('/opt/cursor/artifacts', { recursive: true });
mkdirSync(join(process.cwd(), 'qa/shots'), { recursive: true });

const browser = await chromium.launch();
const browserContext = await browser.newContext({ serviceWorkers: 'block' });
const base = 'http://127.0.0.1:4173/bonbon-boing/';

function sha(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
}

for (const [w, h] of sizes) {
  const shots = [{ combo: false }];
  if (w === 390 && h === 844) shots.push({ combo: true });

  for (const mode of shots) {
    const page = await browserContext.newPage();
    await page.setViewportSize({ width: w, height: h });
    const url = mode.combo
      ? `${base}?qa&screen=combo&autoplay=2&aim=1&freeze=1&_=${w}x${h}`
      : `${base}?qa&screen=play&aim=1&freeze=1&_=${w}x${h}`;
    await page.goto(url, { timeout: 90_000, waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ready === true, { timeout: 90_000 });
    await page.evaluate(() => {
      window.__bbApp?.resize?.();
      window.__bbApp?.syncHud?.();
      window.__bbApp?.draw();
    });
    await page.waitForTimeout(150);
    const box = await page.evaluate(
      ([vw, vh]) => window.__nextPreviewCrop?.(vw, vh) ?? null,
      [w, h],
    );
    if (!box) {
      console.warn('no crop box', w, h, mode);
      await page.close();
      continue;
    }
  if (box.vw !== w || box.vh !== h) {
      console.warn('viewport mismatch', w, h, box.vw, box.vh);
    }
    const clip = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.size),
      height: Math.round(box.size),
    };
    const name = mode.combo
      ? 'next-crop-combo-390x844.png'
      : `next-crop-play-${w}x${h}.png`;
    const outArt = `/opt/cursor/artifacts/${name}`;
    const outQa = join(process.cwd(), 'qa/shots', name);
    await page.screenshot({ path: outArt, clip, animations: 'disabled' });
    await page.screenshot({ path: outQa, clip, animations: 'disabled' });
    console.log(
      'wrote',
      name,
      `center ${box.cx.toFixed(1)},${box.cy.toFixed(1)}`,
      `sha ${sha(outArt)}`,
    );
    await page.close();
  }
}

await browser.close();
