import { dailySeed } from '../sim'
import type { SaveV3 } from './save'
import { addSugarStars } from './progression'

export type MissionKind = 'score' | 'chain' | 'bomb' | 'rainbow' | 'combo' | 'pops' | 'play' | 'adventure'

export type MissionDef = {
  id: string
  kind: MissionKind
  label: string
  emoji: string
  target: number
  rewardStars: number
  rewardCoins: number
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'm_score_8k', kind: 'score', label: 'Score 8,000', emoji: '🎯', target: 8000, rewardStars: 2, rewardCoins: 5 },
  { id: 'm_score_15k', kind: 'score', label: 'Score 15,000', emoji: '🚀', target: 15_000, rewardStars: 3, rewardCoins: 8 },
  { id: 'm_chain_6', kind: 'chain', label: 'Chain ×6', emoji: '🔗', target: 6, rewardStars: 2, rewardCoins: 4 },
  { id: 'm_chain_8', kind: 'chain', label: 'Chain ×8', emoji: '💫', target: 8, rewardStars: 3, rewardCoins: 6 },
  { id: 'm_bomb_2', kind: 'bomb', label: 'Pop 2 bombs', emoji: '💣', target: 2, rewardStars: 2, rewardCoins: 5 },
  { id: 'm_rainbow_1', kind: 'rainbow', label: 'Rainbow once', emoji: '🌈', target: 1, rewardStars: 2, rewardCoins: 5 },
  { id: 'm_combo_4', kind: 'combo', label: 'Combo ×4', emoji: '⚡', target: 4, rewardStars: 2, rewardCoins: 4 },
  { id: 'm_pops_40', kind: 'pops', label: 'Pop 40 bonbons', emoji: '🍬', target: 40, rewardStars: 2, rewardCoins: 5 },
  { id: 'm_play_2', kind: 'play', label: 'Play 2 rounds', emoji: '🎮', target: 2, rewardStars: 1, rewardCoins: 3 },
  { id: 'm_adventure_1', kind: 'adventure', label: 'Win 1 adventure', emoji: '🗺️', target: 1, rewardStars: 3, rewardCoins: 8 },
]

export type MissionRunHook = {
  score?: number
  chainLen?: number
  bombs?: number
  rainbows?: number
  combo?: number
  pops?: number
  adventureWin?: boolean
}

function hashPick(day: string, count: number): MissionDef[] {
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  const pool = [...MISSION_POOL]
  const picks: MissionDef[] = []
  for (let i = 0; i < count && pool.length; i++) {
    h = (h * 1664525 + 1013904223) >>> 0
    const idx = h % pool.length
    picks.push(pool.splice(idx, 1)[0]!)
  }
  return picks
}

export function ensureDailyMissions(save: SaveV3, day = dailySeed()): void {
  if (save.missions.day === day && save.missions.slots.length === 3) return
  const picks = hashPick(day, 3)
  save.missions.day = day
  save.missions.slots = picks.map((m) => ({ id: m.id, progress: 0, claimed: false }))
  save.missions.finished = 0
}

export function missionDef(id: string): MissionDef | undefined {
  return MISSION_POOL.find((m) => m.id === id)
}

function hookValue(hook: MissionRunHook, kind: MissionKind): number {
  switch (kind) {
    case 'score':
      return hook.score ?? 0
    case 'chain':
      return hook.chainLen ?? 0
    case 'bomb':
      return hook.bombs ?? 0
    case 'rainbow':
      return hook.rainbows ?? 0
    case 'combo':
      return hook.combo ?? 0
    case 'pops':
      return hook.pops ?? 0
    case 'play':
      return 1
    case 'adventure':
      return hook.adventureWin ? 1 : 0
    default:
      return 0
  }
}

/** Call after each run to advance mission counters (max progress, not additive for score/chain/combo). */
export function applyMissionProgress(save: SaveV3, hook: MissionRunHook): void {
  ensureDailyMissions(save)
  for (const slot of save.missions.slots) {
    if (slot.claimed) continue
    const def = missionDef(slot.id)
    if (!def) continue
    const v = hookValue(hook, def.kind)
    if (def.kind === 'play' || def.kind === 'pops' || def.kind === 'bomb' || def.kind === 'rainbow') {
      slot.progress = Math.min(def.target, slot.progress + v)
    } else if (def.kind === 'adventure') {
      if (hook.adventureWin) slot.progress = Math.min(def.target, slot.progress + 1)
    } else {
      slot.progress = Math.max(slot.progress, Math.min(def.target, v))
    }
  }
}

export function missionReady(slot: { progress: number; claimed: boolean }, def: MissionDef): boolean {
  return !slot.claimed && slot.progress >= def.target
}

export function claimMission(save: SaveV3, missionId: string): { ok: boolean; stars: number; coins: number } {
  ensureDailyMissions(save)
  const slot = save.missions.slots.find((s) => s.id === missionId)
  const def = missionDef(missionId)
  if (!slot || !def || slot.claimed) return { ok: false, stars: 0, coins: 0 }
  if (slot.progress < def.target) return { ok: false, stars: 0, coins: 0 }
  slot.claimed = true
  addSugarStars(save, def.rewardStars)
  save.profile.coins += def.rewardCoins
  save.profile.coinsEarned += def.rewardCoins
  save.stats.missionClaims += 1
  if (save.missions.slots.every((s) => s.claimed)) save.missions.finished += 1
  return { ok: true, stars: def.rewardStars, coins: def.rewardCoins }
}

export function missionsSummary(save: SaveV3): { done: number; total: number } {
  ensureDailyMissions(save)
  const total = save.missions.slots.length
  const done = save.missions.slots.filter((s) => {
    const def = missionDef(s.id)
    return def && (s.claimed || s.progress >= def.target)
  }).length
  return { done, total }
}
