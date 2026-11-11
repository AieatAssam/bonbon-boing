import { expect, test } from '@playwright/test'

type Qa = {
  findEdgeChain: (edge: 'top' | 'bottom' | 'left' | 'right' | 'corner-tl' | 'corner-br') =>
    | { id: number; x: number; y: number }[]
    | null
  findChain: (min: number) => { id: number; x: number; y: number }[] | null
  beginChain: (id: number) => void
  appendPiece: (id: number) => void
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  bubbleCheck: () => {
    dist: number
    distOk: boolean
    tipClear: boolean
    neighbourCover: boolean
    layoutD: number
  }
}

const viewports = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 844, height: 390 },
]

const edges = ['top', 'bottom', 'left', 'right', 'corner-tl', 'corner-br'] as const

for (const vp of viewports) {
  test(`pill placement at edge tips @ ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    let holds = 0
    let neighbourCovers = 0
    for (const edge of edges) {
      const m = await page.evaluate((e) => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const path = q.findEdgeChain(e) ?? q.findChain(3)
        if (!path?.length) return null
        q.beginChain(path[0]!.id)
        for (const cell of path.slice(1)) q.appendPiece(cell.id)
        const tip = path[path.length - 1]!
        q.pointer('move', tip.x + 4, tip.y + 5)
        return q.bubbleCheck()
      }, edge)
      if (!m) continue
      holds += 1
      expect(m.tipClear, `tip overlap ${edge}`).toBe(true)
      expect(m.distOk, `dist ${m.dist} D=${m.layoutD} ${edge}`).toBe(true)
      if (m.neighbourCover) neighbourCovers += 1
    }
    expect(holds, 'need edge holds').toBeGreaterThan(2)
    if (holds > 0) expect(neighbourCovers / holds).toBeLessThan(0.05)
  })
}
