import { expect, test } from '@playwright/test'

type Qa = {
  findChain: (min: number) => { id: number; x: number; y: number }[] | null
  traceChain: (cells: { x: number; y: number }[]) => void
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  score: number
  timeLeft: number
  screen: string
  settled: boolean
  pump: (ms: number) => void
}

const seeds = ['feel', 'pretty', 'spawn-a'] as const

test('greedy full-round scores from browser build', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const table: { seed: string; score: number }[] = []
  for (const seed of seeds) {
    await page.goto(`?qa&screen=play&seed=${seed}`, { timeout: 60_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    for (let i = 0; i < 140; i++) {
      const left = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.timeLeft)
      if (left <= 0) break
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        if (q.screen !== 'play') return
        let best: { x: number; y: number }[] | null = null
        for (let m = 12; m >= 2; m--) {
          const p = q.findChain(m)
          if (p && p.length >= 2) {
            best = p
            break
          }
        }
        if (!best) return
        const tip = best[best.length - 1]!
        q.pointer('down', best[0]!.x, best[0]!.y)
        q.traceChain(best)
        q.pointer('up', tip.x, tip.y)
      })
      await page
        .waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled, undefined, { timeout: 3000 })
        .catch(() => {})
      await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.pump(450))
    }
    const score = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.score)
    table.push({ seed, score })
  }
  console.log('GREEDY_SCORE_TABLE', JSON.stringify(table))
  expect(table).toHaveLength(3)
  const total = table.reduce((s, r) => s + r.score, 0)
  expect(total).toBeGreaterThan(2_500)
  for (const row of table) {
    expect(row.score).toBeLessThan(48_000)
  }
})
