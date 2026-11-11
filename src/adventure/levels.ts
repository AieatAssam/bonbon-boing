import levelsBundle from '../../public/data/adventure-levels.json'

export type GoalType = 'clear_color' | 'pop_bombs' | 'score_moves' | 'break_ice' | 'clear_choco'

export type AdventureGoal =
  | { type: 'clear_color'; color: number; count: number }
  | { type: 'pop_bombs'; count: number }
  | { type: 'score_moves'; score: number; moves: number }
  | { type: 'break_ice'; count: number }
  | { type: 'clear_choco'; count: number }

export type BlockerHints = {
  ice?: number
  choco?: number
  jelly?: number
  sleepy?: number
  starburst?: number
}

export type AdventureLevelDef = {
  id: number
  chapter: 1 | 2 | 3 | 4
  title: string
  seed: string
  moves: number
  colorCount: number
  goals: AdventureGoal[]
  blockers: BlockerHints
  starScore: [number, number, number]
  tutorialTip?: string
}

const CHAPTER_NAMES = ['Sugar Meadow', 'Fizz Factory', 'Frost Fields', 'Choco Cavern'] as const

function levelTitle(chapter: number, indexInChapter: number): string {
  return `${CHAPTER_NAMES[chapter - 1] ?? 'Trail'} ${indexInChapter}`
}

export function buildLevel(id: number): AdventureLevelDef {
  const chapter = (Math.ceil(id / 15) as 1 | 2 | 3 | 4)
  const indexInChapter = ((id - 1) % 15) + 1
  const tier = indexInChapter + (chapter - 1) * 3
  const colorCount =
    id <= 3 ? 3 : chapter === 1 && id < 8 ? 3 : chapter === 1 ? 4 : chapter === 2 ? 5 : Math.min(6, 4 + Math.floor(chapter / 2))
  const moves =
    id <= 3 ? 28 : id <= 7 ? 22 : chapter === 1 ? Math.max(16, 20 - Math.floor(id / 6)) : chapter === 2 ? Math.max(14, 18 - Math.floor(id / 8)) : Math.max(12, 16 - Math.floor(id / 10))
  const baseScore = 3500 + id * 220 + chapter * 520 + tier * 80

  const blockers: BlockerHints = {}
  if (id >= 1) blockers.ice = Math.min(14, 2 + Math.floor(id / 4))
  if (id >= 5) blockers.jelly = Math.min(6, 1 + Math.floor((id - 4) / 6))
  if (id >= 10) blockers.sleepy = id % 9 === 0 || id === 12 ? 1 : 0
  if (id >= 25) blockers.starburst = id % 11 === 0 ? 1 : 0
  if (chapter >= 3 || id >= 18) blockers.choco = Math.min(10, 1 + Math.floor((id - 17) / 5))

  const goals: AdventureGoal[] = []
  const color = id % Math.max(3, colorCount)
  goals.push({
    type: 'clear_color',
    color,
    count: id <= 3 ? 4 : id <= 8 ? 7 + Math.floor(tier * 0.5) : 8 + Math.floor(tier * 0.9),
  })
  if (id >= 6) goals.push({ type: 'pop_bombs', count: 1 + Math.floor(tier / 10) })
  if (id >= 3) goals.push({ type: 'break_ice', count: Math.min(10, 2 + Math.floor(id / 5)) })
  if (id >= 20) goals.push({ type: 'clear_choco', count: Math.min(8, 2 + Math.floor((id - 19) / 6)) })
  if (indexInChapter === 15) {
    goals.push({ type: 'score_moves', score: baseScore, moves: moves })
  }

  const starMul: [number, number, number] =
    id <= 8
      ? [1, 1.06, 1.22]
      : chapter === 1
        ? [1, 1.32, 1.72]
        : chapter === 2
          ? [1, 1.48, 2.05]
          : [1, 1.42, 1.88]
  const starScore: [number, number, number] = [
    baseScore,
    Math.floor(baseScore * starMul[1]),
    Math.floor(baseScore * starMul[2]),
  ]

  let tutorialTip: string | undefined
  if (id === 1) tutorialTip = 'ice'
  else if (id === 5) tutorialTip = 'jelly'
  else if (id === 12) tutorialTip = 'sleepy'
  else if (id === 18) tutorialTip = 'choco'
  else if (id === 25) tutorialTip = 'starburst'

  return {
    id,
    chapter,
    title: levelTitle(chapter, indexInChapter),
    seed: `adv-${chapter}-${indexInChapter}-${id}`,
    moves,
    colorCount,
    goals,
    blockers,
    starScore,
    tutorialTip,
  }
}

type LevelsFile = { version: number; levels: AdventureLevelDef[] }

const bundled = levelsBundle as LevelsFile
export const ADVENTURE_LEVELS: AdventureLevelDef[] = Array.from({ length: 60 }, (_, i) => {
  const built = buildLevel(i + 1)
  const saved = bundled.levels?.[i]
  return saved?.id === built.id ? { ...built, seed: saved.seed } : built
})

export function levelById(id: number): AdventureLevelDef | undefined {
  return ADVENTURE_LEVELS.find((l) => l.id === id)
}

export function chapterLevelRange(chapter: 1 | 2 | 3 | 4): AdventureLevelDef[] {
  const start = (chapter - 1) * 15 + 1
  return ADVENTURE_LEVELS.filter((l) => l.id >= start && l.id < start + 15)
}
