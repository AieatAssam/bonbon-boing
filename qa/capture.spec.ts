import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

type Qa = {
  findChain: (min: number) => { id: number; x: number; y: number }[] | null
  D: number
  draw: () => void
}

async function readyPlay(page: import('@playwright/test').Page, seed = 'feel') {
  await page.goto(`?qa&freeze=1&screen=play&seed=${seed}`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

async function snap(page: import('@playwright/test').Page, file: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${file}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${file}`, animations: 'disabled' })
}

async function dragChainHold(page: import('@playwright/test').Page, min = 6) {
  const chain = await page.evaluate((m) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return q.findChain(m) ?? q.findChain(5)
  }, min)
  expect(chain, 'chain path for capture').not.toBeNull()
  expect(chain!.length).toBeGreaterThanOrEqual(5)
  const tip = chain![chain!.length - 1]!
  await page.mouse.move(chain![0]!.x, chain![0]!.y)
  await page.mouse.down()
  for (const pt of chain!) {
    await page.mouse.move(pt.x, pt.y, { steps: 5 })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  }
  await page.mouse.move(tip.x + 10, tip.y + 10, { steps: 2 })
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  return chain!
}

async function ribbonZoom(page: import('@playwright/test').Page, chain: { x: number; y: number }[], file: string) {
  const D = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.D)
  const mx = (chain[0]!.x + chain[1]!.x) / 2
  const my = (chain[0]!.y + chain[1]!.y) / 2
  const side = Math.max(40, D * 1.2)
  const clip = { x: mx - side / 2, y: my - side / 2, width: side, height: side }
  await page.screenshot({
    path: `/opt/cursor/artifacts/${file}`,
    animations: 'disabled',
    clip,
  })
  await page.screenshot({ path: `qa/shots/${file}`, animations: 'disabled', clip })
}

async function gotoShot(page: import('@playwright/test').Page, screen: string, freeze = true) {
  const freezeQ = freeze ? '&freeze=1' : ''
  await page.goto(`?qa${freezeQ}&screen=${screen}&seed=feel`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
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

    await readyPlay(page)
    const chain = await dragChainHold(page)
    await snap(page, tag('chain'))
    if (w === 390 && h === 844) await ribbonZoom(page, chain, 'ribbon-zoom-390x844.png')

    if (w === 390 && h === 844) {
      const shots: [string, string][] = [
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
      for (const screen of ['pop', 'pause', 'results'] as const) {
        await gotoShot(page, screen, screen !== 'results')
        await snap(page, tag(screen))
      }
      await gotoShot(page, 'bomb-piece')
      await snap(page, `bomb-board-${w}x${h}.png`)
      await gotoShot(page, 'bomb-blast')
      await snap(page, `bomb-blast-${w}x${h}.png`)
      return
    }

    for (const screen of ['pop', 'pause'] as const) {
      await gotoShot(page, screen)
      await snap(page, tag(screen))
    }
  })
}
