import type { SaveV3 } from './save'
import type { Mode } from '../sim'

export type AchievementDef = {
  id: string
  title: string
  toast: string
  emoji: string
  hidden?: boolean
}

export type AchievementFacts = {
  score?: number
  chainLen?: number
  bomb?: boolean
  bombs?: number
  rainbow?: boolean
  rainbows?: number
  combo?: number
  stars?: number
  mode?: Mode | 'adventure'
  won?: boolean
  adventureLevel?: number
  pops?: number
  runs?: number
  dailyPlayed?: boolean
  firstRun?: boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_pop', title: 'First Pop', toast: 'You popped your first bonbon!', emoji: '🎈' },
  { id: 'first_chain_3', title: 'Tiny Hug', toast: 'Chain of 3 — so cuddly!', emoji: '🤗' },
  { id: 'chain_5', title: 'High Five', toast: 'Five-link chain!', emoji: '🖐️' },
  { id: 'chain_7', title: 'Lucky Seven', toast: 'Seven in a row!', emoji: '7️⃣' },
  { id: 'chain_10', title: 'Mega Hug', toast: 'Ten-link hug chain!', emoji: '💞' },
  { id: 'chain_12', title: 'Squish Master', toast: 'Twelve links!', emoji: '🏆' },
  { id: 'first_bomb', title: 'Kaboom', toast: 'You popped a bomb!', emoji: '💣' },
  { id: 'bomb_5', title: 'Bomb Buddy', toast: 'Five bombs in one run.', emoji: '💥' },
  { id: 'first_rainbow', title: 'Rainbow Rush', toast: 'Rainbow blast!', emoji: '🌈' },
  { id: 'rainbow_3', title: 'Prism Party', toast: 'Three rainbows!', emoji: '✨' },
  { id: 'combo_3', title: 'Combo Treat', toast: 'Combo ×3!', emoji: '🍬' },
  { id: 'combo_5', title: 'Combo Feast', toast: 'Combo ×5!', emoji: '🎂' },
  { id: 'score_10k', title: 'Sweet Ten', toast: '10,000 points!', emoji: '🔟' },
  { id: 'score_20k', title: 'Sugar High', toast: '20,000 points!', emoji: '📈' },
  { id: 'score_35k', title: 'Star Baker', toast: '35,000 points!', emoji: '⭐' },
  { id: 'score_50k', title: 'Bonbon Legend', toast: '50,000 points!', emoji: '👑' },
  { id: 'timed_win', title: 'Tick Tock', toast: 'Finished a timed round.', emoji: '⏱️' },
  { id: 'cuddle_calm', title: 'Cuddle Mode', toast: 'Relaxed cuddle run.', emoji: '☁️' },
  { id: 'daily_treat', title: 'Daily Treat', toast: 'Played today’s daily!', emoji: '📅' },
  { id: 'daily_streak_3', title: 'Three Days', toast: '3-day daily streak!', emoji: '🔥' },
  { id: 'daily_streak_7', title: 'Week of Treats', toast: '7-day streak!', emoji: '🎁' },
  { id: 'runs_10', title: 'Keeps Playing', toast: '10 runs total.', emoji: '🎮' },
  { id: 'runs_50', title: 'Super Fan', toast: '50 runs!', emoji: '💝' },
  { id: 'pops_100', title: 'Pop Pop', toast: '100 lifetime pops.', emoji: '🎊' },
  { id: 'pops_500', title: 'Pop Storm', toast: '500 pops!', emoji: '🌪️' },
  { id: 'adventure_1', title: 'Trail Start', toast: 'Beat adventure level 1!', emoji: '🗺️' },
  { id: 'adventure_15', title: 'Chapter Hero', toast: 'Cleared chapter 1!', emoji: '🏅' },
  { id: 'adventure_30', title: 'Halfway There', toast: 'Level 30 beaten!', emoji: '🧭' },
  { id: 'adventure_60', title: 'Trail Master', toast: 'All 60 levels!', emoji: '🎖️' },
  { id: 'stars_3_run', title: 'Triple Star', toast: 'Three stars on results!', emoji: '🌟' },
  { id: 'no_bomb', title: 'Gentle Touch', toast: 'Big score without bombs.', emoji: '🕊️', hidden: true },
  { id: 'shop_first', title: 'Window Shopper', toast: 'Bought something cute!', emoji: '🛍️' },
  { id: 'mission_day', title: 'Mission Complete', toast: 'Finished daily missions!', emoji: '✅' },
]

