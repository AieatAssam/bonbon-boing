import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  prepAdventureLevel: (n: number) => void
  startAdventure: (n: number) => void
  draw: () => void
  showTestToast: () => void
  adventureMovesTable: (max: number) => { level: number; moves: number; goals: string[] }[]
}

const auditViewports = [
  [360, 640, '360x640'],
  [390, 844, '390x844'],
  [430, 932, '430x932'],
  [844, 390, '844x390'],
  [932, 430, '932x430'],
  [1280, 800, '1280x800'],
] as const

const auditLevels = [1, 8, 24] as const

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
  await page.waitForFunction(() => {
    const q = (window as unknown as { __qa: { settled: boolean } }).__qa
    return q.settled
  }).catch(() => {})
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { pump: (n: number) => void } }).__qa
    for (let t = 0; t < 200; t += 25) q.pump(25)
    q.draw()
  })
}

for (const [w, h, tag] of auditViewports) {
  test(`adventure HUD clear of board ${tag}`, async ({ page }) => {
    await ready(page, w, h)
    const lvl = h >= w ? 1 : 8
    await openLevel(page, lvl)
    const check = await page.evaluate(() =>
      (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
    )
    console.log(`ROUND9_HUD_RECTS ${tag} L${lvl}`, JSON.stringify(check))
    expect(check.violations, `${tag} ${JSON.stringify(check)}`).toEqual([])
    await page.screenshot({ path: `/opt/cursor/artifacts/round9-adventure-hud_${tag}.png` })
  })
}

test('HUD rect audit L1 L8 L24 all sizes', async ({ page }) => {
  const report: { vp: string; level: number; violations: string[] }[] = []
  for (const [w, h, tag] of auditViewports) {
    for (const lvl of auditLevels) {
      await ready(page, w, h)
      await openLevel(page, lvl)
      const check = await page.evaluate(() =>
        (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
      )
      report.push({ vp: tag, level: lvl, violations: check.violations })
      expect(check.violations, `${tag} L${lvl}`).toEqual([])
    }
  }
  console.log('ROUND9_HUD_AUDIT', JSON.stringify(report))
})

for (const [w, h, tag] of [
  [844, 390, '844x390'],
  [932, 430, '932x430'],
] as const) {
  test(`landscape rush toast outside board ${tag}`, async ({ page }) => {
    await ready(page, w, h)
    await page.locator('#title button', { hasText: 'Score Rush' }).tap()
    await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa & { pump: (n: number) => void } }).__qa
      for (let t = 0; t < 120; t += 20) q.pump(20)
    })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.showTestToast())
    await page.waitForSelector('.meta-toast', { state: 'visible' })
    const check = await page.evaluate(() =>
      (window as unknown as { __checkHudPlayfield: () => { violations: string[] } }).__checkHudPlayfield(),
    )
    console.log(`ROUND9_TOAST ${tag}`, JSON.stringify(check))
    expect(check.violations.filter((v) => v.includes('toast'))).toEqual([])
    await page.screenshot({ path: `/opt/cursor/artifacts/round9-rush-toast_${tag}.png` })
  })
}

test('moves and goals L1–L24 table', async ({ page }) => {
  await ready(page, 390, 844)
  const rows = await page.evaluate(() =>
    (window as unknown as { __qa: Qa }).__qa.adventureMovesTable(24),
  )
  console.log('ROUND9_MOVES_GOALS', JSON.stringify(rows))
  await page.goto('about:blank')
  await page.evaluate((data) => {
    const el = document.createElement('pre')
    el.style.font = '12px monospace'
    el.textContent = data
      .map((r) => `L${r.level}\tmoves=${r.moves}\t${r.goals.join(' ')}`)
      .join('\n')
    document.body.append(el)
  }, rows)
  await page.screenshot({ path: '/opt/cursor/artifacts/round9-moves-goals-l1-24.png', fullPage: true })
  expect(rows.find((r) => r.level === 14)?.moves).toBe(18)
  expect(rows.find((r) => r.level === 16)?.moves).toBe(26)
  expect(rows.find((r) => r.level === 20)?.moves).toBe(24)
  expect(rows.find((r) => r.level === 24)?.moves).toBe(66)
  const l24 = rows.find((r) => r.level === 24)!
  expect(l24.goals).toEqual(expect.arrayContaining(['c4:14', 'ice:6', 'ch:1', 'bomb:2']))
})
