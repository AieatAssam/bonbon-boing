export const ROUND_MS = 60_000
export const HITSTOP_MS = 72
export const POP_MS = 120
export const FALL_MS = 220
export const FALL_DELAY = 70
export const STAGGER_CAP = 32
export const STAGGER_BUDGET = 360
export const BOMB_AT = 5
export const RAINBOW_AT = 8

export type Mode = 'timed' | 'cuddle' | 'daily'
export type Kind = 'bonbon' | 'bomb' | 'rainbow'

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
  fallStart: number
  timeLeft: number
  score: number
  combo: number
  lastSettleAt: number
  simMs: number
  settleMs: number
  popAt: number[]
  settled: boolean
  /** Always false. A new press rushes the clear instead of ignoring the finger. */
  inputLocked: false
  special: 'bomb' | 'rainbow' | null
  chainColor: number
  gained: number
  guide: number[] | null
  guideBottom: number[] | null
  showIds: number[]
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

function makePiece(state: GameState, c: number, r: number, color: number, kind: Kind): Piece {
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
  if (path.some((p) => p.id === next.id)) return false
  const last = path[path.length - 1]
  if (!last) return true
  if (Math.abs(last.c - next.c) + Math.abs(last.r - next.r) !== 1) return false
  if (next.kind === 'rainbow') return true
  const color = pathColor(path)
  if (color === null) return true
  if (last.kind === 'rainbow') return next.color === color
  return next.color === color && (next.kind === 'bonbon' || next.kind === 'bomb')
}

export function visualRow(p: Piece): number {
  if (p.fallT < 0 || p.fallT >= 1) return p.r
  const t = 1 - (1 - p.fallT) ** 3
  return p.fallFrom + (p.fallTo - p.fallFrom) * t
}

export function collectClears(pieces: Piece[], path: Piece[]): Piece[] {
  const live = pieces.filter((p) => !p.dead)
  const set = new Set(path.filter((p) => !p.dead))
  const color = pathColor(path)
  for (const p of path) {
    if (p.kind !== 'bomb') continue
    for (const q of live) {
      if (Math.abs(q.c - p.c) <= 1 && Math.abs(q.r - p.r) <= 1) set.add(q)
    }
  }
  if (path.some((p) => p.kind === 'rainbow') && color !== null) {
    for (const q of live) if (q.kind !== 'rainbow' && q.color === color) set.add(q)
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

export function findPath(
  state: GameState,
  min: number,
  avoid: number[] = [],
  prefer?: 'top' | 'bottom',
): Piece[] | null {
  const avoidSet = new Set(avoid)
  if (prefer === 'bottom' && state.guideBottom) {
    const path = takeIds(state, state.guideBottom, avoidSet)
    if (path && path.length >= min) return path
  }
  if (prefer !== 'bottom' && state.guide) {
    const path = takeIds(state, state.guide, avoidSet)
    if (path && path.length >= min) return path
  }
  let best: Piece[] | null = null
  for (let color = 0; color < 5; color++) {
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
  for (let c = 0; c < len; c++) ids.push(setCell(state, c, r, 0, 'bonbon').id)
  state.guideBottom = ids
}

function fillBoard(state: GameState) {
  const { cols, rows } = state
  const colors: number[][] = []
  for (let r = 0; r < rows; r++) {
    colors[r] = []
    for (let c = 0; c < cols; c++) colors[r][c] = Math.floor(state.rng() * 5)
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = colors.map((row) => row.slice())
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (state.rng() > 0.5) continue
        const counts = [0, 0, 0, 0, 0]
        counts[colors[r][c]] += 1
        for (const [dc, dr] of DIRS) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
          counts[colors[rr][cc]] += 1
        }
        let best = colors[r][c]
        let n = -1
        for (let k = 0; k < 5; k++) {
          if (counts[k] > n) {
            n = counts[k]
            best = k
          }
        }
        next[r][c] = best
      }
    }
    for (let r = 0; r < rows; r++) colors[r] = next[r]
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) state.pieces.push(makePiece(state, c, r, colors[r][c], 'bonbon'))
  }
  if (lineSeed(state.seed)) {
    paintSnake(state)
    paintBottom(state)
  } else if (!findPath(state, 3)) {
    const ids: number[] = []
    const len = Math.min(4, cols)
    for (let c = 0; c < len; c++) ids.push(setCell(state, c, Math.min(2, rows - 1), 0, 'bonbon').id)
    state.guide = ids
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
    chainColor: 0,
    gained: 0,
    guide: null,
    guideBottom: null,
    showIds: [],
  }
}

