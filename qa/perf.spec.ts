import { expect, test } from '@playwright/test'

type Qa = {
  fps: number
  resetFps: () => void
  findChain: (min: number) => { x: number; y: number }[] | null
}

async function chainWithTouch(page: import('@playwright/test').Page, ms: number) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const path = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      return q.findChain(4) ?? q.findChain(3) ?? q.findChain(2)
    })
    if (path?.length) {
      await page.mouse.move(path[0]!.x, path[0]!.y)
      await page.mouse.down()
      for (const pt of path) await page.mouse.move(pt.x, pt.y, { steps: 3 })
      const tip = path[path.length - 1]!
      await page.mouse.move(tip.x + 6, tip.y + 6, { steps: 2 })
      await page.mouse.up()
    }
    await page.waitForTimeout(72)
  }
}

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true })

test('meets fps target at 4x cpu throttle', async ({ page, context }) => {
  test.setTimeout(120_000)
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('?screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.resetFps()
  })
  await page.waitForTimeout(2500)
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.resetFps())
  await chainWithTouch(page, 7500)
  await page.waitForTimeout(1800)
  const fps = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.fps)
  expect(fps, `fps=${fps}`).toBeGreaterThanOrEqual(40)
})