const checks: { id: string; test: (save: SaveV3, f: AchievementFacts) => boolean }[] = [
  { id: 'first_pop', test: (_s, f) => (f.pops ?? 0) >= 1 || (f.score ?? 0) > 0 },
  { id: 'first_chain_3', test: (_s, f) => (f.chainLen ?? 0) >= 3 },
  { id: 'chain_5', test: (_s, f) => (f.chainLen ?? 0) >= 5 },
  { id: 'chain_7', test: (_s, f) => (f.chainLen ?? 0) >= 7 },
  { id: 'chain_10', test: (_s, f) => (f.chainLen ?? 0) >= 10 },
  { id: 'chain_12', test: (_s, f) => (f.chainLen ?? 0) >= 12 },
  { id: 'first_bomb', test: (_s, f) => f.bomb === true || (f.bombs ?? 0) >= 1 },
  { id: 'bomb_5', test: (s, f) => s.stats.bombs + (f.bombs ?? 0) >= 5 },
  { id: 'first_rainbow', test: (_s, f) => f.rainbow === true || (f.rainbows ?? 0) >= 1 },
  { id: 'rainbow_3', test: (s, f) => s.stats.rainbows + (f.rainbows ?? 0) >= 3 },
  { id: 'combo_3', test: (_s, f) => (f.combo ?? 0) >= 3 },
  { id: 'combo_5', test: (_s, f) => (f.combo ?? 0) >= 5 },
  { id: 'score_10k', test: (_s, f) => (f.score ?? 0) >= 10_000 },
  { id: 'score_20k', test: (_s, f) => (f.score ?? 0) >= 20_000 },
  { id: 'score_35k', test: (_s, f) => (f.score ?? 0) >= 35_000 },
  { id: 'score_50k', test: (_s, f) => (f.score ?? 0) >= 50_000 },
  { id: 'timed_win', test: (_s, f) => f.mode === 'timed' && (f.score ?? 0) > 0 },
  { id: 'cuddle_calm', test: (_s, f) => f.mode === 'cuddle' && (f.score ?? 0) > 0 },
  { id: 'daily_treat', test: (_s, f) => f.mode === 'daily' || f.dailyPlayed === true },
  { id: 'daily_streak_3', test: (s) => s.streak.current >= 3 || s.streak.best >= 3 },
  { id: 'daily_streak_7', test: (s) => s.streak.current >= 7 || s.streak.best >= 7 },
  { id: 'runs_10', test: (s) => s.stats.runs >= 10 },
  { id: 'runs_50', test: (s) => s.stats.runs >= 50 },
  { id: 'pops_100', test: (s) => s.stats.pops >= 100 },
  { id: 'pops_500', test: (s) => s.stats.pops >= 500 },
  { id: 'adventure_1', test: (s, f) => s.stats.adventureWins >= 1 || (f.won === true && (f.adventureLevel ?? 0) >= 1) },
  { id: 'adventure_15', test: (s) => s.adventure.frontier > 15 || Object.keys(s.adventure.levels).length >= 15 },
  { id: 'adventure_30', test: (s) => s.adventure.frontier > 30 },
  { id: 'adventure_60', test: (s) => s.adventure.frontier > 60 },
  { id: 'stars_3_run', test: (_s, f) => (f.stars ?? 0) >= 3 },
  {
    id: 'no_bomb',
    test: (_s, f) => (f.score ?? 0) >= 25_000 && (f.bombs ?? 0) === 0 && f.bomb !== true,
  },
  { id: 'shop_first', test: (s) => s.stats.shopPurchases >= 1 },
  { id: 'mission_day', test: (s) => s.missions.finished >= 1 },
]

const defById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function achievementDef(id: string): AchievementDef | undefined {
  return defById.get(id)
}

export type GrantedAchievement = AchievementDef

export function grantAchievements(save: SaveV3, facts: AchievementFacts): GrantedAchievement[] {
  const granted: GrantedAchievement[] = []
  for (const { id, test } of checks) {
    if (save.achievements[id] === 1) continue
    if (!test(save, facts)) continue
    save.achievements[id] = 1
    const def = defById.get(id)
    if (def) granted.push(def)
  }
  return granted
}

export function countUnlocked(save: SaveV3): number {
  return Object.keys(save.achievements).length
}
