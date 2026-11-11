import { dailySeed } from '../sim'

export const SAVE_KEY_V3 = 'bonbon-boing-v3'
const SAVE_KEY_V2 = 'bonbon-boing-v2'
const SAVE_KEY_V1 = 'bonbon-boing-v1'
const SAVE_KEY_LEGACY = 'bonbon-boing'

export type AdventureLevelProgress = {
  stars: 0 | 1 | 2 | 3
  bestScore: number
}

export type SaveV3 = {
  v: 3
  tut: boolean
  muteSfx: boolean
  muteMusic: boolean
  bestTimed: number
  bestCuddle: number
  dailyBest: number
  dailyDay: string
  profile: {
    xp: number
    level: number
    coins: number
    coinsEarned: number
    stars: number
  }
  equipped: {
    skin: string
    theme: string
    pop: string
  }
  owned: {
    skins: string[]
    themes: string[]
    pops: string[]
  }
  achievements: Record<string, 1>
  adventure: {
    frontier: number
    levels: Record<string, AdventureLevelProgress>
    chapterStars: Record<string, number>
  }
  missions: {
    day: string
    slots: { id: string; progress: number; claimed: boolean }[]
    finished: number
  }
  streak: {
    current: number
    best: number
    lastDay: string
  }
  stats: {
    runs: number
    bombs: number
    rainbows: number
    maxChain: number
    maxCombo: number
    adventureWins: number
    pops: number
    chains: number
    timedRuns: number
    cuddleRuns: number
    dailyRuns: number
    shopPurchases: number
    missionClaims: number
  }
  seenTips: string[]
}

type SaveV2 = {
  v?: 2
  tut?: boolean
  muteSfx?: boolean
  muteMusic?: boolean
  bestTimed?: number
  bestCuddle?: number
  dailyBest?: number
  dailyDay?: string
}

type SaveV1 = {
  v?: 1
  tut?: boolean
  muteSfx?: boolean
  muteMusic?: boolean
  best?: number
  bestTimed?: number
  bestCuddle?: number
}

const STARTER_OWNED = {
  skins: ['classic'],
  themes: ['candy'],
  pops: ['sparkle'],
} as const

