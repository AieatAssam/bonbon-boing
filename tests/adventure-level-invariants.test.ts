import { describe, expect, it } from 'vitest'
import { ADVENTURE_LEVELS } from '../src/adventure/levels'
import { countBlockersAtStart, countBonbonsOfColor, createAdventureGame } from '../src/sim'

describe('adventure level invariants (60 levels)', () => {
  it('blocker goals match placed blockers; colour goals are plausible', () => {
    const violations: string[] = []
    for (const level of ADVENTURE_LEVELS) {
      const state = createAdventureGame(level, 7, 9)
      const placed = countBlockersAtStart(state)

      for (const g of level.goals) {
        if (g.type === 'break_ice') {
          const want = level.blockers.ice ?? 0
          if (g.count !== want || g.count !== placed.ice) {
            violations.push(
              `L${level.id} break_ice goal=${g.count} blockers.ice=${want} board.ice=${placed.ice}`,
            )
          }
        }
        if (g.type === 'clear_choco') {
          const want = level.blockers.choco ?? 0
          if (g.count !== want || g.count !== placed.choco) {
            violations.push(
              `L${level.id} clear_choco goal=${g.count} blockers.choco=${want} board.choco=${placed.choco}`,
            )
          }
        }
        if (g.type === 'clear_color') {
          if (g.color >= level.colorCount) {
            violations.push(`L${level.id} clear_color uses color ${g.color} but colorCount=${level.colorCount}`)
          }
          const onBoard = countBonbonsOfColor(state, g.color)
          const maxPerMove = 9
          const plausibleCap = level.moves * maxPerMove + onBoard + 20
          if (g.count > plausibleCap) {
            violations.push(`L${level.id} clear_color ${g.count} > plausible cap ${plausibleCap}`)
          }
        }
      }
    }
    if (violations.length) console.log('LEVEL_INVARIANT_VIOLATIONS', JSON.stringify(violations))
    expect(violations).toEqual([])
    console.log('LEVEL_INVARIANTS_OK', { levels: ADVENTURE_LEVELS.length })
  })
})
