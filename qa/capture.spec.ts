import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

const shots = ['title', 'chain', 'pop', 'pause', 'results'] as const

for (const [w, h] of [
  [390, 844],
  [844, 390],
] as const) {
  test(`shots ${w}x${h}`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: w, height: h })
    for (const screen of shots) {
      await page.goto(`?qa&freeze=1&screen=${screen}&seed=feel`, { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      await page.evaluate(() => document.fonts.ready)
      const file = `${screen}-${w}x${h}.png`
      await page.screenshot({ path: `/opt/cursor/artifacts/${file}`, animations: 'disabled' })
      await page.screenshot({ path: `qa/shots/${file}`, animations: 'disabled' })
    }
  })
}

