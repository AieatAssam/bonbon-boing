import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  prepAdventureLevel: (n: number) => void
  startAdventure: (n: number) => void
  draw: () => void
  cellD: () => number
}

const landscapeViewports = [
  [844, 390, '844x390'],
  [932, 430, '932x430'],
  [1280, 800, '1280x800'],
] as const

const landscapeLevels = [1, 8, 20, 24] as const

async function ready(page: import('@playwright/test').Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(`?qa&screen=title`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
}

async function openLevel(page: import('@playwright/test').Page, id: number) {
  await page.evaluate((lvl) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.prepAdventureLevel(lvl)
    q.startAdventure(lvl)
  }, id)
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
}

for (const [w, h, tag] of landscapeViewports) {
  for (const lvl of landscapeLevels) {
    test(`landscape adventure layout ${tag} L${lvl}`, async ({ page }) => {
      await ready(page, w, h)
      await openLevel(page, lvl)
      const dock = await page.evaluate(() =>
        (window as unknown as { __checkLandscapeAdventureDock: () => { violations: string[]; cellD: number } }).__checkLandscapeAdventureDock(),
      )
      const viewport = await page.evaluate(() =>
        (window as unknown as { __checkPlayfieldInViewport: () => { violations: string[] } }).__checkPlayfieldInViewport(),
      )
      console.log(`ROUND11_LANDSCAPE ${tag} L${lvl}`, JSON.stringify({ cellD: dock.cellD, dock, viewport }))
      if (tag === '844x390') expect(dock.cellD, `${tag} L${lvl} cell size`).toBeGreaterThanOrEqual(34)
      expect(dock.violations, `dock ${tag} L${lvl}`).toEqual([])
      expect(viewport.violations, `viewport ${tag} L${lvl}`).toEqual([])
      if ((lvl === 1 || lvl === 24) && (tag === '844x390' || tag === '932x430')) {
        await page.screenshot({ path: `/opt/cursor/artifacts/round11-landscape-L${lvl}_${tag}.png` })
      }
    })
  }
}

for (const [w, h, tag, grid, lvl] of [
  [360, 640, '360x640', '8x10', 24],
  [390, 844, '390x844', '7x9', 1],
  [390, 844, '390x844', '8x10', 24],
] as const) {
  test(`portrait cell size ${tag} ${grid} L${lvl}`, async ({ page }) => {
    await ready(page, w, h)
    await openLevel(page, lvl)
    const D = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.cellD())
    console.log(`ROUND11_PORTRAIT_CELL ${tag} L${lvl} D=${D}`)
    if (tag === '390x844') expect(D).toBeGreaterThanOrEqual(44)
    if (tag === '360x640' && lvl === 24) {
      await page.screenshot({ path: `/opt/cursor/artifacts/round11-portrait-L24_${tag}.png` })
    }
    if (tag === '390x844' && lvl === 24) {
      await page.screenshot({ path: `/opt/cursor/artifacts/round11-portrait-L24_${tag}.png` })
    }
  })
}
