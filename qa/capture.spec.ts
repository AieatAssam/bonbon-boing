import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

async function gotoShot(page: import('@playwright/test').Page, screen: string, freeze = true) {
  const freezeQ = freeze ? '&freeze=1' : ''
  await page.goto(`?qa${freezeQ}&screen=${screen}&seed=feel`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

async function snap(page: import('@playwright/test').Page, file: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${file}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${file}`, animations: 'disabled' })
}

for (const [w, h] of [
  [360, 640],
  [390, 844],
  [844, 390],
] as const) {
  test(`shots ${w}x${h}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: w, height: h })
    const tag = w === 360 && h === 640 ? (s: string) => (s === 'title' ? `title_360x640.png` : `${s}-${w}x${h}.png`) : (s: string) => `${s}-${w}x${h}.png`

    await gotoShot(page, 'title')
    await snap(page, tag('title'))

  if (w === 390 && h === 844) {
      const shots: [string, string][] = [
        ['chain', 'chain'],
        ['pop', 'pop'],
        ['bomb-piece', 'bomb-board'],
        ['bomb-blast', 'bomb-blast'],
        ['rainbow-piece', 'rainbow-board'],
        ['rainbow-blast', 'rainbow-blast'],
        ['pause', 'pause'],
        ['results', 'results'],
      ]
      for (const [screen, name] of shots) {
        await gotoShot(page, screen, screen !== 'results')
        await snap(page, `${name}-${w}x${h}.png`)
      }
      return
    }

    if (w === 844 && h === 390) {
      for (const screen of ['chain', 'pop', 'pause', 'results'] as const) {
        await gotoShot(page, screen, screen !== 'results')
        await snap(page, tag(screen))
      }
      await gotoShot(page, 'bomb-piece')
      await snap(page, `bomb-board-${w}x${h}.png`)
      await gotoShot(page, 'bomb-blast')
      await snap(page, `bomb-blast-${w}x${h}.png`)
      return
    }

    for (const screen of ['chain', 'pop', 'pause'] as const) {
      await gotoShot(page, screen)
      await snap(page, tag(screen))
    }
  })
}
