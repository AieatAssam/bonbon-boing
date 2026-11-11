import type { AdventureGoal, AdventureLevelDef } from './levels'
import { COLOR_NAMES } from '../ui/plushIcons'

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

export function goalChip(goal: AdventureGoal, state: AdventureGoalState): string {
  const ev = evaluateGoal(state, goal)
  switch (goal.type) {
    case 'clear_color':
      return `${COLOR_NAMES[goal.color % COLOR_NAMES.length] ?? 'Pop'} ${Math.min(ev.progress, ev.target)}/${ev.target}`
    case 'pop_bombs':
      return `Bomb ${Math.min(ev.progress, ev.target)}/${ev.target}`
    case 'score_moves':
      return `Score ${Math.min(ev.progress, ev.target)}/${ev.target}`
    case 'break_ice':
      return `Ice ${Math.min(ev.progress, ev.target)}/${ev.target}`
    case 'clear_choco':
      return `Choco ${Math.min(ev.progress, ev.target)}/${ev.target}`
    default:
      return ev.label
  }
}

export function goalLabel(goal: AdventureGoal): string {
  switch (goal.type) {
    case 'clear_color':
      return `Clear ${goal.count} ${COLOR_NAMES[goal.color % COLOR_NAMES.length] ?? 'pop'}`
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
