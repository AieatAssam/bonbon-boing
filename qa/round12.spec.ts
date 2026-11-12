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
  openMeta: (which: 'map' | 'shop' | 'achievements' | 'collection') => void
  closeMeta: () => void
}

const portraitSizes = [
  [360, 640, '360x640'],
  [390, 844, '390x844'],
  [430, 932, '430x932'],
] as const

const portraitLevels = [8, 15, 20, 24] as const

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

for (const [w, h, tag] of portraitSizes) {
  for (const lvl of portraitLevels) {
    test(`portrait goal chips in viewport ${tag} L${lvl}`, async ({ page }) => {
      await ready(page, w, h)
      await openLevel(page, lvl)
      const check = await page.evaluate(() =>
        (window as unknown as { __checkPortraitGoalChips: () => { violations: string[]; cellD: number } }).__checkPortraitGoalChips(),
      )
      console.log(`ROUND12_PORTRAIT_CHIPS ${tag} L${lvl}`, JSON.stringify(check))
      expect(check.violations, `${tag} L${lvl}`).toEqual([])
      if (tag === '390x844') expect(check.cellD).toBeGreaterThanOrEqual(44)
      if (lvl === 24 && (tag === '360x640' || tag === '430x932')) {
        await page.screenshot({ path: `/opt/cursor/artifacts/round12-portrait-L24_${tag}.png` })
      }
    })
  }
}

test('stickers panel footer 390x844', async ({ page }) => {
  await ready(page, 390, 844)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.openMeta('achievements')
  })
  await page.waitForSelector('.meta-panel-body')
  const layout = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.meta-panel--scroll')
    const body = document.querySelector<HTMLElement>('.meta-panel-body')
    const footer = document.querySelector<HTMLElement>('.meta-panel-footer')
    const back = document.querySelector<HTMLElement>('.meta-panel-footer .meta-back')
    if (!panel || !body || !footer || !back) return { ok: false, reason: 'missing footer layout' }
    const pr = panel.getBoundingClientRect()
    const br = body.getBoundingClientRect()
    const fr = footer.getBoundingClientRect()
    return {
      ok: fr.top >= br.bottom - 2 && fr.bottom <= pr.bottom + 2,
      bodyBottom: br.bottom,
      footerTop: fr.top,
      bodyScrollable: body.scrollHeight > body.clientHeight + 8,
    }
  })
  expect(layout.ok, JSON.stringify(layout)).toBe(true)
  expect(layout.bodyScrollable).toBe(true)
  await page.screenshot({ path: '/opt/cursor/artifacts/round12-stickers-panel_390x844.png' })
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())
})
