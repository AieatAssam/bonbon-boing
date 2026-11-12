import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

type Qa = {
  home: () => void
  draw: () => void
  closeMeta: () => void
  prepPromoSave: () => void
  prepAdventureLevel: (id: number) => void
  markTipsSeen: () => void
  pump: (ms: number) => void
  movesLeft: number
  settled: boolean
  findChain: (m: number) => { x: number; y: number }[] | null
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  settleChain: (min: number) => boolean
  boardRect: () => { x: number; y: number; w: number; h: number }
  boardPieces: () => { spawning: boolean; spawnT: number; x: number; y: number }[]
  screen: string
}

async function ready(page: import('@playwright/test').Page, freeze = false) {
  await page.goto(`?qa${freeze ? '&freeze=1' : ''}&screen=title`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '.map-path-node.current { animation: none !important; transform: none !important; }' })
}

async function tapTitleMeta(page: import('@playwright/test').Page, label: string) {
  await page.locator('#title .meta-row button').filter({ hasText: label }).tap()
}

async function dragChain(page: import('@playwright/test').Page, path: { x: number; y: number }[]) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas missing')
  const cx = box.x
  const cy = box.y
  await page.mouse.move(cx + path[0]!.x, cy + path[0]!.y)
  await page.mouse.down()
  for (const pt of path) await page.mouse.move(cx + pt.x, cy + pt.y, { steps: 2 })
  const tip = path[path.length - 1]!
  await page.mouse.move(cx + tip.x + 4, cy + tip.y + 4, { steps: 1 })
  await page.mouse.up()
}

async function closeMeta(page: import('@playwright/test').Page) {
  const back = page.locator('#meta button', { hasText: 'Back' })
  if (await back.count()) await back.tap()
  await expect(page.locator('.meta-scrim')).toHaveCount(0)
}

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${name}`, animations: 'disabled' })
}

test.use({ hasTouch: true })

async function waitSpawnFrame(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.markTipsSeen()
    const chain = q.findChain(5) ?? q.findChain(4) ?? q.findChain(3)
    if (!chain?.length) return false
    q.pointer('down', chain[0]!.x, chain[0]!.y)
    q.traceChain(chain as { id: number; x: number; y: number }[])
    q.pointer('up', chain[chain.length - 1]!.x, chain[chain.length - 1]!.y)
    for (let t = 0; t < 900; t += 12) {
      q.pump(12)
      q.draw()
      const hit = q.boardPieces().some((p) => p.spawning && p.spawnT > 0.06 && p.spawnT < 0.55)
      if (hit) return true
    }
    return false
  })
}

for (const tag of ['390x844', '1280x800'] as const) {
  const [w, h] = tag === '390x844' ? [390, 844] : [1280, 800]
  test(`spawn frame crop ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await page.addStyleTag({ content: '.map-path-node.current { animation: none !important; }' })
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    const ok = await waitSpawnFrame(page)
    expect(ok).toBe(true)
    const rect = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.boardRect())
    const clipH = Math.min(rect.h * 0.42, h - Math.max(0, rect.y))
    const clip = { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.w, height: clipH }
    await page.screenshot({
      path: `/opt/cursor/artifacts/spawn-frame_${tag}.png`,
      animations: 'disabled',
      clip,
    })
    await page.screenshot({
      path: `qa/shots/spawn-frame_${tag}.png`,
      animations: 'disabled',
      clip,
    })
  })
}

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`
  test(`round4 title dock labels ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await ready(page, true)
    for (const label of ['Adventure', 'Shop', 'Stickers', 'Collection']) {
      await expect(page.locator('#title .meta-row button').filter({ hasText: label }).locator('.meta-label')).toBeVisible()
    }
    await snap(page, `round4-title-dock_${tag}.png`)
  })
}

test('goal HUD icon zoom L4', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page, false)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void; startAdventure: (n: number) => void } }).__qa
    q.prepAdventureLevel(4)
    q.home()
  })
  await tapTitleMeta(page, 'Adventure')
  await page.locator('button.map-path-node .map-node-num', { hasText: '4' }).click()
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  const chip = page.locator('#hud .goal-chip').first()
  await expect(chip).toBeVisible()
  await page.waitForFunction(() => {
    const c = document.querySelector('#hud .goal-chip') as HTMLElement | null
    return c && c.getBoundingClientRect().width > 0
  })
  const icon = chip.locator('img.goal-bonbon-ico, .goal-ico').first()
  const chipBox = await chip.boundingBox()
  expect(chipBox?.width ?? 0).toBeGreaterThanOrEqual(16)
  const box = (await icon.boundingBox()) ?? chipBox
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(14)
  await page.screenshot({
    path: '/opt/cursor/artifacts/round4-goal-hud_390x844.png',
    clip: box ?? undefined,
  })
  await page.screenshot({ path: 'qa/shots/round4-goal-hud_390x844.png', clip: box ?? undefined })
})

test('results landscape 844x390', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await ready(page, false)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void } }).__qa
    q.prepAdventureLevel(1)
  })
  await tapTitleMeta(page, 'Adventure')
  await page.locator('button.map-path-node .map-node-num', { hasText: '1' }).click()
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { finishAdventureWin: () => void } }).__qa
    q.finishAdventureWin()
    q.draw()
  })
  await expect(page.locator('#results')).toBeVisible()
  await expect(page.locator('#results .row button').first()).toBeVisible()
  await snap(page, 'round4-results_844x390.png')
})

test('README image pack title-touch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page, true)
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.prepPromoSave())
  await snap(page, 'meta-title_390x844.png')

  await tapTitleMeta(page, 'Adventure')
  await snap(page, 'meta-map_390x844.png')
  await closeMeta(page)

  await tapTitleMeta(page, 'Shop')
  await snap(page, 'meta-shop_390x844.png')
  await closeMeta(page)

  await tapTitleMeta(page, 'Stickers')
  await snap(page, 'meta-achievements_390x844.png')
  await closeMeta(page)

  await tapTitleMeta(page, 'Collection')
  await snap(page, 'meta-collection_390x844.png')
  await closeMeta(page)

  await page.locator('#title button', { hasText: 'Score Rush' }).tap()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 400; t += 40) q.pump(40)
    q.draw()
  })
  await snap(page, 'chain_390x844.png')
})

const greedyLevels = [1, 4, 8, 16] as const

test('in-browser adventure greedy smoke L1', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page, false)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void } }).__qa
    q.prepAdventureLevel(1)
  })
  await tapTitleMeta(page, 'Adventure')
  await page.locator('button.map-path-node .map-node-num', { hasText: '1' }).click()
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    const path = q.findChain(3) ?? q.findChain(2)
    if (!path?.length) return
    q.pointer('down', path[0]!.x, path[0]!.y)
    q.traceChain(path as { id: number; x: number; y: number }[])
    q.pointer('up', path[path.length - 1]!.x, path[path.length - 1]!.y)
    for (let t = 0; t < 500; t += 40) q.pump(40)
  })
  const moves = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.movesLeft)
  expect(moves).toBeLessThan(28)
})
