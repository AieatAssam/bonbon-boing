import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ video: 'on' })

type Qa = {
  markTipsSeen: () => void
  startAdventure: (id: number) => void
  pump: (ms: number) => void
  draw: () => void
  findChain: (m: number) => { x: number; y: number }[] | null
}

async function playChain(page: import('@playwright/test').Page, min: number) {
  const path = await page.evaluate((m) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return q.findChain(m)
  }, min)
  if (!path?.length) return false
  await page.mouse.move(path[0]!.x, path[0]!.y)
  await page.mouse.down()
  for (const pt of path) await page.mouse.move(pt.x, pt.y, { steps: 3 })
  const tip = path[path.length - 1]!
  await page.mouse.move(tip.x + 6, tip.y + 6, { steps: 2 })
  await page.mouse.up()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 700; t += 40) q.pump(40)
    q.draw()
  })
  return true
}

test('adventure blockers 30s webm 390x844', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?qa&screen=title', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.markTipsSeen()
    q.startAdventure(25)
  })
  await page.waitForTimeout(400)
  const end = Date.now() + 30_000
  let i = 0
  while (Date.now() < end) {
    await playChain(page, 4 + (i % 3))
    i += 1
    await page.waitForTimeout(500)
  }
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/round2-adventure-blockers-30s.webm')
})
