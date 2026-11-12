import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  movesLeft: number
  inputLocked: boolean
  settled: boolean
  pump: (ms: number) => void
  draw: () => void
  findGoalChain: (min?: number) => { id: number; x: number; y: number }[] | null
  prepAdventureLevel: (n: number) => void
  home: () => void
  closeMeta: () => void
  forceBonusFinale: (moves: number) => void
  setMovesLeft: (n: number) => void
  openMeta: (w: 'map' | 'shop' | 'achievements' | 'collection') => void
  lastMovesLeftAtGoal: number
}

const calibLevels = [1, 2, 3, 4, 5, 6, 7, 8, 12, 16] as const

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

async function openLevel(page: import('@playwright/test').Page, id: number) {
  await page.evaluate((lvl) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.prepAdventureLevel(lvl)
    q.home()
  }, id)
  await tapMeta(page, 'Adventure')
  await page.locator('button.map-path-node .map-node-num', { hasText: String(id) }).tap()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
}

for (const [w, h, tag] of [
  [390, 844, '390x844'],
  [844, 390, '844x390'],
] as const) {
  test(`star bar states ${tag}`, async ({ page }) => {
    await ready(page, w, h)
    await openLevel(page, 7)
    const limit = await page.evaluate(() => {
      const el = document.querySelector('.moves-num')
      return Number(el?.textContent) || 22
    })
    await page.screenshot({ path: `/opt/cursor/artifacts/round7-star-start_${tag}.png` })
    await page.evaluate((mid) => (window as unknown as { __qa: Qa }).__qa.setMovesLeft(mid), Math.ceil(limit * 0.34))
    await page.screenshot({ path: `/opt/cursor/artifacts/round7-star-mid_${tag}.png` })
    await page.evaluate((low) => (window as unknown as { __qa: Qa }).__qa.setMovesLeft(low), Math.max(1, Math.floor(limit * 0.18)))
    await page.screenshot({ path: `/opt/cursor/artifacts/round7-star-lost_${tag}.png` })
    const markers = await page.locator('.star-marker:not(.star-goal)').count()
    expect(markers).toBe(2)
    const phantom = await page.locator('.star-marker.pos90').count()
    expect(phantom).toBe(0)
  })
}

for (const w of [360, 390] as const) {
  test(`meta back anchored ${w}`, async ({ page }) => {
    await ready(page, w, w === 360 ? 640 : 844)
    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.prepAdventureLevel(4)
    })
    await tapMeta(page, 'Shop')
    const panel = page.locator('.meta-panel')
    await expect(panel).toBeVisible()
    const back = page.locator('.meta-back')
    await expect(back).toBeVisible()
    const pb = await panel.boundingBox()
    const bb = await back.boundingBox()
    expect(pb && bb).toBeTruthy()
    if (pb && bb) {
      expect(bb.y + bb.height).toBeLessThanOrEqual(pb.y + pb.height + 2)
      expect(bb.x).toBeGreaterThanOrEqual(pb.x)
    }
    await page.screenshot({ path: `/opt/cursor/artifacts/round7-meta-back_${w}.png` })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())
  })
}

test('landscape finale frame 844x390', async ({ page }) => {
  await ready(page, 844, 390)
  await openLevel(page, 7)
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.forceBonusFinale(12))
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 1200; t += 25) q.pump(25)
  })
  await page.screenshot({ path: '/opt/cursor/artifacts/round7-finale-landscape.png' })
  const toastCoversScore = await page.evaluate(() => {
    const score = document.querySelector('.score')?.getBoundingClientRect()
    const toast = document.querySelector('.meta-toast')?.getBoundingClientRect()
    const hint = document.querySelector('.finale-skip-hint')?.getBoundingClientRect()
    if (!score) return true
    if (toast && !(toast.bottom < score.top || toast.top > score.bottom)) return true
    if (hint && !(hint.bottom < score.top || hint.top > score.bottom)) return true
    return false
  })
  expect(toastCoversScore).toBe(false)
})

test('goal-first touch calibration L1–L8 L12 L16', async ({ page }) => {
  test.setTimeout(900_000)
  const rows: { level: number; stars: number; movesLeft: number; limit: number; usedPct: number }[] = []
  for (const id of calibLevels) {
    await ready(page, 390, 844)
    await openLevel(page, id)
    const limit = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.movesLeft)
    for (let i = 0; i < 200; i++) {
      if (await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results')) break
      if (await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.inputLocked)) {
        await page.locator('canvas').first().tap()
        await page.evaluate(() => {
          const q = (window as unknown as { __qa: Qa }).__qa
          for (let t = 0; t < 500; t += 25) q.pump(25)
        })
        break
      }
      const path = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        return q.findGoalChain(3) ?? q.findGoalChain(2)
      })
      if (path?.length) {
        const box = await page.locator('canvas').first().boundingBox()
        if (box) {
          await page.mouse.move(box.x + path[0]!.x, box.y + path[0]!.y)
          await page.mouse.down()
          for (const pt of path) await page.mouse.move(box.x + pt.x, box.y + pt.y, { steps: 2 })
          await page.mouse.up()
        }
      }
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        for (let t = 0; t < 650; t += 35) q.pump(35)
      })
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled, undefined, { timeout: 8000 }).catch(() => {})
    }
    const stars = await page.locator('#results .stars .star.on').count()
    const movesLeft = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.lastMovesLeftAtGoal)
    const usedPct = Math.round(((limit - movesLeft) / limit) * 100)
    rows.push({ level: id, stars, movesLeft, limit, usedPct })
    if (await page.locator('#results [data-action="adventure-map"]').count()) {
      await page.locator('#results [data-action="adventure-map"]').tap()
      await page.evaluate(() => document.querySelector('#meta button')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    }
  }
  console.log('ROUND7_TOUCH_CALIB_TABLE', JSON.stringify(rows))
  await page.setViewportSize({ width: 390, height: 200 })
  await page.goto('about:blank')
  await page.evaluate((data) => {
    const el = document.createElement('pre')
    el.textContent = JSON.stringify(data, null, 2)
    document.body.append(el)
  }, rows)
  await page.screenshot({ path: '/opt/cursor/artifacts/round7-calibration-table.png', fullPage: true })

  const l8 = rows.find((r) => r.level === 8)
  if (l8 && l8.stars >= 1) expect(l8.usedPct).toBeLessThanOrEqual(88)
  const l1 = rows.find((r) => r.level === 1)!
  const l2 = rows.find((r) => r.level === 2)!
  if (l1.stars >= 1) {
    expect(l1.usedPct).toBeGreaterThanOrEqual(28)
    expect(l1.usedPct).toBeLessThanOrEqual(88)
  }
  if (l2.stars >= 1) {
    expect(l2.usedPct).toBeGreaterThanOrEqual(28)
    expect(l2.usedPct).toBeLessThanOrEqual(88)
  }
})
