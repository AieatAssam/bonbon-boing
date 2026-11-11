import { describe, expect, it } from 'vitest'
import { allGoalsMet, emptyGoalState, evaluateStars } from '../src/adventure/goals'
import { levelById } from '../src/adventure/levels'
import { createAdventureGame, findPath, mayBeginChain, playToIdle, release } from '../src/sim'

function syncGoals(
  goals: ReturnType<typeof emptyGoalState>,
  state: ReturnType<typeof createAdventureGame>,
) {
  goals.score = state.score
  goals.movesUsed = state.track.movesUsed
  goals.bombsPopped = state.track.bombsPopped
  goals.iceBroken = state.track.iceBroken
  goals.chocoCleared = state.track.chocoCleared
  for (let i = 0; i < 6; i++) goals.clearedByColor[i] = state.track.clearedByColor[i] ?? 0
}

function greedyAdventureLevel(id: number, cols = 7, rows = 9) {
  const level = levelById(id)!
  const state = createAdventureGame(level, cols, rows)
  const goals = emptyGoalState(level.moves)
  let guard = 0
  while (mayBeginChain(state) && guard++ < 220) {
    const goalColor = level.goals.find((g) => g.type === 'clear_color')?.color
    let path: ReturnType<typeof findPath> = null
    for (let min = 8; min >= 2; min--) {
      const cand = findPath(state, min)
      if (!cand) continue
      if (goalColor == null || cand[0]!.color === goalColor) {
        path = cand
        break
      }
    }
    path ??= findPath(state, 2)
    if (!path || path.length < 2) {
      if (state.movesLeft > 0) continue
      break
    }
    state.drag = path.map((p) => p.id)
    release(state)
    playToIdle(state)
    syncGoals(goals, state)
    if (allGoalsMet(goals, level.goals)) {
      if (state.movesLeft > 0) {
        const bonus = state.movesLeft * 500
        state.score += bonus
        goals.score = state.score
        state.movesLeft = 0
      }
      break
    }
    if (state.movesLeft <= 0) break
  }
  const movesLeftAtGoal = Math.max(0, state.movesLeft)
  const ev = evaluateStars(goals, level, movesLeftAtGoal)
  return { level: id, stars: ev.stars, won: ev.goalMet, score: state.score, movesLeft: movesLeftAtGoal }
}

const benchLevels = [1, 4, 8, 16] as const

describe('adventure greedy stars', () => {
  it('prints star table for benchmark', () => {
    const table = benchLevels.map((id) => greedyAdventureLevel(id))
    console.log('GREEDY_ADVENTURE_STARS', JSON.stringify(table))
    expect(table).toHaveLength(4)
  })

})
