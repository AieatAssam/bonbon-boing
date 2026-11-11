import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  score: number
  movesLeft: number
  mode: string
  inputLocked: boolean
  settled: boolean
  pump: (ms: number) => void
  draw: () => void
  findChain: (m: number) => { id: number; x: number; y: number }[] | null
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  prepAdventureLevel: (n: number) => void
  home: () => void
  closeMeta: () => void
  setMovesLeft: (n: number) => void
  bonusActive: () => boolean
  lastMovesLeftAtGoal: number
  forceBonusFinale: (moves: number) => void
  finalePopsTotal: () => number
  findGoalChain: (min?: number) => { id: number; x: number; y: number }[] | null
}

const sizes = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

const calibLevels = [1, 2, 4, 6, 8, 12, 16] as const

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

async function dragOnce(page: import('@playwright/test').Page, minChain = 3) {
  const path = await page.evaluate((m) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let n = 8; n >= m; n--) {
      const p = q.findChain(n)
      if (p?.length) return p
    }
    return q.findChain(2)
  }, minChain)
  if (!path?.length) return false
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) return false
  const tip = path[path.length - 1]!
  await page.mouse.move(box.x + path[0]!.x, box.y + path[0]!.y)
  await page.mouse.down()
  for (const pt of path) await page.mouse.move(box.x + pt.x, box.y + pt.y, { steps: 2 })
  await page.mouse.up()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 700; t += 35) q.pump(35)
    q.draw()
  })
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled, undefined, { timeout: 8000 }).catch(() => {})
  return true
}

async function playUntilFinale(page: import('@playwright/test').Page, max = 100) {
  for (let i = 0; i < max; i++) {
    const st = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      return { locked: q.inputLocked, bonus: q.bonusActive(), screen: q.screen }
    })
    if (st.bonus || st.locked) return true
    if (st.screen === 'results') return false
  const ok = await dragOnce(page, 3)
    if (!ok) await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.pump(40))
  }
  return page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.bonusActive())
}

for (const [w, h] of sizes) {
  const tag = `${w}x${h}`
  test(`star HUD states ${tag}`, async ({ page }) => {
    test.setTimeout(240_000)
    await ready(page, w, h)
    await openLevel(page, 4)
    const hud = page.locator('.adventure-hud')
    await expect(hud).toBeVisible()
    await page.screenshot({ path: `/opt/cursor/artifacts/round6-star-full_${tag}.png` })
    const limit = await page.evaluate(() => {
      const pill = document.querySelector('.moves-num')
      return Number(pill?.textContent) || 26
    })
    await page.evaluate((mid) => (window as unknown as { __qa: Qa }).__qa.setMovesLeft(mid), Math.ceil(limit * 0.38))
    await page.screenshot({ path: `/opt/cursor/artifacts/round6-star-mid_${tag}.png` })
    await page.evaluate((low) => (window as unknown as { __qa: Qa }).__qa.setMovesLeft(low), Math.max(1, Math.ceil(limit * 0.18)))
    await page.screenshot({ path: `/opt/cursor/artifacts/round6-star-lost_${tag}.png` })
    const overlap = await page.evaluate(() => {
      const lbl = document.querySelector('.moves-lbl')
      const markers = [...document.querySelectorAll('.star-marker')]
      if (!lbl) return false
      const lr = lbl.getBoundingClientRect()
      return markers.some((m) => {
        const r = m.getBoundingClientRect()
        return !(r.bottom < lr.top || r.top > lr.bottom || r.right < lr.left || r.left > lr.right)
      })
    })
    expect(overlap).toBe(false)
  })
}

test('finale skip hint and watch vs skip score parity', async ({ page }) => {
  test.setTimeout(600_000)
  await ready(page, 390, 844)
  await openLevel(page, 1)
  const { bonusMoves, beforeWatch } = await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    const base = q.score
    q.forceBonusFinale(27)
    return { bonusMoves: q.finalePopsTotal(), beforeWatch: base }
  })
  expect(bonusMoves).toBe(27)
  await expect(page.locator('.finale-skip-hint')).toBeVisible()
  await page.screenshot({ path: '/opt/cursor/artifacts/round6-finale-skip-hint.png' })
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 6000; t += 25) q.pump(25)
  })
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results', undefined, { timeout: 20_000 })
  const watchScore = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.score)
  expect(watchScore).toBe(beforeWatch + bonusMoves * 500)

  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.home()
    q.closeMeta()
  })
  await openLevel(page, 1)
  const { movesSkip, beforeSkip } = await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    const base = q.score
    q.forceBonusFinale(27)
    return { movesSkip: q.finalePopsTotal(), beforeSkip: base }
  })
  await page.locator('canvas').first().tap()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results', undefined, { timeout: 15_000 })
  const skipScore = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.score)
  expect(movesSkip).toBe(bonusMoves)
  expect(skipScore).toBe(beforeSkip + movesSkip * 500)
  expect(skipScore).toBe(watchScore)
})

test('goal-first calibration table L1–16 sample', async ({ page }) => {
  test.setTimeout(900_000)
  const rows: { level: number; stars: number; movesLeft: number; limit: number; usedPct: number }[] = []
  for (const id of calibLevels) {
    await ready(page, 390, 844)
    await openLevel(page, id)
    const limit = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.movesLeft)
    for (let i = 0; i < 180; i++) {
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
        return q.findGoalChain(3) ?? q.findGoalChain(2) ?? q.findChain(2)
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
  console.log('ROUND6_CALIB_TABLE', JSON.stringify(rows))
  await page.evaluate((data) => {
    const el = document.createElement('pre')
    el.id = 'round6-calib'
    el.textContent = JSON.stringify(data, null, 2)
    document.body.append(el)
  }, rows)
  await page.screenshot({ path: '/opt/cursor/artifacts/round6-calibration-table.png', fullPage: true })
  const wins = rows.filter((r) => r.stars >= 1)
  expect(wins.length).toBeGreaterThanOrEqual(1)
  const l4 = rows.find((r) => r.level === 4)!
  expect(l4.stars).toBeGreaterThanOrEqual(2)
  expect(l4.usedPct).toBeGreaterThanOrEqual(38)
  expect(l4.usedPct).toBeLessThanOrEqual(68)
  const l1 = rows.find((r) => r.level === 1)!
  if (l1.stars >= 1) {
    expect(l1.usedPct).toBeGreaterThanOrEqual(22)
    expect(l1.usedPct).toBeLessThanOrEqual(78)
  }
  for (const id of [1, 2]) {
    const row = rows.find((r) => r.level === id)!
    if (row.stars >= 1) {
      expect(row.usedPct).toBeGreaterThanOrEqual(18)
      expect(row.usedPct).toBeLessThanOrEqual(72)
    }
  }
})
