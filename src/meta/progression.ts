import type { SaveV3 } from './save'
import type { Mode } from '../sim'

export function xpForLevel(level: number): number {
  if (level < 1) return 0
  const base = 40
  const growth = 18
  return Math.floor(base + growth * (level - 1) + 6 * (level - 1) ** 1.15)
}

export function xpToNextLevel(save: SaveV3): number {
  return xpForLevel(save.profile.level + 1)
}

export type RunSummary = {
  mode: Mode | 'adventure'
  score: number
  chainLen: number
  combo: number
  bombs: number
  rainbows: number
  pops: number
  won?: boolean
  starsEarned?: number
}

export function xpFromRun(summary: RunSummary): number {
  let xp = 8 + Math.floor(summary.score / 2500)
  xp += summary.chainLen * 2
  xp += summary.combo * 3
  xp += summary.bombs * 4
  xp += summary.rainbows * 6
  if (summary.mode === 'daily') xp += 10
  if (summary.mode === 'adventure' && summary.won) xp += 15 + (summary.starsEarned ?? 0) * 5
  return Math.min(120, xp)
}

export function coinsFromRun(summary: RunSummary): number {
  let coins = 2 + Math.floor(summary.score / 5000)
  coins += Math.min(8, summary.chainLen)
  coins += summary.bombs
  coins += summary.rainbows * 2
  if (summary.mode === 'cuddle') coins += 1
  if (summary.won) coins += 3 + (summary.starsEarned ?? 0)
  return Math.min(40, coins)
}

export type LevelUpResult = {
  leveled: boolean
  from: number
  to: number
  xpGained: number
  coinsGained: number
}

export function addXp(save: SaveV3, summary: RunSummary): LevelUpResult {
  const from = save.profile.level
  const xpGained = xpFromRun(summary)
  const coinsGained = coinsFromRun(summary)
  save.profile.xp += xpGained
  save.profile.coins += coinsGained
  save.profile.coinsEarned += coinsGained

  let leveled = false
  while (save.profile.xp >= xpToNextLevel(save)) {
    save.profile.xp -= xpToNextLevel(save)
    save.profile.level += 1
    leveled = true
  }

  return { leveled, from, to: save.profile.level, xpGained, coinsGained }
}

export function addSugarStars(save: SaveV3, amount: number): void {
  if (amount <= 0) return
  save.profile.stars += amount
}
