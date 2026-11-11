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
}

const CHAPTER_NAMES = ['Sugar Meadow', 'Fizz Factory', 'Frost Fields', 'Choco Cavern'] as const

function levelTitle(chapter: number, indexInChapter: number): string {
  return `${CHAPTER_NAMES[chapter - 1] ?? 'Trail'} ${indexInChapter}`
}

function buildLevel(id: number): AdventureLevelDef {
  const chapter = (Math.ceil(id / 15) as 1 | 2 | 3 | 4)
  const indexInChapter = ((id - 1) % 15) + 1
  const tier = indexInChapter + (chapter - 1) * 3
  const colorCount = Math.min(6, 3 + Math.floor((id - 1) / 12))
  const moves = Math.max(12, 28 - Math.floor(id / 8))
  const baseScore = 4000 + id * 180 + chapter * 500

  const blockers: BlockerHints = {}
  if (chapter >= 3) blockers.ice = Math.min(12, 2 + Math.floor(indexInChapter / 2))
  if (chapter >= 4) blockers.choco = Math.min(10, 1 + Math.floor(indexInChapter / 3))

  const goals: AdventureGoal[] = []
  const phase = (id - 1) % 5

  if (chapter === 1 || phase === 0 || phase === 1) {
    const color = (id + chapter) % Math.max(3, colorCount)
    const count = 10 + Math.floor(tier * 1.2)
    goals.push({ type: 'clear_color', color, count })
  }
  if (chapter === 2 || phase === 2) {
    goals.push({ type: 'pop_bombs', count: 1 + Math.floor(tier / 6) })
  }
  if (phase === 3 || chapter >= 2) {
    const score = baseScore
    const moveCap = moves + 4
    if (goals.length < 2) goals.push({ type: 'score_moves', score, moves: moveCap })
  }
  if (chapter >= 3 && (phase === 4 || indexInChapter > 8)) {
    goals.push({ type: 'break_ice', count: Math.min(8, 2 + Math.floor(tier / 4)) })
  }
  if (chapter >= 4 && indexInChapter > 5) {
    goals.push({ type: 'clear_choco', count: Math.min(6, 2 + Math.floor(tier / 5)) })
  }

  if (goals.length === 0) {
    goals.push({ type: 'clear_color', color: 0, count: 12 + tier })
  }

  const starScore: [number, number, number] = [
    baseScore,
    Math.floor(baseScore * 1.35),
    Math.floor(baseScore * 1.75),
  ]

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
  }
}

export const ADVENTURE_LEVELS: AdventureLevelDef[] = Array.from({ length: 60 }, (_, i) => buildLevel(i + 1))

export function levelById(id: number): AdventureLevelDef | undefined {
  return ADVENTURE_LEVELS.find((l) => l.id === id)
}

export function chapterLevelRange(chapter: 1 | 2 | 3 | 4): AdventureLevelDef[] {
  const start = (chapter - 1) * 15 + 1
  return ADVENTURE_LEVELS.filter((l) => l.id >= start && l.id < start + 15)
}
