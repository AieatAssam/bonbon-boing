import { describe, expect, it } from 'vitest'
import { boardFillMetrics } from '../src/layout'

describe('board layout', () => {
  it('fills tall portrait height under HUD', () => {
    const m390 = boardFillMetrics(390, 844)
    expect(m390.cols).toBeLessThanOrEqual(7)
    expect(m390.D).toBeGreaterThanOrEqual(52)
    expect(m390.D).toBeLessThanOrEqual(60)
    expect(m390.fillHeight).toBeGreaterThanOrEqual(0.89)

    const m430 = boardFillMetrics(430, 932)
    expect(m430.fillHeight).toBeGreaterThanOrEqual(0.88)
    expect(m430.rows).toBeGreaterThanOrEqual(10)
  })
})
