import { describe, expect, it } from 'vitest'
import { boardLayout, earBoundsAtRest, earsInsideMatAtRest } from '../src/layout'

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

describe('row-0 ears inside mat', () => {
  for (const [w, h] of viewports) {
    it(`${w}x${h} at rest, mid-squash, mid-fall ear margin`, () => {
      const L = boardLayout(w, h)
      for (const squash of [1, 0.82, 1.08] as const) {
        expect(earsInsideMatAtRest(L, squash)).toBe(true)
        const b = earBoundsAtRest(L, { r: 0, c: 0 }, squash)
        expect(b.earTipY).toBeGreaterThanOrEqual(b.matTopY + 0.5)
        expect(b.earTipY).toBeLessThan(b.spawnLineY + L.D * 0.08)
      }
    })
  }
})
