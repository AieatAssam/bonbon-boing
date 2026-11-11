import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

const shots = ['title', 'chain', 'pop', 'bomb', 'pause', 'results'] as const

async function shot(page: import('@playwright/test').Page, screen: string, seed: string) {
  await page.goto(`?qa&freeze=1&screen=${screen}&seed=${seed}`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

for (const [w, h] of [
  [360, 640],
  [390, 844],
  [844, 390],
] as const) {
  test(`shots ${w}x${h}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: w, height: h })
    for (const screen of shots) {
      await shot(page, screen, 'feel')
      const file = w === 360 && h === 640 && screen === 'title' ? `title_360x640.png` : `${screen}-${w}x${h}.png`
      await page.screenshot({ path: `/opt/cursor/artifacts/${file}`, animations: 'disabled' })
      await page.screenshot({ path: `qa/shots/${file}`, animations: 'disabled' })
    }
    if (w === 390 && h === 844) {
      await shot(page, 'rainbow', 'feel')
      await page.screenshot({ path: '/opt/cursor/artifacts/rainbow-390x844.png', animations: 'disabled' })
      await page.screenshot({ path: 'qa/shots/rainbow-390x844.png', animations: 'disabled' })
    }
  })
}
