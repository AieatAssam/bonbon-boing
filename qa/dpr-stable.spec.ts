import { expect, test } from '@playwright/test'

type Qa = {
  boardRect: () => { x: number; y: number; w: number; h: number }
  findChain: (min: number) => { id: number; x: number; y: number }[] | null
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  backingDpr: () => number
}

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true })

test('board rect and backing dpr stay stable for 120 frames under load', async ({ page, context }) => {
  test.setTimeout(120_000)
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('?screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.waitForTimeout(2600)

  const samples = await page.evaluate(async () => {
    const q = (window as unknown as { __qa: Qa }).__qa
    const canvas = document.querySelector('canvas')!
    const out: { br: ReturnType<Qa['boardRect']>; ratio: number; cw: number }[] = []
    for (let i = 0; i < 120; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      if (i % 18 === 6) {
        const path = q.findChain(3) ?? q.findChain(2)
        if (path?.length) q.traceChain(path)
      }
      out.push({
        br: q.boardRect(),
        ratio: q.backingDpr(),
        cw: canvas.width,
      })
    }
    return out
  })

  const ref = samples[Math.min(5, samples.length - 1)]!
  const eps = 0.75
  for (const s of samples) {
    expect(Math.abs(s.br.x - ref.br.x)).toBeLessThanOrEqual(eps)
    expect(Math.abs(s.br.y - ref.br.y)).toBeLessThanOrEqual(eps)
    expect(Math.abs(s.br.w - ref.br.w)).toBeLessThanOrEqual(eps)
    expect(Math.abs(s.br.h - ref.br.h)).toBeLessThanOrEqual(eps)
  }
})
