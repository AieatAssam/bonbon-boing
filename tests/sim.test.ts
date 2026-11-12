import { describe, expect, it } from 'vitest'
import {
  BOMB_AT,
  HITSTOP_MS,
  RAINBOW_AT,
  canAppend,
  collectClears,
  createGame,
  maxColorShare,
  dailySeed,
  extendDrag,
  findPath,
  gridSignature,
  greedySession,
  greedyTimedRound,
  mayBeginChain,
  maxSameColorCluster,
  ladderHz,
  loadGrid,
  playToIdle,
  release,
  roundOver,
  rush,
  settleBudget,
  step,
  byId,
} from '../src/sim'
import { boardLayout } from '../src/layout'

describe('size unit D', () => {
  it('uses one D for every viewport', () => {
    for (const [w, h] of [
      [360, 640],
      [390, 844],
      [430, 932],
      [844, 390],
      [932, 430],
      [1280, 800],
    ] as const) {
      const L = boardLayout(w, h)
      expect(L.D).toBeGreaterThanOrEqual(46)
      expect(L.cols * L.D).toBeLessThanOrEqual(w)
      expect(L.padTop).toBeGreaterThanOrEqual(Math.round(L.D * 0.1) - 1)
      expect(L.oy).toBeGreaterThanOrEqual(L.hud - 1)
      expect(L.ox).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('chains', () => {
  it('only walks orthogonal same-colour neighbours', () => {
    const s = loadGrid(['0 0 1', '0 2 1'])
    const a = s.pieces.find((p) => p.c === 0 && p.r === 0)!
    const b = s.pieces.find((p) => p.c === 1 && p.r === 0)!
    const c = s.pieces.find((p) => p.c === 1 && p.r === 1)!
    const d = s.pieces.find((p) => p.c === 2 && p.r === 0)!
    expect(canAppend([a], b)).toBe(true)
    expect(canAppend([a], c)).toBe(false)
    expect(canAppend([b], d)).toBe(false)
  })

  it('lets a rainbow join any colour and clear that colour', () => {
    const s = loadGrid(['R 0 1', '0 2 0'])
    const path = [at(s, 0, 0), at(s, 1, 0), at(s, 0, 1)]
    const clears = collectClears(s.pieces, path)
    const ids = new Set(clears.map((p) => `${p.c},${p.r}`))
    expect(ids.has('2,1')).toBe(true)
    expect(ids.has('1,1')).toBe(false)
  })

  it('pops a bomb neighbourhood', () => {
    const s = loadGrid(['0 0 B0 0', '1 2 1 2'])
    const path = [0, 1, 2, 3].map((c) => at(s, c, 0))
    const clears = collectClears(s.pieces, path)
    expect(clears.some((p) => p.c === 2 && p.r === 1)).toBe(true)
    expect(clears.some((p) => p.c === 1 && p.r === 1)).toBe(true)
  })
})

describe('pacing', () => {
  it('pops on release and settles inside a second', () => {
    for (let n = 2; n <= 24; n++) {
      expect(settleBudget(n, n >= BOMB_AT)).toBeLessThan(1000)
    }
    const s = createGame('feel', 7, 9, 'timed')
    const path = findPath(s, 6)
    expect(path).toBeTruthy()
    s.drag = path!.map((p) => p.id)
    const first = release(s)
    expect(first.length).toBe(1)
    expect(s.popAt[0]).toBe(0)
    expect(s.hitstopTotal).toBe(HITSTOP_MS)
    expect(s.hitstopTotal).toBeGreaterThanOrEqual(40)
    expect(s.hitstopTotal).toBeLessThanOrEqual(46)
    expect(s.inputLocked).toBe(false)
    const held = byId(s, path![1].id)!
    const r0 = held.r
    step(s, 30)
    expect(held.r).toBe(r0)
    expect(held.dead).toBe(false)
    let guard = 0
    while (!s.settled && guard++ < 80) step(s, 16)
    expect(s.settled).toBe(true)
    expect(s.settleMs).toBeLessThan(1000)
    expect(s.pieces.filter((p) => !p.dead)).toHaveLength(7 * 9)
    expect(s.pieces.some((p) => p.kind === 'bomb')).toBe(true)
  })

  it(`a chain of ${RAINBOW_AT} drops a rainbow`, () => {
    const row = Array.from({ length: RAINBOW_AT }, () => '0').join(' ')
    const s = loadGrid([row])
    s.drag = s.pieces.map((p) => p.id)
    release(s)
    playToIdle(s)
    expect(s.pieces.some((p) => p.kind === 'rainbow')).toBe(true)
  })

  it('removes a bomb when the chain goes through it', () => {
    const s = loadGrid(['0 0 0', '0 B0 0', '0 0 0'])
    const top = at(s, 1, 0)
    const bomb = at(s, 1, 1)
    const bot = at(s, 1, 2)
    expect(bomb.kind).toBe('bomb')
    s.drag = [top.id, bomb.id, bot.id]
    release(s)
    playToIdle(s)
    expect(s.pieces.some((p) => !p.dead && p.kind === 'bomb')).toBe(false)
  })

  it('does not lock the next press', () => {
    const s = createGame('feel', 7, 9, 'timed')
    const upper = findPath(s, 6)!
    const lower = findPath(s, 2, upper.map((p) => p.id), 'bottom')!
    const id = lower[0].id
    s.drag = upper.map((p) => p.id)
    release(s)
    expect(s.phase).not.toBe('idle')
    expect(s.inputLocked).toBe(false)
    rush(s)
    expect(s.settled).toBe(true)
    expect(extendDrag(s, id)).toBe(true)
    expect(s.drag).toEqual([id])
  })

  it('climbs the note ladder', () => {
    for (let i = 0; i < 8; i++) expect(ladderHz(i + 1)).toBeGreaterThan(ladderHz(i))
  })
})

describe('modes and seeds', () => {
  it('is deterministic', () => {
    const a = createGame('feel', 7, 9, 'timed')
    const b = createGame('feel', 7, 9, 'timed')
    expect(gridSignature(a)).toBe(gridSignature(b))
  })

  it('builds a stable daily seed', () => {
    expect(dailySeed(new Date(2026, 10, 10))).toBe('bonbon-2026-11-10')
    const day = dailySeed(new Date(2026, 10, 10))
    expect(gridSignature(createGame(day, 6, 8, 'daily'))).toBe(gridSignature(createGame(day, 6, 8, 'daily')))
  })

  it('leaves cuddle untimed', () => {
    const s = createGame('pretty', 6, 8, 'cuddle')
    step(s, 5000)
    expect(s.timeLeft).toBe(60_000)
    expect(roundOver(s)).toBe(false)
  })

  it('caps opening colour share at 30% across seeds and grid sizes', () => {
    const sizes: [number, number][] = [
      [7, 9],
      [7, 10],
      [7, 11],
      [8, 10],
      [8, 11],
      [6, 10],
    ]
    for (let i = 0; i < 50; i++) {
      const [cols, rows] = sizes[i % sizes.length]!
      const s = createGame(`open-cap-${i}`, cols, rows, 'timed')
      expect(maxColorShare(s)).toBeLessThanOrEqual(0.3)
      expect(findPath(s, 2)).toBeTruthy()
      if (cols * rows >= 63) expect(findPath(s, 3)).toBeTruthy()
    }
  })

  it('keeps start clusters between 4 and 7', () => {
    for (const seed of ['pretty', 'spawn-a', 'spawn-b', 'spawn-c']) {
      const s = createGame(seed, 8, 10, 'timed')
      const max = maxSameColorCluster(s)
      expect(max).toBeLessThanOrEqual(7)
      expect(max).toBeGreaterThanOrEqual(4)
      expect(findPath(s, 3)).toBeTruthy()
    }
  })

  it('adds 25% chain bonus at 7+ links', () => {
    const s = loadGrid(['0 0 0 0 0 0 0'])
    const path = s.pieces.filter((p) => p.r === 0).sort((a, b) => a.c - b.c)
    expect(path).toHaveLength(7)
    s.drag = path.map((p) => p.id)
    release(s)
    expect(s.gained).toBe(Math.round(28 * 4 * 1.25))
  })

  it('greedy timed round cannot farm after bell', () => {
    const s = createGame('feel', 7, 9, 'timed')
    const atZero = greedyTimedRound(s, 650)
    s.timeLeft = 0
    const extra = greedySession(s, 20)
    expect(extra.score).toBe(atZero.score)
  })

  it('blocks new chains after time expires', () => {
    const s = createGame('feel', 7, 9, 'timed')
    s.timeLeft = 0
    expect(mayBeginChain(s)).toBe(false)
    s.timeLeft = 1
    expect(mayBeginChain(s)).toBe(true)
  })
})

function at(s: ReturnType<typeof loadGrid>, c: number, r: number) {
  return s.pieces.find((p) => p.c === c && p.r === r)!
}
