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
  cols: number
  rows: number
  colorCount: number
  goals: AdventureGoal[]
  blockers: BlockerHints
  starScore: [number, number, number]
  tutorialTip?: string
}

/** Fixed play grid per chapter — identical on every viewport/orientation. */
export function gridForLevel(id: number): { cols: number; rows: number } {
  if (id <= 15) return { cols: 7, rows: 9 }
  if (id <= 30) return { cols: 8, rows: 10 }
  if (id <= 45) return { cols: 8, rows: 11 }
  return { cols: 9, rows: 11 }
}

const CHAPTER_NAMES = ['Sugar Meadow', 'Fizz Factory', 'Frost Fields', 'Choco Cavern'] as const

function levelTitle(chapter: number, indexInChapter: number): string {
  return `${CHAPTER_NAMES[chapter - 1] ?? 'Trail'} ${indexInChapter}`
}

function buildBlockers(id: number, chapter: number): BlockerHints {
  const blockers: BlockerHints = {}
  if (id === 1) blockers.ice = 1
  else if (id === 2) blockers.ice = 2
  else if (id <= 7) blockers.ice = Math.min(12, 3 + Math.floor(id / 2))
  else if (id === 12) blockers.ice = 4
  else if (id === 24) blockers.ice = 6
  else blockers.ice = Math.min(14, 2 + Math.floor(id / 4))
  if (id >= 5) blockers.jelly = Math.min(6, 1 + Math.floor((id - 4) / 6))
  if (id >= 10) blockers.sleepy = id % 9 === 0 || id === 12 ? 1 : 0
  if (id >= 25) blockers.starburst = id % 11 === 0 ? 1 : 0
  if (id === 24) blockers.choco = 1
  else if (chapter >= 3 || id >= 18) blockers.choco = Math.min(10, 1 + Math.floor((id - 17) / 5))
  return blockers
}

/** Touch-tuned move budgets; everything else in L13–L24 uses {@link moveBudgetFromGoals}. */
const MOVE_OVERRIDES: Partial<Record<number, number>> = {
  1: 13,
  2: 14,
  3: 13,
  4: 16,
  5: 13,
  6: 19,
  7: 15,
  8: 22,
  12: 11,
  13: 20,
  14: 18,
  15: 46,
  16: 26,
  17: 28,
  18: 46,
  19: 47,
  20: 24,
  21: 28,
  22: 22,
  23: 58,
  24: 66,
}

/** Chapter 2 pacing: colour clears are cheap; ice/choco dominate move cost. */
export function moveBudgetFromGoals(goals: AdventureGoal[]): number {
  let est = 0
  for (const g of goals) {
    if (g.type === 'clear_color') est += g.count / 3.4
    else if (g.type === 'break_ice') est += g.count * 3.1
    else if (g.type === 'pop_bombs') est += g.count * 2.15
    else if (g.type === 'clear_choco') est += g.count * 4.2
  }
  const mult = 1.08 + Math.min(0.35, est * 0.011)
  return Math.max(8, Math.ceil(est * mult))
}

export function buildLevel(id: number): AdventureLevelDef {
  const chapter = (Math.ceil(id / 15) as 1 | 2 | 3 | 4)
  const indexInChapter = ((id - 1) % 15) + 1
  const tier = indexInChapter + (chapter - 1) * 3
  const colorCount =
    id <= 3 ? 3 : chapter === 1 && id < 8 ? 3 : chapter === 1 ? 4 : chapter === 2 ? 5 : Math.min(6, 4 + Math.floor(chapter / 2))
  const baseScore = 3500 + id * 220 + chapter * 520 + tier * 80

  const blockers = buildBlockers(id, chapter)

  const goals: AdventureGoal[] = []
  const color = id % Math.max(3, colorCount)
  const clearCount =
    id === 1
      ? 16
      : id === 2
        ? 16
        : id === 3
          ? 17
          : id === 4
            ? 18
            : id === 5
              ? 19
              : id === 6
                ? 21
                : id === 7
                  ? 25
                  : id === 8
                    ? 14
                    : id === 12
                      ? 12
                      : id === 16
                      ? 16
                      : id === 24
                        ? 14
                        : id <= 12
                          ? 10 + Math.floor(tier * 0.65)
                          : 8 + Math.floor(tier * 0.9)
  goals.push({
    type: 'clear_color',
    color,
    count: clearCount,
  })
  if (id === 24) goals.push({ type: 'pop_bombs', count: 2 })
  else if (id >= 14) goals.push({ type: 'pop_bombs', count: 1 + Math.floor(tier / 12) })
  const iceN = blockers.ice ?? 0
  if (iceN > 0) goals.push({ type: 'break_ice', count: iceN })
  const chocoN = blockers.choco ?? 0
  if (chocoN > 0) goals.push({ type: 'clear_choco', count: chocoN })

  let moves: number
  if (MOVE_OVERRIDES[id] != null) moves = MOVE_OVERRIDES[id]!
  else if (id >= 13 && id <= 24) moves = moveBudgetFromGoals(goals)
  else if (chapter === 1 && id > 8) moves = 22
  else if (chapter === 2) moves = moveBudgetFromGoals(goals)
  else moves = Math.max(14, 18 - Math.floor(id / 10))

  if (indexInChapter === 15) {
    goals.push({ type: 'score_moves', score: baseScore, moves })
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

  const { cols, rows } = gridForLevel(id)

  return {
    id,
    chapter,
    title: levelTitle(chapter, indexInChapter),
    seed: `adv-${chapter}-${indexInChapter}-${id}`,
    moves,
    cols,
    rows,
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