export function createGame(seed: string, cols: number, rows: number, mode: Mode): GameState {
  const state = blank(seed, cols, rows, mode)
  fillBoard(state)
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
    for (let i = 0; i < empty; i++) {
      const color = Math.floor(state.rng() * 5)
      const p = makePiece(state, c, i, color, 'bonbon')
      p.fallFrom = i - empty
      p.fallTo = i
      p.r = i
      p.fallT = 0
      spawned.push(p)
    }
  }
  if (state.special && spawned.length > 0) {
    const pick = spawned[Math.floor(state.rng() * spawned.length)]
    if (state.special === 'rainbow') pick.kind = 'rainbow'
    else {
      pick.kind = 'bomb'
      pick.color = state.chainColor
    }
  }
  state.pieces = [...live, ...spawned, ...dead]
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
  const clears = collectClears(state.pieces, path)
  const n = clears.length
  const stag = n <= 1 ? 0 : Math.min(STAGGER_CAP, STAGGER_BUDGET / (n - 1))
  const big = path.length >= BOMB_AT || n >= BOMB_AT
  state.queue = clears.map((p, i) => ({ id: p.id, at: i * stag }))
  state.showIds = clears.map((p) => p.id)
  state.fired = 0
  state.resolveMs = 0
  state.elapsed = 0
  state.phase = 'clearing'
  state.settled = false
  state.fallStart = (n - 1) * stag + FALL_DELAY
  state.special = path.length >= RAINBOW_AT ? 'rainbow' : path.length >= BOMB_AT ? 'bomb' : null
  state.hitstopTotal = big ? HITSTOP_MS : 0
  state.hitstopLeft = state.hitstopTotal
  state.chainColor = pathColor(path) ?? path[0].color
  state.combo = state.simMs - state.lastSettleAt < 1400 && state.score > 0 ? state.combo + 1 : 1
  let pts = 0
  clears.forEach((_, i) => {
    pts += 10 * (i + 1)
  })
  if (clears.some((p) => p.kind === 'bomb')) pts += 80
  if (clears.some((p) => p.kind === 'rainbow')) pts += 200
  state.gained = pts * state.combo
  state.score += state.gained
  state.popAt = []
  const first = clears[0]
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
    if (state.mode !== 'cuddle') state.timeLeft = Math.max(0, state.timeLeft - dt)
    state.simMs += dt
    return popped
  }
  state.simMs += dt
  state.elapsed += dt
  if (state.hitstopLeft > 0) {
    const used = Math.min(dt, state.hitstopLeft)
    state.hitstopLeft -= used
    dt -= used
    if (dt <= 0) return popped
  }
  state.resolveMs += dt
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
  for (const p of state.pieces) {
    if (p.popT >= 0 && p.popT < POP_MS) p.popT += dt
  }
  if (state.phase === 'clearing' && state.resolveMs >= state.fallStart - 1e-4 && state.fired >= state.queue.length) {
    beginFall(state)
    state.phase = 'falling'
  }
  if (state.phase === 'falling') {
    let pending = false
    for (const p of state.pieces) {
      if (p.dead) continue
      if (p.fallT >= 0 && p.fallT < 1) {
        p.fallT = Math.min(1, p.fallT + dt / FALL_MS)
        if (p.fallT < 1) pending = true
      }
    }
    if (!pending) {
      state.pieces = state.pieces.filter((p) => !p.dead)
      for (const p of state.pieces) p.fallT = -1
      state.phase = 'idle'
      state.settled = true
      state.settleMs = state.elapsed
      state.lastSettleAt = state.simMs
      state.showIds = []
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

export function roundOver(state: GameState): boolean {
  return state.mode !== 'cuddle' && state.timeLeft <= 0 && state.phase === 'idle' && state.drag.length === 0
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
