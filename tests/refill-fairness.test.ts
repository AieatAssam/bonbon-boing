import { describe, expect, it } from 'vitest'
import { probeRefillBias } from '../src/sim'

describe('refill colour fairness', () => {
  it('neighbour match rate stays near random over 200 spawns', () => {
    const { matchRate, baseline } = probeRefillBias(220, 'refill-fair')
    const tol = 0.12
    expect(matchRate).toBeLessThanOrEqual(baseline + tol)
  })
})
