import { expect, test } from '@playwright/test'

type Qa = {
  findChain: (min: number, avoid?: number[], prefer?: 'top' | 'bottom') => { x: number; y: number }[] | null
  bubbleCheck: () => { dist: number; distOk: boolean; tipClear: boolean; layoutD: number }
}

const viewports = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
]

for (const vp of viewports) {
  test(`chain bubble stays near finger and clears tip neighbours @ ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.goto('?screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    let metrics = { dist: Infinity, distOk: false, tipClear: false, layoutD: 1 }
    const preferBottom = vp.height > vp.width && vp.width >= 500
    for (const min of [4, 3, 2]) {
      const path = await page.evaluate(
        ({ m, bottom }) => {
          const q = (window as unknown as { __qa: Qa }).__qa
          return bottom ? q.findChain(m, [], 'bottom') ?? q.findChain(m) : q.findChain(m)
        },
        { m: min, bottom: preferBottom },
      )
      if (!path?.length) continue
      await page.mouse.move(path[0]!.x, path[0]!.y)
      await page.mouse.down()
      for (const pt of path) await page.mouse.move(pt.x, pt.y, { steps: 2 })
      const tip = path[path.length - 1]!
      await page.mouse.move(tip.x + 6, tip.y + 8, { steps: 2 })
      await page.waitForTimeout(48)
      metrics = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.bubbleCheck())
      if (metrics.distOk && metrics.tipClear) break
    }
    expect(metrics.tipClear).toBe(true)
    const cap = vp.width <= 430 ? 1.6 : 2.4
    expect(metrics.dist, `finger dist ${metrics.dist} (D=${metrics.layoutD})`).toBeLessThanOrEqual(
      metrics.layoutD * cap,
    )
  })
}
