import type { AdventureGoal, AdventureLevelDef } from './levels'
import { goalPieceIconDataUrl } from '../draw'
import { PLUSH_ICONS } from '../ui/plushIcons'
import type { Kind } from '../sim'

export type AdventureGoalState = {
  score: number
  movesUsed: number
  movesLimit: number
  clearedByColor: Record<number, number>
  bombsPopped: number
  iceBroken: number
  chocoCleared: number
}

export type GoalEval = {
  met: boolean
  progress: number
  target: number
  label: string
}

export type StarEval = {
  stars: 0 | 1 | 2 | 3
  goalMet: boolean
  score: number
  thresholds: [number, number, number]
}

function goalKind(goal: AdventureGoal): Kind | 'bomb' | 'rainbow' | 'starburst' {
  switch (goal.type) {
    case 'clear_color':
      return 'bonbon'
    case 'pop_bombs':
      return 'bomb'
    case 'break_ice':
      return 'ice'
    case 'clear_choco':
      return 'choco'
    default:
      return 'bonbon'
  }
}

function goalColor(goal: AdventureGoal): number {
  if (goal.type === 'clear_color') return goal.color
  if (goal.type === 'pop_bombs') return 4
  if (goal.type === 'break_ice') return 3
  if (goal.type === 'clear_choco') return 0
  return 0
}

function goalIcon(goal: AdventureGoal): string {
  switch (goal.type) {
    case 'clear_color':
    case 'break_ice':
    case 'clear_choco':
    case 'pop_bombs': {
      const kind = goalKind(goal) as Kind
      const src = goalPieceIconDataUrl(kind, goalColor(goal), 20)
      return `<img class="goal-bonbon-ico" src="${src}" width="20" height="20" alt="" />`
    }
    case 'score_moves':
      return `<span class="goal-ico">${PLUSH_ICONS.rush}</span>`
    default:
      return `<span class="goal-ico">${PLUSH_ICONS.starburst}</span>`
  }
}

export function goalChip(goal: AdventureGoal, state: AdventureGoalState): string {
  const ev = evaluateGoal(state, goal)
  const tick = ev.met ? '<span class="goal-tick">✓</span>' : ''
  const count = `${Math.min(ev.progress, ev.target)}/${ev.target}`
  return `${goalIcon(goal)}<span class="goal-count">${count}</span>${tick}`
}

export function goalLabel(goal: AdventureGoal): string {
  switch (goal.type) {
    case 'clear_color':
      return `Clear ${goal.count} bonbons`
    case 'pop_bombs':
      return `Pop ${goal.count} bombs`
    case 'score_moves':
      return `Score ${goal.score} in ${goal.moves} moves`
    case 'break_ice':
      return `Break ${goal.count} ice`
    case 'clear_choco':
      return `Clear ${goal.count} choco`
    default:
      return 'Goal'
  }
}

export function goalTarget(goal: AdventureGoal): number {
  switch (goal.type) {
    case 'clear_color':
      return goal.count
    case 'pop_bombs':
      return goal.count
    case 'score_moves':
      return goal.score
    case 'break_ice':
      return goal.count
    case 'clear_choco':
      return goal.count
    default:
      return 1
  }
}

export function evaluateGoal(state: AdventureGoalState, goal: AdventureGoal): GoalEval {
  const target = goalTarget(goal)
  let progress = 0
  let met = false

  switch (goal.type) {
    case 'clear_color':
      progress = state.clearedByColor[goal.color] ?? 0
      met = progress >= goal.count
      break
    case 'pop_bombs':
      progress = state.bombsPopped
      met = progress >= goal.count
      break
    case 'score_moves':
      progress = state.score
      met = state.score >= goal.score && state.movesUsed <= goal.moves
      break
    case 'break_ice':
      progress = state.iceBroken
      met = progress >= goal.count
      break
    case 'clear_choco':
      progress = state.chocoCleared
      met = progress >= goal.count
      break
  }

  return { met, progress, target, label: goalLabel(goal) }
}

export function allGoalsMet(state: AdventureGoalState, goals: AdventureGoal[]): boolean {
  return goals.every((g) => evaluateGoal(state, g).met)
}

export function evaluateStars(state: AdventureGoalState, level: AdventureLevelDef): StarEval {
  const goalMet = allGoalsMet(state, level.goals)
  const [, t2, t3] = level.starScore
  let stars: 0 | 1 | 2 | 3 = 0
  if (goalMet) {
    stars = 1
    if (state.score >= t2) stars = 2
    if (state.score >= t3) stars = 3
  }
  return { stars, goalMet, score: state.score, thresholds: level.starScore }
}

export function emptyGoalState(movesLimit: number): AdventureGoalState {
  return {
    score: 0,
    movesUsed: 0,
    movesLimit,
    clearedByColor: {},
    bombsPopped: 0,
    iceBroken: 0,
    chocoCleared: 0,
  }
}
