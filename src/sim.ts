import type { AdventureLevelDef } from './adventure/levels'

export const ROUND_MS = 60_000
export const HITSTOP_MS = 70
export const POP_MS = 140
export const POP_GROW_MS = 40
export const POP_SQUASH_MS = 40
export const POP_VANISH_MS = 60
export const POP_STAGGER_MS = 30
export const FALL_MS = 220
export const SPAWN_MS = 300
export const FALL_DELAY = 70
export const STAGGER_CAP = 32
export const STAGGER_BUDGET = 360
export const BOMB_AT = 5
export const RAINBOW_AT = 7
export const COMBO_WINDOW_MS = 1500
export const COMBO_CAP = 5

export type Mode = 'timed' | 'cuddle' | 'daily' | 'adventure'
export type Kind = 'bonbon' | 'bomb' | 'rainbow' | 'ice' | 'choco' | 'jelly' | 'sleepy' | 'starburst'

export type Piece = {
  id: number
  color: number
  kind: Kind
  c: number
  r: number
  dead: boolean
  popT: number
  fallFrom: number
  fallTo: number
  fallT: number
  landT: number
  /** In-board refill pop-in: -2 = wait for column fall, -1 = none, 0..1 = animating. */
  spawnT: number
  /** Ice / sleepy hits remaining before pop. */
  hits: number
  /** Jelly bonbons start locked until a neighbour pops. */
  locked: boolean
}

export type RunTrack = {
  clearedByColor: number[]
  bombsPopped: number
  iceBroken: number
  chocoCleared: number
  jellyUnlocked: number
  movesUsed: number
  starbursts: number
}

export type GameState = {
  cols: number
  rows: number
  pieces: Piece[]
  nextId: number
  rng: () => number
  seed: string
  mode: Mode
  phase: 'idle' | 'clearing' | 'falling'
  drag: number[]
  queue: { id: number; at: number }[]
  fired: number
  resolveMs: number
  elapsed: number
  hitstopLeft: number
  hitstopTotal: number
  hitstopPending: boolean
  fallStart: number
  timeLeft: number
  score: number
  combo: number
  lastSettleAt: number
  simMs: number
  settleMs: number
  popAt: number[]
  settled: boolean
  /** True during adventure bonus finale (tap to skip). */
  inputLocked: boolean
  special: 'bomb' | 'rainbow' | 'starburst' | null
  specialAt: { c: number; r: number } | null
  chainColor: number
  lastChainLen: number
  gained: number
  guide: number[] | null
  guideBottom: number[] | null
  showIds: number[]
  /** Moves since a length-6+ chain was available (refill tuning). */
  dryLongChain: number
  colorCap: number
  /** Adventure level id when mode === adventure (for spawn rules). */
  adventureId: number
  /** Adventure: remaining moves; -1 = unlimited (timed/cuddle). */
  movesLeft: number
  track: RunTrack
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dailySeed(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `bonbon-${y}-${m}-${day}`
}

export function lineSeed(seed: string): boolean {
  return seed === 'feel' || seed === 'shot' || seed === 'ghost' || seed === 'qa-nav' || seed.startsWith('qa-line')
}

export function settleBudget(n: number, big: boolean): number {
  const stag = n <= 1 ? 0 : Math.min(STAGGER_CAP, STAGGER_BUDGET / (n - 1))
  return (big ? HITSTOP_MS : 0) + (n - 1) * stag + FALL_DELAY + FALL_MS
}

export function ladderHz(i: number): number {
  const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093]
  return scale[Math.min(Math.max(0, i), scale.length - 1)]
}

function makePiece(state: GameState, c: number, r: number, color: number, kind: Kind, extra?: Partial<Pick<Piece, 'hits' | 'locked'>>): Piece {
  const p: Piece = {
    id: state.nextId++,
    color,
    kind,
    c,
    r,
    dead: false,
    popT: -1,
    fallFrom: r,
    fallTo: r,
    fallT: -1,
    landT: -1,
    spawnT: -1,
    hits: extra?.hits ?? (kind === 'ice' ? 2 : kind === 'sleepy' ? 3 : 0),
    locked: extra?.locked ?? kind === 'jelly',
  }
  return p
}

export function byId(state: GameState, id: number): Piece | undefined {
  return state.pieces.find((p) => p.id === id)
}

export function at(state: GameState, c: number, r: number): Piece | null {
  let dead: Piece | null = null
  for (const p of state.pieces) {
    if (p.c !== c || p.r !== r) continue
    if (!p.dead) return p
    dead = p
  }
  return dead
}

export function pathColor(path: Piece[]): number | null {
  for (const p of path) if (p.kind !== 'rainbow') return p.color
  return null
}

export function canAppend(path: Piece[], next: Piece): boolean {
  if (next.dead) return false
  if (next.locked) return false
  if (next.kind === 'choco' || next.kind === 'sleepy') return false
  if (path.some((p) => p.id === next.id)) return false
  const last = path[path.length - 1]
  if (!last) return true
  if (Math.abs(last.c - next.c) + Math.abs(last.r - next.r) !== 1) return false
  if (next.kind === 'rainbow' || next.kind === 'starburst') return true
  const color = pathColor(path)
  if (color === null) return true
  if (last.kind === 'rainbow') return next.color === color || next.kind === 'ice'
  if (next.kind === 'ice') return next.color === color
  return next.color === color && (next.kind === 'bonbon' || next.kind === 'bomb' || next.kind === 'jelly')
}

export function activeColorCount(state: GameState): number {
  if (state.colorCap > 0) return Math.min(6, Math.max(3, state.colorCap))
  if (state.mode === 'cuddle') return 5
  if (state.mode === 'adventure') return Math.min(6, 3 + Math.floor(state.track.movesUsed / 8))
  if (state.score >= 1200 || state.timeLeft <= 45_000) return 6
  if (state.score >= 400 || state.timeLeft <= 30_000) return 5
  return 4
}

export function visualRow(p: Piece): number {
  if (p.fallT < 0 || p.fallT >= 1) return p.r
  const t = p.fallT
  const ease = 1 - (1 - t) ** 2.2
  const overshoot = t > 0.62 ? Math.sin(((t - 0.62) / 0.38) * Math.PI) * 0.12 : 0
  return p.fallFrom + (p.fallTo - p.fallFrom) * ease + overshoot
}

