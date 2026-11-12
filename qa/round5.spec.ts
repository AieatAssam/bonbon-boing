import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

type Qa = {
  screen: string
  movesLeft: number
  mode: string
  timeLeft: number
  pump: (ms: number) => void
  draw: () => void
  findChain: (m: number) => { id: number; x: number; y: number }[] | null
  findGoalChain: (m?: number) => { id: number; x: number; y: number }[] | null
  startAdventure: (n: number) => void
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  prepAdventureLevel: (n: number) => void
  home: () => void
  closeMeta: () => void
  inputLocked: boolean
  settled: boolean
}

test.use({ hasTouch: true })

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

async function dragOnce(page: import('@playwright/test').Page) {
  const path = await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    if (q.mode === 'adventure') {
      return q.findGoalChain(3) ?? q.findGoalChain(2) ?? q.findChain(2)
    }
    return q.findChain(4) ?? q.findChain(3) ?? q.findChain(2)
  })
  if (!path?.length) return false
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) return false
  const tip = path[path.length - 1]!
  await page.mouse.move(box.x + path[0]!.x, box.y + path[0]!.y)
  await page.mouse.down()
  for (const pt of path) await page.mouse.move(box.x + pt.x, box.y + pt.y, { steps: 2 })
  await page.mouse.move(box.x + tip.x + 2, box.y + tip.y + 2)
  await page.mouse.up()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 700; t += 35) q.pump(35)
    q.draw()
  })
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled, undefined, { timeout: 8000 }).catch(() => {})
  return true
}

async function playUntilResults(page: import('@playwright/test').Page, max = 200) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results')) return true
    const locked = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.inputLocked)
    if (locked) {
      await page.locator('canvas').first().tap({ position: { x: 120, y: 200 } })
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        for (let t = 0; t < 500; t += 25) q.pump(25)
      })
      continue
    }
    if (!(await dragOnce(page))) {
      await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.pump(40))
    }
  }
  return page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results')
}

test('next level and rush after win — real drags', async ({ page }) => {
  test.setTimeout(600_000)
  await ready(page, 390, 844)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.prepAdventureLevel(1)
    q.startAdventure(1)
  })
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())

  const won = await playUntilResults(page)
  expect(won).toBe(true)
  await expect(page.locator('#results')).toBeVisible()

  await page.locator('#results [data-action="adventure-next"]').tap()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play', { timeout: 15_000 })
  const m2 = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.movesLeft)
  expect(m2).toBeGreaterThan(12)
  const before = m2
  await dragOnce(page)
  const after = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.movesLeft)
  expect(after).toBeLessThan(before)

  await page.locator('#pause button', { hasText: 'Home' }).tap().catch(() => {})
  await page.locator('[data-action="home"]').first().tap()
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'title')
  await expect(page.locator('.meta-scrim')).toHaveCount(0)
  await page.locator('#title button', { hasText: 'Score Rush' }).tap()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await dragOnce(page)
  const rushStart = await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return { screen: q.screen, mode: q.mode, timeLeft: q.timeLeft }
  })
  expect(rushStart.screen).toBe('play')
  expect(rushStart.mode).toBe('timed')
  expect(rushStart.timeLeft).toBeGreaterThan(55000)
  await page.waitForTimeout(3200)
  await dragOnce(page)
  const rushAfter = await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return { screen: q.screen, timeLeft: q.timeLeft }
  })
  expect(rushAfter.screen).toBe('play')
  expect(rushStart.timeLeft - rushAfter.timeLeft).toBeGreaterThan(2000)
})

const starLevels = [1, 4, 8, 16] as const

