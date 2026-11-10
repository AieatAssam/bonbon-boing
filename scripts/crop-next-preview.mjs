import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
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

for (const [w, h] of sizes) {
  const page = await browserContext.newPage({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
  });
  const shots = [{ play: true }];
  if (w === 390 && h === 844) shots.push({ combo: true });

  for (const mode of shots) {
    const url = mode.combo
      ? `${base}?qa&screen=combo&autoplay=2&aim=1&freeze=1`
      : `${base}?qa&screen=play&aim=1&freeze=1`;
    await page.goto(url, { timeout: 90_000, waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ready === true, { timeout: 90_000 });
    await page.evaluate(() => {
      window.__bbApp?.resize?.();
      window.__bbApp?.syncHud?.();
      window.__bbApp?.draw();
    });
    await page.waitForTimeout(120);
    const box = await page.evaluate(() => window.__nextPreviewCrop?.() ?? null);
    if (!box) {
      console.warn('no crop box', w, h, mode);
      continue;
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
    await page.screenshot({
      path: `/opt/cursor/artifacts/${name}`,
      clip,
      animations: 'disabled',
    });
    await page.screenshot({
      path: join(process.cwd(), 'qa/shots', name),
      clip,
      animations: 'disabled',
    });
    console.log('wrote', name);
  }
  await page.close();
}

await browser.close();
