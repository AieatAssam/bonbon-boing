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
  findChain: (min: number) => { x: number; y: number }[] | null
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  pump: (ms: number) => void
  draw: () => void
  capturePopBurst: () => void
  boardRect: () => { x: number; y: number; w: number; h: number }
  D: number
}

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`
  test(`no clip fall/pop ${tag}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: w, height: h })
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)

    const chain = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa & { findChain: (m: number) => unknown } }).__qa
      return q.findChain(6) ?? q.findChain(5) ?? q.findChain(4) ?? q.findChain(3)
    })
    expect(chain).not.toBeNull()
    await page.evaluate((path) => {
      const q = (window as unknown as { __qa: Qa & { findChain: (m: number) => { id: number; x: number; y: number }[] | null } }).__qa
      const full = q.findChain(6) ?? path
      q.traceChain(full!)
    }, chain)
    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      for (let t = 0; t < 8; t++) {
        q.pump(22)
        q.draw()
      }
    })
    await page.screenshot({ path: `/opt/cursor/artifacts/clip-pop-mid_${tag}.png`, animations: 'disabled' })
    await page.screenshot({ path: `qa/shots/clip-pop-mid_${tag}.png`, animations: 'disabled' })

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.capturePopBurst()
    })
    await page.screenshot({ path: `/opt/cursor/artifacts/clip-blast_${tag}.png`, animations: 'disabled' })
    await page.screenshot({ path: `qa/shots/clip-blast_${tag}.png`, animations: 'disabled' })

    const geom = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      const rect = q.boardRect()
      return {
        offRight: rect.x + rect.w > innerWidth + 2,
        offBottom: rect.y + rect.h > innerHeight + 2,
        offLeft: rect.x < -2,
      }
    })
    expect(geom.offRight || geom.offBottom || geom.offLeft, `board in viewport ${tag}`).toBe(false)
  })
}