for (const style of ['goal', 'chain'] as const) {
  test(`real-drag stars ${style}`, async ({ page }) => {
    test.setTimeout(600_000)
    const rows: { level: number; stars: number; movesLeft: number; style: string }[] = []
    for (const id of starLevels) {
      await ready(page, 390, 844)
      await page.evaluate((lvl) => {
        const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void } }).__qa
        q.prepAdventureLevel(lvl)
        q.home()
      }, id)
      await tapMeta(page, 'Adventure')
      await page.locator('button.map-path-node .map-node-num', { hasText: String(id) }).click()
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
      await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
      const minChain = style === 'chain' ? 6 : 3
      for (let i = 0; i < 120; i++) {
        if (await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen === 'results')) break
        const locked = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.inputLocked)
        if (locked) {
          await page.locator('canvas').first().tap()
          await page.evaluate(() => {
            const q = (window as unknown as { __qa: Qa }).__qa
            for (let t = 0; t < 400; t += 25) q.pump(25)
          })
          continue
        }
        const path = await page.evaluate((m) => {
          const q = (window as unknown as { __qa: Qa }).__qa
          if (q.mode === 'adventure') {
            return q.findGoalChain(m) ?? q.findGoalChain(2) ?? q.findChain(2)
          }
          for (let n = 8; n >= m; n--) {
            const p = q.findChain(n)
            if (p?.length) return p
          }
          return q.findChain(2)
        }, minChain)
        if (path?.length) {
          const box = await page.locator('canvas').first().boundingBox()
          if (box) {
            const tip = path[path.length - 1]!
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
      const movesLeft = await page.evaluate(() => {
        const el = document.querySelector('.moves-num')
        return el ? Number(el.textContent) : -1
      })
      rows.push({ level: id, stars, movesLeft, style })
      if (await page.locator('#results [data-action="adventure-map"]').count()) {
        await page.locator('#results [data-action="adventure-map"]').click()
        await page.evaluate(() => document.querySelector('#meta button')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
      }
    }
    console.log(`ROUND5_STAR_TABLE_${style}`, JSON.stringify(rows))
  })
}

test('goal chip zoom and results layouts', async ({ page }) => {
  for (const [w, h, name] of [
    [390, 844, '390x844'],
    [844, 390, '844x390'],
    [932, 430, '932x430'],
  ] as const) {
    await ready(page, w, h)
    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void } }).__qa
      q.prepAdventureLevel(4)
    })
    await tapMeta(page, 'Adventure')
    await page.locator('button.map-path-node .map-node-num', { hasText: '4' }).click()
    await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
    await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
    const chip = page.locator('.goal-chip').first()
    await expect(chip).toBeVisible()
    const icon = chip.locator('img.goal-bonbon-ico, .goal-ico svg').first()
    await icon.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {})
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    const box = (await icon.boundingBox({ timeout: 5000 })) ?? (await chip.boundingBox())
    expect((box?.width ?? 0) >= 20 || (await chip.boundingBox())!.width >= 24).toBe(true)
    await page.screenshot({
      path: `/opt/cursor/artifacts/round5-goal_${name}.png`,
      clip: box ?? undefined,
    })
    if (h < w) await playUntilResults(page, 60)
    if (h < w) {
      await page.screenshot({ path: `/opt/cursor/artifacts/round5-results_${name}.png` })
    }
  }
})

test('title dock 932x430 and map frontier scroll', async ({ page }) => {
  await ready(page, 932, 430)
  await page.screenshot({ path: '/opt/cursor/artifacts/round5-dock_932x430.png' })
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void } }).__qa
    q.prepAdventureLevel(18)
    q.home()
    q.closeMeta()
  })
  await tapMeta(page, 'Adventure')
  const scroll = page.locator('.meta-map-scroll')
  await expect(scroll).toBeVisible()
  const inView = await page.evaluate(() => {
    const cur = document.querySelector('.map-path-node.current')
    if (!cur) return false
    const r = cur.getBoundingClientRect()
    const s = document.querySelector('.meta-map-scroll')!.getBoundingClientRect()
    return r.top >= s.top && r.bottom <= s.bottom
  })
  expect(inView).toBe(true)
  await page.screenshot({ path: '/opt/cursor/artifacts/round5-map-frontier_932x430.png' })
})