export function defaultSave(): SaveV3 {
  const day = dailySeed()
  return {
    v: 3,
    tut: false,
    muteSfx: false,
    muteMusic: false,
    bestTimed: 0,
    bestCuddle: 0,
    dailyBest: 0,
    dailyDay: day,
    profile: {
      xp: 0,
      level: 1,
      coins: 0,
      coinsEarned: 0,
      stars: 3,
    },
    equipped: {
      skin: 'classic',
      theme: 'candy',
      pop: 'sparkle',
    },
    owned: {
      skins: [...STARTER_OWNED.skins],
      themes: [...STARTER_OWNED.themes],
      pops: [...STARTER_OWNED.pops],
    },
    achievements: {},
    adventure: {
      frontier: 1,
      levels: {},
      chapterStars: { '1': 0, '2': 0, '3': 0, '4': 0 },
    },
    missions: {
      day,
      slots: [],
      finished: 0,
    },
    streak: {
      current: 0,
      best: 0,
      lastDay: '',
    },
    stats: {
      runs: 0,
      bombs: 0,
      rainbows: 0,
      maxChain: 0,
      maxCombo: 0,
      adventureWins: 0,
      pops: 0,
      chains: 0,
      timedRuns: 0,
      cuddleRuns: 0,
      dailyRuns: 0,
      shopPurchases: 0,
      missionClaims: 0,
    },
    seenTips: [],
  }
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function mergeV2(base: SaveV3, raw: SaveV2): SaveV3 {
  return {
    ...base,
    tut: bool(raw.tut, base.tut),
    muteSfx: bool(raw.muteSfx, base.muteSfx),
    muteMusic: bool(raw.muteMusic, base.muteMusic),
    bestTimed: num(raw.bestTimed, base.bestTimed),
    bestCuddle: num(raw.bestCuddle, base.bestCuddle),
    dailyBest: num(raw.dailyBest, base.dailyBest),
    dailyDay: typeof raw.dailyDay === 'string' ? raw.dailyDay : base.dailyDay,
  }
}

function mergeV1(base: SaveV3, raw: SaveV1): SaveV3 {
  const bestTimed = num(raw.bestTimed, num(raw.best, base.bestTimed))
  return mergeV2(base, {
    tut: raw.tut,
    muteSfx: raw.muteSfx,
    muteMusic: raw.muteMusic,
    bestTimed,
    bestCuddle: num(raw.bestCuddle, base.bestCuddle),
  })
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function isSaveV3(x: unknown): x is SaveV3 {
  if (!x || typeof x !== 'object') return false
  const o = x as Partial<SaveV3>
  return o.v === 3
}

function normalizeV3(parsed: Partial<SaveV3>): SaveV3 {
  const base = defaultSave()
  if (!parsed || typeof parsed !== 'object') return base

  const profile = { ...base.profile, ...parsed.profile }
  const equipped = { ...base.equipped, ...parsed.equipped }
  const owned = {
    skins: Array.isArray(parsed.owned?.skins) ? [...parsed.owned.skins] : base.owned.skins,
    themes: Array.isArray(parsed.owned?.themes) ? [...parsed.owned.themes] : base.owned.themes,
    pops: Array.isArray(parsed.owned?.pops) ? [...parsed.owned.pops] : base.owned.pops,
  }
  const adventure = {
    frontier: num(parsed.adventure?.frontier, 1),
    levels: parsed.adventure?.levels && typeof parsed.adventure.levels === 'object' ? { ...parsed.adventure.levels } : {},
    chapterStars: {
      ...base.adventure.chapterStars,
      ...(parsed.adventure?.chapterStars ?? {}),
    },
  }
  const missions = {
    day: typeof parsed.missions?.day === 'string' ? parsed.missions.day : base.missions.day,
    slots: Array.isArray(parsed.missions?.slots)
      ? parsed.missions.slots.map((s) => ({
          id: String(s.id ?? ''),
          progress: num(s.progress),
          claimed: bool(s.claimed),
        }))
      : base.missions.slots,
    finished: num(parsed.missions?.finished),
  }
  const streak = { ...base.streak, ...parsed.streak }
  const stats = { ...base.stats, ...parsed.stats }
  const achievements =
    parsed.achievements && typeof parsed.achievements === 'object' ? { ...parsed.achievements } : {}

  for (const id of STARTER_OWNED.skins) if (!owned.skins.includes(id)) owned.skins.push(id)
  for (const id of STARTER_OWNED.themes) if (!owned.themes.includes(id)) owned.themes.push(id)
  for (const id of STARTER_OWNED.pops) if (!owned.pops.includes(id)) owned.pops.push(id)

  return {
    v: 3,
    tut: bool(parsed.tut, base.tut),
    muteSfx: bool(parsed.muteSfx, base.muteSfx),
    muteMusic: bool(parsed.muteMusic, base.muteMusic),
    bestTimed: num(parsed.bestTimed, base.bestTimed),
    bestCuddle: num(parsed.bestCuddle, base.bestCuddle),
    dailyBest: num(parsed.dailyBest, base.dailyBest),
    dailyDay: typeof parsed.dailyDay === 'string' ? parsed.dailyDay : base.dailyDay,
    profile,
    equipped,
    owned,
    achievements,
    adventure,
    missions,
    streak,
    stats,
    seenTips: Array.isArray(parsed.seenTips) ? [...parsed.seenTips] : base.seenTips,
  }
}

function migrateFromOlder(): SaveV3 | null {
  const v2 = readJson(SAVE_KEY_V2) as SaveV2 | null
  if (v2) return mergeV2(defaultSave(), v2)

  for (const key of [SAVE_KEY_V1, SAVE_KEY_LEGACY] as const) {
    const v1 = readJson(key) as SaveV1 | null
    if (v1) return mergeV1(defaultSave(), v1)
  }
  return null
}

export function loadSave(): SaveV3 {
  const current = readJson(SAVE_KEY_V3)
  if (isSaveV3(current)) return normalizeV3(current)
  if (current && typeof current === 'object') return normalizeV3(current as Partial<SaveV3>)

  const migrated = migrateFromOlder()
  if (migrated) {
    storeSave(migrated)
    return migrated
  }
  return defaultSave()
}

export function storeSave(save: SaveV3): void {
  try {
    localStorage.setItem(SAVE_KEY_V3, JSON.stringify({ ...save, v: 3 }))
  } catch {
    /* private mode */
  }
}