function gridMaxCluster(colors: number[][], cols: number, rows: number): number {
  const seen = new Set<string>()
  let best = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${c},${r}`
      if (seen.has(key)) continue
      const color = colors[r][c]
      let n = 0
      const q: [number, number][] = [[c, r]]
      seen.add(key)
      for (let i = 0; i < q.length; i++) {
        const [cc, rr] = q[i]
        n += 1
        for (const [dc, dr] of DIRS) {
          const nc = cc + dc
          const nr = rr + dr
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
          const k = `${nc},${nr}`
          if (seen.has(k) || colors[nr][nc] !== color) continue
          seen.add(k)
          q.push([nc, nr])
        }
      }
      if (n > best) best = n
    }
  }
  return best
}

function gridChainCount(colors: number[][], cols: number, rows: number, min: number): number {
  let n = 0
  const seen = new Set<number>()
  for (let color = 0; color < 6; color++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (colors[r][c] !== color) continue
        const id = r * cols + c
        if (seen.has(id)) continue
        let size = 0
        const q: [number, number][] = [[c, r]]
        const local = new Set<string>()
        local.add(`${c},${r}`)
        for (let i = 0; i < q.length; i++) {
          const [cc, rr] = q[i]
          size += 1
          seen.add(rr * cols + cc)
          for (const [dc, dr] of DIRS) {
            const nc = cc + dc
            const nr = rr + dr
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
            const k = `${nc},${nr}`
            if (local.has(k) || colors[nr][nc] !== color) continue
            local.add(k)
            q.push([nc, nr])
          }
        }
        if (size >= min) n += 1
      }
    }
  }
  return n
}

function colorShareLive(state: GameState, color: number): number {
  const live = state.pieces.filter((p) => !p.dead && p.kind === 'bonbon')
  if (!live.length) return 0
  return live.filter((p) => p.color === color).length / live.length
}

/** Highest live share of any active colour on the board. */
export function maxColorShare(state: GameState): number {
  const n = activeColorCount(state)
  let max = 0
  for (let c = 0; c < n; c++) max = Math.max(max, colorShareLive(state, c))
  return max
}

function rebalanceColorShare(state: GameState, cap = 0.3): void {
  const n = activeColorCount(state)
  for (let guard = 0; guard < 280 && maxColorShare(state) > cap + 1e-9; guard++) {
    let dom = 0
    let domShare = 0
    for (let c = 0; c < n; c++) {
      const sh = colorShareLive(state, c)
      if (sh > domShare) {
        domShare = sh
        dom = c
      }
    }
    if (domShare <= cap) break
    const domPieces = state.pieces.filter((p) => !p.dead && p.kind === 'bonbon' && p.color === dom)
    if (!domPieces.length) break
    const pick = domPieces[Math.floor(state.rng() * domPieces.length)]!
    let minC = -1
    let minShare = 1
    for (let c = 0; c < n; c++) {
      if (c === dom) continue
      const sh = colorShareLive(state, c)
      if (sh < minShare) {
        minShare = sh
        minC = c
      }
    }
    if (minC < 0) break
    const was = pick.color
    pick.color = minC
    if (!findPath(state, 3) || maxSameColorCluster(state) > 7) pick.color = was
  }
}

function pickSpawnColor(state: GameState, colors: number[][], c: number, r: number): number {
  const n = activeColorCount(state)
  const below = r + 1 < state.rows ? colors[r + 1][c] : -1
  const side = c > 0 ? colors[r][c - 1] : -1
  const buddy = below >= 0 ? below : side
  if (
    state.mode !== 'adventure' &&
    state.lastChainLen >= 6 &&
    state.chainColor >= 0 &&
    colorShareLive(state, state.chainColor) < 0.28 &&
    state.rng() < 0.12
  ) {
    colors[r][c] = state.chainColor
    const cap = 6
    if (gridMaxCluster(colors, state.cols, state.rows) <= cap) return state.chainColor
  }
  const buddyPull = state.lastChainLen >= 7 ? 0.1 : 0.06
  if (buddy >= 0 && buddy < n && state.rng() < buddyPull && colorShareLive(state, buddy) < 0.28) {
    colors[r][c] = buddy
    const cap = state.rng() < 0.38 ? 7 : 6
    if (gridMaxCluster(colors, state.cols, state.rows) <= cap) return buddy
  }
  let best = Math.floor(state.rng() * n)
  let bestScore = 1e9
  for (let t = 0; t < 9; t++) {
    const color = Math.floor(state.rng() * n)
    if (colorShareLive(state, color) > 0.295) continue
    colors[r][c] = color
    const cap = state.rng() < 0.35 ? 7 : 6
    const score = gridMaxCluster(colors, state.cols, state.rows)
    if (score > cap) continue
    if (score < bestScore) {
      bestScore = score
      best = color
    }
    if (score <= cap) return color
  }
  return best
}

export function maxSameColorCluster(state: GameState): number {
  const colors: number[][] = []
  for (let r = 0; r < state.rows; r++) {
    colors[r] = []
    for (let c = 0; c < state.cols; c++) {
      const p = at(state, c, r)
      colors[r][c] = p && !p.dead ? p.color : -1
    }
  }
  const live = colors.flat().filter((x) => x >= 0)
  if (!live.length) return 0
  const seen = new Set<string>()
  let best = 0
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const color = colors[r][c]
      if (color < 0) continue
      const key = `${c},${r}`
      if (seen.has(key)) continue
      let n = 0
      const q: [number, number][] = [[c, r]]
      seen.add(key)
      for (let i = 0; i < q.length; i++) {
        const [cc, rr] = q[i]
        n += 1
        for (const [dc, dr] of DIRS) {
          const nc = cc + dc
          const nr = rr + dr
          if (nc < 0 || nr < 0 || nc >= state.cols || nr >= state.rows) continue
          const k = `${nc},${nr}`
          if (seen.has(k) || colors[nr][nc] !== color) continue
          seen.add(k)
          q.push([nc, nr])
        }
      }
      if (n > best) best = n
    }
  }
  return best
}

function orthoNeighbors(pieces: Piece[], p: Piece): Piece[] {
  const out: Piece[] = []
  for (const q of pieces) {
    if (q.dead || q.id === p.id) continue
    if (Math.abs(q.c - p.c) + Math.abs(q.r - p.r) === 1) out.push(q)
  }
  return out
}

export function collectClears(pieces: Piece[], path: Piece[]): Piece[] {
  const live = pieces.filter((p) => !p.dead)
  const set = new Set(path.filter((p) => !p.dead))
  const color = pathColor(path)
  for (const p of path) {
    if (p.kind === 'bomb' || p.kind === 'starburst') {
      const rad = p.kind === 'starburst' ? 2 : 1
      for (const q of live) {
        if (Math.abs(q.c - p.c) <= rad && Math.abs(q.r - p.r) <= rad) set.add(q)
      }
    }
  }
  if (path.some((p) => p.kind === 'rainbow') && color !== null) {
    for (const q of live) if (q.kind !== 'rainbow' && q.color === color) set.add(q)
  }
  let grew = true
  while (grew) {
    grew = false
    for (const q of live) {
      if (q.kind !== 'choco' || set.has(q)) continue
      for (const n of orthoNeighbors(live, q)) {
        if (!set.has(n)) continue
        set.add(q)
        grew = true
        break
      }
    }
  }
  for (const q of live) {
    if (q.kind !== 'sleepy' || set.has(q)) continue
    for (const n of orthoNeighbors(live, q)) {
      if (!set.has(n)) continue
      q.hits -= 1
      if (q.hits <= 0) set.add(q)
      break
    }
  }
  for (const p of [...set]) {
    for (const n of orthoNeighbors(live, p)) {
      if (n.locked) n.locked = false
    }
  }
  const extras = [...set].filter((p) => !path.includes(p))
  extras.sort((a, b) => a.id - b.id)
  return [...path.filter((p) => set.has(p)), ...extras]
}

function orthoLive(state: GameState, p: Piece, allow: Set<number> | null): Piece[] {
  const out: Piece[] = []
  for (const [dc, dr] of DIRS) {
    const n = at(state, p.c + dc, p.r + dr)
    if (!n || n.dead) continue
    if (allow && !allow.has(n.id)) continue
    out.push(n)
  }
  return out
}

function diameterPath(state: GameState, color: number, min: number, avoid: Set<number>): Piece[] | null {
  const cells = state.pieces.filter(
    (p) => !p.dead && !avoid.has(p.id) && p.kind !== 'rainbow' && p.color === color,
  )
  if (cells.length < min) return null
  const ids = new Set(cells.map((p) => p.id))
  const farthest = (src: Piece) => {
    const q = [src]
    const parent = new Map<number, number | null>([[src.id, null]])
    let last = src
    for (let i = 0; i < q.length; i++) {
      last = q[i]
      for (const n of orthoLive(state, last, ids)) {
        if (parent.has(n.id)) continue
        parent.set(n.id, last.id)
        q.push(n)
      }
    }
    return { last, parent }
  }
  const a = farthest(cells[0])
  const b = farthest(a.last)
  const by = new Map(cells.map((p) => [p.id, p]))
  const path: Piece[] = []
  let id: number | null = b.last.id
  while (id != null) {
    const piece = by.get(id)
    if (!piece) break
    path.push(piece)
    const prev = b.parent.get(id)
    id = prev === undefined ? null : prev
  }
  path.reverse()
  return path.length >= min ? path : null
}

function takeIds(state: GameState, ids: number[], avoid: Set<number>): Piece[] | null {
  const path: Piece[] = []
  for (const id of ids) {
    const p = byId(state, id)
    if (!p || p.dead || avoid.has(id)) return null
    path.push(p)
  }
  return path
}

function validDragPath(path: Piece[]): boolean {
  for (let i = 1; i < path.length; i++) {
    if (!canAppend(path.slice(0, i), path[i])) return false
  }
  return true
}

export function findPath(
  state: GameState,
  min: number,
  avoid: number[] = [],
  prefer?: 'top' | 'bottom',
): Piece[] | null {
  const avoidSet = new Set(avoid)
  if (prefer === 'bottom' && state.guideBottom) {
    const path = takeIds(state, state.guideBottom, avoidSet)
    if (path && path.length >= min && validDragPath(path)) return path
  }
  if (prefer !== 'bottom' && state.guide) {
    const path = takeIds(state, state.guide, avoidSet)
    if (path && path.length >= min && validDragPath(path)) return path
  }
  let best: Piece[] | null = null
  for (let color = 0; color < activeColorCount(state); color++) {
    const path = diameterPath(state, color, min, avoidSet)
    if (!path) continue
    if (!best) {
      best = path
      continue
    }
    const ar = path.reduce((s, p) => s + p.r, 0) / path.length
    const br = best.reduce((s, p) => s + p.r, 0) / best.length
    if (prefer === 'bottom' && ar > br) best = path
    else if (prefer === 'top' && ar < br) best = path
    else if (!prefer && path.length > best.length) best = path
  }
  return best
}

/** Longest valid drag path that ends on a given cell (for QA edge-tip drags). */
export function findPathEndingAt(state: GameState, min: number, endC: number, endR: number): Piece[] | null {
  const end = at(state, endC, endR)
  if (!end || end.dead) return null
  let best: Piece[] | null = null
  for (let color = 0; color < activeColorCount(state); color++) {
    const path = diameterPath(state, color, min, new Set())
    if (!path) continue
    for (const cand of [path, [...path].reverse()] as Piece[][]) {
      if (!validDragPath(cand)) continue
      const tip = cand[cand.length - 1]!
      if (tip.c === endC && tip.r === endR && cand.length >= min) {
        if (!best || cand.length > best.length) best = cand
      }
    }
  }
  return best
}

function setCell(state: GameState, c: number, r: number, color: number, kind: Kind): Piece {
  const p = state.pieces.find((q) => !q.dead && q.c === c && q.r === r)
  if (p) {
    p.color = color
    p.kind = kind
    return p
  }
  const made = makePiece(state, c, r, color, kind)
  state.pieces.push(made)
  return made
}

function paintSnake(state: GameState) {
  const shape = [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [4, 1],
  ]
  const wide = Math.min(5, state.cols)
  const c0 = Math.max(0, Math.floor((state.cols - wide) / 2))
  const r0 = Math.min(state.rows - 2, Math.max(0, Math.floor(state.rows / 2) - 1))
  const ids: number[] = []
  for (const [dc, dr] of shape) {
    if (c0 + dc >= state.cols || r0 + dr >= state.rows) continue
    ids.push(setCell(state, c0 + dc, r0 + dr, 2, 'bonbon').id)
  }
  state.guide = ids.length >= 4 ? ids : null
}

function paintBottom(state: GameState) {
  const len = Math.min(3, state.cols)
  const ids: number[] = []
  const r = state.rows - 1
  const n = activeColorCount(state)
  for (let c = 0; c < len; c++) ids.push(setCell(state, c, r, c % n, 'bonbon').id)
  state.guideBottom = ids
}

function fillBoard(state: GameState) {
  const { cols, rows } = state
  if (lineSeed(state.seed)) {
    const colors: number[][] = []
    for (let r = 0; r < rows; r++) {
      colors[r] = []
      for (let c = 0; c < cols; c++) colors[r][c] = Math.floor(state.rng() * 5)
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) state.pieces.push(makePiece(state, c, r, colors[r][c], 'bonbon'))
    }
    paintSnake(state)
    paintBottom(state)
    return
  }
  const nColors = activeColorCount(state)
  let colors: number[][] = []
  let tries = 0
  while (tries++ < 48) {
    colors = []
    for (let r = 0; r < rows; r++) {
      colors[r] = []
      for (let c = 0; c < cols; c++) colors[r][c] = Math.floor(state.rng() * nColors)
    }
    for (let pass = 0; pass < 1; pass++) {
      const next = colors.map((row) => row.slice())
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (state.rng() > 0.38) continue
          const opts = new Set<number>([colors[r][c]])
          for (const [dc, dr] of DIRS) {
            const rr = r + dr
            const cc = c + dc
            if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
            opts.add(colors[rr][cc])
          }
          const choices = [...opts]
          let pick = colors[r][c]
          let bestSize = 999
          for (const k of choices) {
            next[r][c] = k
            const size = gridMaxCluster(next, cols, rows)
            if (size < bestSize) {
              bestSize = size
              pick = k
            }
          }
          next[r][c] = pick
        }
      }
      for (let r = 0; r < rows; r++) colors[r] = next[r]
    }
    const max = gridMaxCluster(colors, cols, rows)
    const chains = gridChainCount(colors, cols, rows, 3)
    const long = gridChainCount(colors, cols, rows, 7)
    if (max <= 7 && max >= 4 && chains >= 3 && (long >= 1 || tries >= 36)) break
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) state.pieces.push(makePiece(state, c, r, colors[r][c], 'bonbon'))
  }
  let guard = 0
  while (!findPath(state, 3) && guard++ < 8) {
    const color = guard % nColors
    const row = Math.min(rows - 1, 1 + (guard % Math.max(1, rows - 2)))
    const len = Math.min(4, cols)
    const ids: number[] = []
    for (let c = 0; c < len; c++) ids.push(setCell(state, c, row, color, 'bonbon').id)
    state.guide = ids.length >= 3 ? ids : state.guide
    const row2 = rows - 1
    const ids2: number[] = []
    for (let c = 0; c < Math.min(3, cols); c++) ids2.push(setCell(state, c, row2, (color + 1) % nColors, 'bonbon').id)
    state.guideBottom = ids2
  }
}

function blank(seed: string, cols: number, rows: number, mode: Mode): GameState {
  return {
    cols,
    rows,
    pieces: [],
    nextId: 1,
    rng: mulberry32(hashSeed(`${seed}:${cols}x${rows}`)),
    seed,
    mode,
    phase: 'idle',
    drag: [],
    queue: [],
    fired: 0,
    resolveMs: 0,
    elapsed: 0,
    hitstopLeft: 0,
    hitstopTotal: 0,
    hitstopPending: false,
    fallStart: 0,
    timeLeft: ROUND_MS,
    score: 0,
    combo: 1,
    lastSettleAt: -10_000,
    simMs: 0,
    settleMs: 0,
    popAt: [],
    settled: true,
    inputLocked: false,
    special: null,
    specialAt: null,
    chainColor: 0,
    lastChainLen: 0,
    gained: 0,
    guide: null,
    guideBottom: null,
    showIds: [],
    dryLongChain: 0,
    colorCap: 0,
    adventureId: 0,
    movesLeft: -1,
    track: {
      clearedByColor: [0, 0, 0, 0, 0, 0],
      bombsPopped: 0,
      iceBroken: 0,
      chocoCleared: 0,
      jellyUnlocked: 0,
      movesUsed: 0,
      starbursts: 0,
    },
  }
}

function clusterOf(
  state: GameState,
  startC: number,
  startR: number,
  colors: number[][],
): number {
  const color = colors[startR]?.[startC]
  if (color === undefined || color < 0) return 0
  const seen = new Set<string>()
  const q: [number, number][] = [[startC, startR]]
  seen.add(`${startC},${startR}`)
  let n = 0
  for (let i = 0; i < q.length; i++) {
    const [cc, rr] = q[i]!
    n += 1
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc
      const nr = rr + dr
      if (nc < 0 || nr < 0 || nc >= state.cols || nr >= state.rows) continue
      const k = `${nc},${nr}`
      if (seen.has(k) || colors[nr]![nc] !== color) continue
      seen.add(k)
      q.push([nc, nr])
    }
  }
  return n
}

export function softenClusters(state: GameState, max = 7): void {
  const keep = new Set<number>([...(state.guide ?? [])])
  const nColors = () => activeColorCount(state)
  let guard = 0
  while (maxSameColorCluster(state) > max && guard++ < 500) {
    const colors: number[][] = []
    for (let r = 0; r < state.rows; r++) {
      colors[r] = []
      for (let c = 0; c < state.cols; c++) {
        const p = at(state, c, r)
        colors[r][c] = p && !p.dead ? p.color : -1
      }
    }
    let hot: Piece | null = null
    let hotSize = max
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (colors[r][c]! < 0) continue
        const p = at(state, c, r)!
        if (keep.has(p.id) || p.kind !== 'bonbon') continue
        const size = clusterOf(state, c, r, colors)
        if (size > hotSize) {
          hotSize = size
          hot = p
        }
      }
    }
  if (!hot) {
      const live = state.pieces.filter((p) => !p.dead && p.kind === 'bonbon' && !keep.has(p.id))
      if (!live.length) break
      hot = live[Math.floor(state.rng() * live.length)]
    }
    const was = hot.color
    let picked = was
    for (let t = 0; t < 16; t++) {
      const tryC = Math.floor(state.rng() * nColors())
      if (tryC === was) continue
      hot.color = tryC
      if (maxSameColorCluster(state) <= max) {
        picked = tryC
        break
      }
    }
    if (picked === was) {
      hot.color = (was + 1 + Math.floor(state.rng() * (nColors() - 1))) % nColors()
    }
  }
}

export function createGame(seed: string, cols: number, rows: number, mode: Mode): GameState {
  const state = blank(seed, cols, rows, mode)
  fillBoard(state)
  softenClusters(state, 7)
  let guard = 0
  while (maxSameColorCluster(state) > 7 && guard++ < 120) softenClusters(state, 7)
  if (!findPath(state, 7)) {
    boostChains(state)
    if (!findPath(state, 7)) boostChains(state)
    let fix = 0
    while (maxSameColorCluster(state) > 7 && fix++ < 80) softenClusters(state, 7)
  }
  if (!findPath(state, 2)) {
    let fix2 = 0
    while (!findPath(state, 2) && fix2++ < 48) softenClusters(state, 6)
  }
  if (lineSeed(state.seed) && !findPath(state, 2)) {
    const r = state.rows - 1
    const n = Math.min(3, state.cols)
    for (let c = 0; c < n; c++) {
      const p = at(state, c, r)
      if (p) p.color = 0
    }
    state.guideBottom = state.pieces
      .filter((p) => !p.dead && p.r === r && p.c < n)
      .sort((a, b) => a.c - b.c)
      .map((p) => p.id)
  }
  rebalanceColorShare(state, 0.3)
  if (!findPath(state, 3)) {
    boostChains(state)
    rebalanceColorShare(state, 0.3)
  }
  for (let fix = 0; fix < 56 && !findPath(state, 3); fix++) softenClusters(state, 6)
  if (!findPath(state, 3)) {
    boostChains(state)
    softenClusters(state, 6)
  }
  for (let fix = 0; fix < 36 && (!findPath(state, 3) || maxColorShare(state) > 0.3); fix++) {
    if (maxColorShare(state) > 0.3) rebalanceColorShare(state, 0.3)
    else softenClusters(state, 6)
  }
  if (!findPath(state, 3)) {
    for (let i = 0; i < 12 && !findPath(state, 3); i++) {
      boostChains(state)
      softenClusters(state, 7)
    }
  }
  if (maxColorShare(state) > 0.3) rebalanceColorShare(state, 0.3)
  return state
}

/** Test boards. Tokens: `.` empty, `0-4` bonbon, `R` rainbow, `B0`-`B4` bomb. */
export function loadGrid(lines: string[], seed = 'grid'): GameState {
  const rows = lines.map((line) => line.trim().split(/\s+/))
  const state = blank(seed, rows[0].length, rows.length, 'timed')
  rows.forEach((toks, r) => {
    toks.forEach((tok, c) => {
      if (tok === '.') return
      if (tok === 'R') state.pieces.push(makePiece(state, c, r, 0, 'rainbow'))
      else if (tok.startsWith('B')) state.pieces.push(makePiece(state, c, r, Number(tok[1] ?? 0), 'bomb'))
      else state.pieces.push(makePiece(state, c, r, Number(tok), 'bonbon'))
    })
  })
  return state
}

export function gridSignature(state: GameState): string {
  const lines: string[] = []
  for (let r = 0; r < state.rows; r++) {
    let line = ''
    for (let c = 0; c < state.cols; c++) {
      const p = at(state, c, r)
      line += p && !p.dead ? `${p.kind[0]}${p.color}` : '.'
    }
    lines.push(line)
  }
  return lines.join('|')
}

/** Boot-only line seed (board not yet shown). */
function boostChains(state: GameState) {
  if (!lineSeed(state.seed) && state.rng() > 0.08) return
  if (lineSeed(state.seed) && state.rng() > 0.42) return
  const n = activeColorCount(state)
  const color = state.chainColor >= 0 ? state.chainColor : Math.floor(state.rng() * n)
  const len = 6 + Math.floor(state.rng() * 3)
  const vert = state.rng() < 0.55
  const c0 = Math.floor(state.rng() * state.cols)
  const r0 = Math.floor(state.rng() * Math.max(1, state.rows - len))
  for (let i = 0; i < len; i++) {
    const c = vert ? c0 : Math.min(state.cols - 1, c0 + i)
    const r = vert ? Math.min(state.rows - 1, r0 + i) : r0
    const p = at(state, c, r)
    if (!p || p.dead) continue
    p.color = color
    p.kind = 'bonbon'
  }
}

function beginFall(state: GameState) {
  const live = state.pieces.filter((p) => !p.dead)
  const dead = state.pieces.filter((p) => p.dead)
  const spawned: Piece[] = []
  for (let c = 0; c < state.cols; c++) {
    const col = live.filter((p) => p.c === c).sort((a, b) => a.r - b.r)
    const empty = state.rows - col.length
    for (let i = 0; i < col.length; i++) {
      const p = col[i]
      const dest = i + empty
      p.fallFrom = p.r
      p.fallTo = dest
      p.r = dest
      p.fallT = p.fallFrom === dest ? 1 : 0
    }
    const grid: number[][] = []
    for (let r = 0; r < state.rows; r++) {
      grid[r] = []
      for (let cc = 0; cc < state.cols; cc++) {
        const cell = at(state, cc, r)
        grid[r][cc] = cell && !cell.dead ? cell.color : Math.floor(state.rng() * activeColorCount(state))
      }
    }
    for (let i = 0; i < empty; i++) {
      const color = pickSpawnColor(state, grid, c, i)
      grid[i][c] = color
      const p = makePiece(state, c, i, color, 'bonbon')
      p.fallFrom = i
      p.fallTo = i
      p.r = i
      p.fallT = -1
      p.spawnT = -2
      spawned.push(p)
    }
  }
  const dryBoost = state.dryLongChain >= 8
  if (
    spawned.length &&
    dryBoost &&
    state.chainColor >= 0 &&
    colorShareLive(state, state.chainColor) < 0.28 &&
    state.rng() < 0.35
  ) {
    const byCol = new Map<number, Piece[]>()
    for (const p of spawned) {
      if (!byCol.has(p.c)) byCol.set(p.c, [])
      byCol.get(p.c)!.push(p)
    }
    let tallest: Piece[] = []
    for (const col of byCol.values()) if (col.length > tallest.length) tallest = col
    tallest.sort((a, b) => a.r - b.r)
    const run = Math.min(tallest.length, 3)
    for (let i = 0; i < run; i++) tallest[i]!.color = state.chainColor
  }
  state.pieces = [...live, ...spawned, ...dead]
  const liveSpecials = state.pieces.filter(
    (p) => !p.dead && (p.kind === 'bomb' || p.kind === 'rainbow' || p.kind === 'starburst'),
  ).length
  if (state.special && state.specialAt && liveSpecials < 2) {
    let target = at(state, state.specialAt.c, state.specialAt.r)
    if (!target || target.dead) {
      const col = state.pieces.filter((p) => !p.dead && p.c === state.specialAt!.c)
      target = col.sort((a, b) => a.r - b.r)[0]
    }
    if (target) {
      target.kind = state.special === 'rainbow' ? 'rainbow' : state.special === 'starburst' ? 'starburst' : 'bomb'
      if (target.kind === 'bomb' || target.kind === 'starburst') target.color = state.chainColor
    }
    state.special = null
    state.specialAt = null
  } else if (state.special) {
    state.special = null
    state.specialAt = null
  }
}

export function release(state: GameState): number[] {
  const path = state.drag.map((id) => byId(state, id)).filter((p): p is Piece => !!p && !p.dead)
  state.drag = []
  if (path.length < 2) {
    state.showIds = []
    state.settled = state.phase === 'idle'
    return []
  }
  for (let i = 1; i < path.length; i++) {
    if (!canAppend(path.slice(0, i), path[i])) return []
  }
  let clears = collectClears(state.pieces, path)
  const finalClears: Piece[] = []
  for (const p of clears) {
    if ((p.kind === 'ice' || p.kind === 'sleepy') && p.hits > 1) {
      p.hits -= 1
      if (p.kind === 'ice') state.track.iceBroken += 1
      if (p.hits <= 0) finalClears.push(p)
      else if (p.kind === 'ice' && p.hits === 1) p.kind = 'bonbon'
      continue
    }
    if (p.kind === 'choco') state.track.chocoCleared += 1
    if (p.kind === 'bomb') state.track.bombsPopped += 1
    if (p.kind === 'starburst') state.track.starbursts += 1
    if (p.kind === 'bonbon' || p.kind === 'jelly' || p.kind === 'ice') {
      state.track.clearedByColor[p.color] = (state.track.clearedByColor[p.color] ?? 0) + 1
    }
    finalClears.push(p)
  }
  if (state.mode === 'adventure') {
    state.track.movesUsed += 1
    if (state.movesLeft > 0) state.movesLeft -= 1
  }
  clears = finalClears
  if (!clears.length) {
    state.phase = 'idle'
    state.settled = true
    state.showIds = []
    state.lastChainLen = path.length
    return []
  }
  const n = clears.length
  const bomb = clears.find((p) => p.kind === 'bomb' || p.kind === 'starburst')
  const big = path.length >= 6 || n >= 6
  if (bomb) {
    state.queue = clears
      .map((p) => ({
        id: p.id,
        at: (Math.abs(p.c - bomb.c) + Math.abs(p.r - bomb.r)) * POP_STAGGER_MS + (p.id === bomb.id ? 0 : POP_STAGGER_MS * 0.6),
      }))
      .sort((a, b) => a.at - b.at)
  } else {
    state.queue = clears.map((p, i) => ({
      id: p.id,
      at: i === 0 ? 0 : i * POP_STAGGER_MS + ((i % 3) * 5),
    }))
  }
  const lastAt = state.queue.length ? state.queue[state.queue.length - 1]!.at : 0
  state.showIds = []
  state.specialAt = path.length ? { c: path[path.length - 1]!.c, r: path[path.length - 1]!.r } : null
  state.fired = 0
  state.resolveMs = 0
  state.elapsed = 0
  state.phase = 'clearing'
  state.settled = false
  state.fallStart = lastAt + FALL_DELAY
  const starOk = state.mode !== 'adventure' || state.adventureId >= 25
  const starRoll = starOk && path.length >= BOMB_AT && path.length < RAINBOW_AT && state.rng() < 0.18
  const wantSpecial = path.length >= RAINBOW_AT ? 'rainbow' : starRoll ? 'starburst' : path.length >= BOMB_AT ? 'bomb' : null
  const onBoard = state.pieces.filter((p) => !p.dead && (p.kind === 'bomb' || p.kind === 'rainbow')).length
  state.special = wantSpecial && onBoard < 2 ? wantSpecial : null
  state.hitstopTotal = big ? HITSTOP_MS : 0
  state.hitstopLeft = 0
  state.hitstopPending = big
  state.chainColor = pathColor(path) ?? path[0].color
  state.lastChainLen = path.length
  const comboFresh = state.simMs - state.lastSettleAt > COMBO_WINDOW_MS || state.score === 0
  state.combo = comboFresh ? 1 : Math.min(COMBO_CAP, state.combo + 1)
  let chainPts = 0
  for (let i = 0; i < path.length; i++) chainPts += 4 * (i + 1)
  let pts = chainPts
  if (path.length >= 7) pts += Math.round(chainPts * 0.25)
  if (clears.some((p) => p.kind === 'bomb')) pts += 45
  if (clears.some((p) => p.kind === 'rainbow')) pts += 120
  state.gained = Math.round(pts * state.combo)
  state.score += state.gained
  state.popAt = []
  const kick = state.queue[0]
  if (!kick) return []
  const first = byId(state, kick.id)
  if (!first) return []
  first.dead = true
  first.popT = 0
  state.fired = 1
  state.popAt.push(0)
  return [first.id]
}

export function step(state: GameState, dt: number): number[] {
  if (dt < 0) dt = 0
  const popped: number[] = []
  if (state.phase === 'idle') {
    state.simMs += dt
    return popped
  }
  state.simMs += dt
  state.elapsed += dt
  for (const p of state.pieces) {
    if (p.popT >= 0 && p.popT < POP_MS) p.popT += dt
  }
  if (state.hitstopPending && state.phase === 'clearing' && state.queue.length > 0) {
    const head = byId(state, state.queue[0]!.id)
    if (head && head.popT >= POP_GROW_MS + POP_SQUASH_MS) {
      state.hitstopPending = false
      state.hitstopLeft = state.hitstopTotal
    }
  }
  const stall = state.hitstopLeft > 0
  if (stall) state.hitstopLeft = Math.max(0, state.hitstopLeft - dt)
  if (!stall) state.resolveMs += dt
  while (state.fired < state.queue.length && state.queue[state.fired].at <= state.resolveMs + 1e-4) {
    const id = state.queue[state.fired].id
    state.fired += 1
    const p = byId(state, id)
    if (!p || p.dead) continue
    p.dead = true
    p.popT = 0
    state.popAt.push(state.resolveMs)
    popped.push(id)
  }
  if (state.phase === 'clearing' && state.resolveMs >= state.fallStart - 1e-4 && state.fired >= state.queue.length) {
    beginFall(state)
    state.phase = 'falling'
  }
  if (state.phase === 'falling') {
    let pending = false
    for (const p of state.pieces) {
      if (p.dead) continue
      if (p.spawnT === -2) {
        const colBusy = state.pieces.some(
          (q) => !q.dead && q.c === p.c && q.id !== p.id && q.fallT >= 0 && q.fallT < 1,
        )
        if (!colBusy) p.spawnT = 0
      }
      if (p.spawnT >= 0 && p.spawnT < 1) {
        p.spawnT = Math.min(1, p.spawnT + dt / SPAWN_MS)
        if (p.spawnT < 1) pending = true
        else if (p.landT < 0) p.landT = 0
      }
      if (p.fallT >= 0 && p.fallT < 1) {
        p.fallT = Math.min(1, p.fallT + dt / FALL_MS)
        if (p.fallT < 1) pending = true
        else if (p.landT < 0) p.landT = 0
      }
      if (p.landT >= 0 && p.landT < 180) p.landT += dt
    }
    if (!pending) {
      state.pieces = state.pieces.filter((p) => !p.dead)
      for (const p of state.pieces) {
        p.fallT = -1
        p.landT = -1
        p.spawnT = -1
      }
      state.lastChainLen = 0
      state.phase = 'idle'
      state.settled = true
      state.settleMs = state.elapsed
      state.lastSettleAt = state.simMs
      state.showIds = []
      if (findPath(state, 6)) state.dryLongChain = 0
      else state.dryLongChain += 1
    }
  }
  return popped
}

/** ponytail: snap the clear on the next press. Per-piece queues if a snap ever feels unfair. */
export function rush(state: GameState): number[] {
  state.hitstopLeft = 0
  const ids: number[] = []
  let guard = 0
  while (state.phase !== 'idle' && guard++ < 80) ids.push(...step(state, 50))
  state.settled = state.phase === 'idle'
  return ids
}

export function mayBeginChain(state: GameState): boolean {
  if (state.inputLocked) return false
  if (state.mode === 'cuddle' || state.mode === 'adventure') {
    if (state.mode === 'adventure' && state.movesLeft === 0) return false
    return true
  }
  return state.timeLeft > 0
}

export function roundOver(state: GameState): boolean {
  if (state.phase !== 'idle' || state.drag.length > 0) return false
  if (state.mode === 'cuddle') return false
  if (state.mode === 'adventure') return state.movesLeft <= 0
  return state.timeLeft <= 0
}

export function playToIdle(state: GameState, maxSteps = 240): void {
  let guard = 0
  while (state.phase !== 'idle' && guard++ < maxSteps) step(state, 16)
}

function pathPickScore(state: GameState, path: Piece[], comboBias: boolean): number {
  const inCombo = state.score > 0 && state.simMs - state.lastSettleAt < COMBO_WINDOW_MS
  let s = path.length * 10
  if (path.length >= 7) s += 120
  else if (path.length >= 6) s += 55
  else if (path.length >= 5) s += 28
  if (comboBias) {
    if (path.length >= 5) s += inCombo ? 85 : 18
    if (path.length >= 3 && inCombo) s += 35
    if (inCombo && path.length >= BOMB_AT) s += 80
    if (inCombo && path.length >= RAINBOW_AT) s += 110
    if (path.some((p) => p.kind === 'bomb')) s += 55
    if (path.some((p) => p.kind === 'rainbow')) s += 90
  }
  return s
}

function bestPath(state: GameState, comboBias: boolean): Piece[] | null {
  const inCombo = state.score > 0 && state.simMs - state.lastSettleAt < COMBO_WINDOW_MS
  if (!comboBias) {
    let best: Piece[] | null = null
    for (let min = 2; min <= 14; min++) {
      const p = findPath(state, min)
      if (p && (!best || p.length > best.length)) best = p
    }
    return best
  }
  if (inCombo) {
    let best: Piece[] | null = null
    for (let min = BOMB_AT; min <= 14; min++) {
      const p = findPath(state, min)
      if (p && (!best || p.length > best.length)) best = p
    }
    if (best) return best
  }
  let best: Piece[] | null = null
  let bestScore = -1
  for (let min = 2; min <= 14; min++) {
    const p = findPath(state, min)
    if (!p) continue
    const sc = pathPickScore(state, p, true)
    if (!best || sc > bestScore || (sc === bestScore && p.length > best.length)) {
      bestScore = sc
      best = p
    }
  }
  return best
}

export function comboGreedySession(
  state: GameState,
  moves = 60,
): { score: number; pops7: number; maxChain: number } {
  let pops7 = 0
  let maxChain = 0
  for (let m = 0; m < moves; m++) {
    if (!mayBeginChain(state)) break
    const best = bestPath(state, true)
    if (!best || best.length < 2) break
    maxChain = Math.max(maxChain, best.length)
    state.drag = best.map((p) => p.id)
    release(state)
    if (best.length >= 7) pops7 += 1
    playToIdle(state)
  }
  return { score: state.score, pops7, maxChain }
}

/** Greedy bot for one timed round (sim clock). */
export function comboGreedyTimedRound(
  state: GameState,
  msPerMove = 720,
): { score: number; moves: number; maxChain: number } {
  let moves = 0
  let maxChain = 0
  while (mayBeginChain(state) && moves < 120) {
    const best = bestPath(state, true)
    if (!best || best.length < 2) {
      state.timeLeft = Math.max(0, state.timeLeft - msPerMove)
      moves += 1
      continue
    }
    maxChain = Math.max(maxChain, best.length)
    state.drag = best.map((p) => p.id)
    release(state)
    playToIdle(state)
    state.timeLeft = Math.max(0, state.timeLeft - msPerMove)
    moves += 1
  }
  while (state.phase !== 'idle') step(state, 40)
  return { score: state.score, moves, maxChain }
}

export function greedySession(
  state: GameState,
  moves = 60,
): { score: number; pops7: number; maxChain: number } {
  let pops7 = 0
  let maxChain = 0
  for (let m = 0; m < moves; m++) {
    if (!mayBeginChain(state)) break
    const best = bestPath(state, false)
    if (!best || best.length < 2) break
    maxChain = Math.max(maxChain, best.length)
    state.drag = best.map((p) => p.id)
    release(state)
    if (best.length >= 7) pops7 += 1
    playToIdle(state)
  }
  return { score: state.score, pops7, maxChain }
}

/** Greedy bot for one timed round (sim clock). */
export function greedyTimedRound(
  state: GameState,
  msPerMove = 720,
): { score: number; moves: number; maxChain: number } {
  let moves = 0
  let maxChain = 0
  while (mayBeginChain(state) && moves < 120) {
    const best = bestPath(state, false)
    if (!best || best.length < 2) {
      state.timeLeft = Math.max(0, state.timeLeft - msPerMove)
      moves += 1
      continue
    }
    maxChain = Math.max(maxChain, best.length)
    state.drag = best.map((p) => p.id)
    release(state)
    playToIdle(state)
    state.timeLeft = Math.max(0, state.timeLeft - msPerMove)
    moves += 1
  }
  while (state.phase !== 'idle') step(state, 40)
  return { score: state.score, moves, maxChain }
}

export function extendDrag(state: GameState, id: number): boolean {
  const piece = byId(state, id)
  if (!piece || piece.dead) return false
  if (state.drag.length === 0) {
    state.drag = [id]
    return true
  }
  if (state.drag.length >= 2 && id === state.drag[state.drag.length - 2]) {
    state.drag.pop()
    return true
  }
  if (id === state.drag[state.drag.length - 1]) return true
  const path = state.drag.map((pid) => byId(state, pid)).filter((p): p is Piece => !!p)
  if (!canAppend(path, piece)) return false
  state.drag.push(id)
  return true
}

export function createAdventureGame(level: AdventureLevelDef, cols: number, rows: number): GameState {
  const state = createGame(level.seed, cols, rows, 'adventure')
  state.colorCap = level.colorCount
  state.adventureId = level.id
  state.movesLeft = level.moves
  state.timeLeft = ROUND_MS
  const cap = level.colorCount
  for (const p of state.pieces) {
    if (p.color >= cap) p.color = p.color % cap
    if (p.kind === 'bonbon' && p.color >= cap) p.color = p.color % cap
  }
  const visibleRows = Math.min(4, rows)
  const spots: { c: number; r: number }[] = []
  for (let r = 0; r < visibleRows; r++) {
    for (let c = 0; c < cols; c++) spots.push({ c, r })
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1))
    ;[spots[i], spots[j]] = [spots[j]!, spots[i]!]
  }
  let idx = 0
  const takeSpot = () => spots[idx++] ?? { c: idx % cols, r: 0 }
  const placeAt = (kind: Kind, color: number, spot: { c: number; r: number }, locked = false) => {
    const p = at(state, spot.c, spot.r)
    if (!p || p.dead) return
    p.kind = kind
    p.color = color % cap
    p.hits = kind === 'ice' ? 2 : kind === 'sleepy' ? 3 : 0
    p.locked = locked || kind === 'jelly'
  }
  const iceN = level.blockers.ice ?? 0
  for (let i = 0; i < iceN; i++) {
    placeAt('ice', i % cap, takeSpot())
  }
  const jellyN = level.blockers.jelly ?? 0
  for (let i = 0; i < jellyN; i++) {
    placeAt('jelly', (i + 1) % cap, takeSpot(), true)
  }
  const chocoN = level.blockers.choco ?? 0
  for (let i = 0; i < chocoN; i++) {
    placeAt('choco', 0, takeSpot())
  }
  const sleepyN = level.blockers.sleepy ?? 0
  for (let i = 0; i < sleepyN; i++) {
    placeAt('sleepy', (i + 2) % cap, takeSpot())
  }
  const burstN = level.blockers.starburst ?? 0
  for (let i = 0; i < burstN; i++) {
    placeAt('starburst', (i + 3) % cap, takeSpot())
  }
  softenClusters(state, 6)
  return state
}

/** QA: measure how often refills match neighbour colour vs fair baseline. */
export function probeRefillBias(samples = 200, seed = 'refill-fair'): { matchRate: number; baseline: number } {
  const state = createGame(seed, 7, 10, 'timed')
  state.colorCap = 5
  let matches = 0
  let trials = 0
  const n = activeColorCount(state)
  const colors: number[][] = []
  for (let r = 0; r < state.rows; r++) {
    colors[r] = []
    for (let c = 0; c < state.cols; c++) {
      const p = at(state, c, r)
      colors[r]![c] = p && !p.dead ? p.color : Math.floor(state.rng() * n)
    }
  }
  state.lastChainLen = 0
  state.chainColor = -1
  state.dryLongChain = 0
  for (let t = 0; t < samples; t++) {
    const c = Math.floor(state.rng() * state.cols)
    const r = 0
    const below = r + 1 < state.rows ? colors[r + 1]![c]! : -1
    const side = c > 0 ? colors[r]![c - 1]! : -1
    const buddy = below >= 0 ? below : side
    const picked = pickSpawnColor(state, colors, c, r)
    colors[r]![c] = picked
    if (buddy >= 0 && buddy < n) {
      trials += 1
      if (picked === buddy) matches += 1
    }
  }
  const matchRate = trials ? matches / trials : 0
  const baseline = 1 / n
  return { matchRate, baseline }
}
