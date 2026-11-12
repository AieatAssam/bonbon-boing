import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  prepAdventureLevel: (n: number) => void
  home: () => void
  draw: () => void
  showTestToast: () => void
  adventureMovesTable: (max: number) => { level: number; moves: number; chapter: number }[]
}

const hudViewports = [
  [360, 640, '360x640'],
  [390, 844, '390x844'],
  [844, 390, '844x390'],
] as const

const auditViewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

async function ready(page: import('@playwright/test').Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(`?qa&screen=title`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.addStyleTag({
    content: '.map-path-node.current { animation: none !important; transform: none !important; }',
  })
}

async function tapMeta(page: import('@playwright/test').Page, label: string) {
  await page.locator('#title .meta-row button').filter({ hasText: label }).tap()
}

async function openIceLevel(page: import('@playwright/test').Page, id = 1) {
  await page.evaluate((lvl) => {
    const q = (window as unknown as { __qa: Qa & { startAdventure: (n: number) => void } }).__qa
    q.prepAdventureLevel(lvl)
    q.startAdventure(lvl)
  }, id)
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
}

test('moves table L1–L24 (touch-tuned + formula)', async ({ page }) => {
  await ready(page, 390, 844)
  const rows = await page.evaluate(() =>
    (window as unknown as { __qa: Qa }).__qa.adventureMovesTable(24),
  )
  console.log('ROUND8_MOVES_L1_24', JSON.stringify(rows))
  await page.goto('about:blank')
  await page.evaluate((data) => {
    const el = document.createElement('pre')
    el.textContent = data.map((r) => `L${r.level}\t${r.moves}`).join('\n')
    document.body.append(el)
  }, rows)
  await page.screenshot({ path: '/opt/cursor/artifacts/round8-moves-l1-24.png', fullPage: true })
  expect(rows.find((r) => r.level === 16)?.moves).toBe(52)
  expect(rows.find((r) => r.level === 12)?.moves).toBe(11)
})

for (const [w, h, tag] of hudViewports) {
  test(`adventure HUD ice level ${tag}`, async ({ page }) => {
    await ready(page, w, h)
    await openIceLevel(page, w >= h ? 8 : 1)
    await expect(page.locator('#hud .star-progress')).toBeVisible()
    await expect(page.locator('#hud .goal-chip').first()).toBeVisible()
    const check = await page.evaluate(() =>
      (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
    )
    expect(check.violations, JSON.stringify(check)).toEqual([])
    await page.screenshot({ path: `/opt/cursor/artifacts/round8-adventure-hud_${tag}.png` })
  })
}

test('adventure HUD goal vs star bar — 6 viewports', async ({ page }) => {
  for (const [w, h] of auditViewports) {
    await ready(page, w, h)
    const lvl = w >= h ? 8 : 4
    await openIceLevel(page, lvl)
    const check = await page.evaluate(() =>
      (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
    )
    expect(check.violations, `${w}x${h} ${JSON.stringify(check)}`).toEqual([])
  }
})

test('landscape score rush toast avoids score', async ({ page }) => {
  await ready(page, 844, 390)
  await page.locator('#title button', { hasText: 'Score Rush' }).tap()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.showTestToast())
  await page.waitForSelector('.meta-toast', { state: 'visible' })
  await page.screenshot({ path: '/opt/cursor/artifacts/round8-rush-toast-landscape.png' })
  const check = await page.evaluate(() =>
    (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
  )
  expect(check.violations.filter((v) => v.includes('toast'))).toEqual([])
})
