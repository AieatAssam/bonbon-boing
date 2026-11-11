import { expect, test } from '@playwright/test'

type Qa = {
  findChain: (min: number) => { id: number; x: number; y: number }[] | null
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  bubbleClear: () => boolean
}

const viewports = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
]

for (const vp of viewports) {
  test(`chain bubble avoids piece centres @ ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.goto('?screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    const clear = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      for (const min of [4, 3, 2]) {
        const path = q.findChain(min)
        if (!path?.length) continue
        q.traceChain(path)
        if (q.bubbleClear()) return true
      }
      return false
    })
    expect(clear).toBe(true)
  })
}
