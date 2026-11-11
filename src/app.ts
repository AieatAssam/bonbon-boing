import { boardLayout, titleHeroScale, type Layout } from './layout'
import {
  byId,
  canAppend,
  createGame,
  COMBO_WINDOW_MS,
  dailySeed,
  extendDrag,
  findPath,
  ROUND_MS,
  maxSameColorCluster,
  mayBeginChain,
  pathColor,
  release,
  POP_GROW_MS,
  POP_MS,
  POP_SQUASH_MS,
  POP_VANISH_MS,
  roundOver,
  step,
  visualRow,
  type GameState,
  type Kind,
  type Mode,
  type Piece,
} from './sim'
import { invalidateBgCache, renderScene, spriteMisses, type DrawParticle, type Scene } from './draw'
import { audioCreates, playLink, playPop, setAudioPaused, setAudioPrefs, unlockAudio } from './audio'

type Screen = 'title' | 'play' | 'pause' | 'results'
type Pose = 'idle' | 'chain' | 'pop'

type Save = {
  v: 2
  tut: boolean
  muteSfx: boolean
  muteMusic: boolean
  bestTimed: number
  bestCuddle: number
  dailyBest: number
  dailyDay: string
}

export type ChainCell = { id: number; x: number; y: number; c: number; r: number }

export type Qa = {
  ready: boolean
  screen: Screen
  pose: Pose
  mode: Mode
  seed: string
  score: number
  combo: number
  timeLeft: number
  paused: boolean
  inputLocked: false
  chain: number[]
  D: number
  cols: number
  rows: number
  board: {
    id: number
    c: number
    r: number
    color: number
    kind: Kind
    popping: boolean
    falling: boolean
    x: number
    y: number
    d: number
  }[]
  ghost: boolean
  ghostX: number
  ghostY: number
  hitstopMs: number
  hitstopActive: boolean
  particleCount: number
  particleSig: number
  popStartedAt: number[]
  popWallMs: number
  settled: boolean
  settleMs: number
  muteSfx: boolean
  muteMusic: boolean
  frame: number
  fps: number
  resetFps: () => void
  highlightFrame: number
  spriteMisses: number
  audioCreates: number
  filterOps: number
  maxCluster: number
  ribbonThickness: number
  boardRect: () => { x: number; y: number; w: number; h: number }
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  appendPiece: (id: number) => void
  appendPieces: (ids: number[]) => void
  beginChain: (id: number) => void
  findChain: (min: number, avoid?: number[], prefer?: 'top' | 'bottom') => ChainCell[] | null
  center: (id: number) => { x: number; y: number } | null
  pause: () => void
  resume: () => void
  restart: () => void
  home: () => void
  start: (mode: Mode, seed?: string) => void
  pump: (ms: number) => void
  draw: () => void
  setMute: (sfx: boolean, music: boolean) => void
}

const KEY = 'bonbon-boing-v2'
const COLORS = ['#FF3D8E', '#2FDB8E', '#FFD02A', '#5088FF', '#FF7A28', '#C070FF']
const CONFETTI = ['#FF3D8E', '#FFD02A', '#2FDB8E', '#5088FF', '#FFFFFF', '#FF7A28']

const params = new URLSearchParams(location.search)
const qaMode = params.has('qa')
const tutParam = params.has('tut')
const seedParam = params.get('seed')
const screenParam = params.get('screen')

declare global {
  interface Window {
    __qa: Qa
    __ready: boolean
    __checkOverlaps: () => { overlaps: [string, string][]; offscreen: string[] }
    __checkPlayGeometry: () => { violations: string[] }
    __checkHudBoard: () => { violations: string[] }
  }
}

type Spring = { ox: number; oy: number; vx: number; vy: number }

const ICONS = {
  pause:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="#4A2440"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="#4A2440"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4A2440" d="M4 11 L12 4 L20 11 V20 H15 V14 H9 V20 H4 Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="#FF4F93" d="M8 5 L20 12 L8 19 Z"/></svg>',
  restart:
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2-4.9" fill="none" stroke="#4A2440" stroke-width="2.4" stroke-linecap="round"/><path d="M19 4 V9 H14" fill="none" stroke="#4A2440" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#FF4F93" d="M12 20 C5 14 5 8 9 6.2 C10.8 5.4 12 7 12 7 C12 7 13.2 5.4 15 6.2 C19 8 19 14 12 20 Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#FFB703"/><g stroke="#FFB703" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></g></svg>',
  note: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4A2440" d="M9 18a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-5V6l9-2v9a3 3 0 1 1-2-2.8V6.2L11 7.6V15a3 3 0 0 1-2 2.8z"/></svg>',
  sound:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4A2440" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9c1.2.8 2 2.2 2 3s-.8 2.2-2 3" fill="none" stroke="#4A2440" stroke-width="2" stroke-linecap="round"/></svg>',
  muted:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4A2440" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 10l5 5M21 10l-5 5" stroke="#FF4F93" stroke-width="2" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#FFB703" d="M12 3l2.4 5.6L20 9.2l-4.2 3.8L17 19l-5-3-5 3 1.2-6L4 9.2l5.6-.6z"/></svg>',
}

function loadSave(): Save {
  const blank: Save = {
    v: 2,
    tut: false,
    muteSfx: false,
    muteMusic: false,
    bestTimed: 0,
    bestCuddle: 0,
    dailyBest: 0,
    dailyDay: '',
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blank
    const parsed = JSON.parse(raw) as Partial<Save>
    return { ...blank, ...parsed, v: 2 }
  } catch {
    return blank
  }
}

function storeSave(save: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    /* private mode */
  }
}

export function boot(): void {
  const save = loadSave()
  setAudioPrefs({ sfx: !save.muteSfx, music: !save.muteMusic })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.getElementById('app')
  if (!root) return
  const canvas = document.createElement('canvas')
  canvas.id = 'field'
  document.body.prepend(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx || !root) return
  const gfx = ctx
  const appRoot = root
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;left:0;top:0;padding-top:env(safe-area-inset-top);visibility:hidden'
  document.body.append(probe)

  const title = el('div')
  title.id = 'title'
  const logo = el('h1', 'logo title-logo ui')
  logo.dataset.nozoom = '1'
  logo.textContent = 'Bonbon Boing!'
  const titleBest = el('p', 'title-best ui')
  const titleCorner = el('div', 'title-corner')
  const dock = el('div', 'dock')
  title.append(logo, titleBest, dock)
  const hud = el('div')
  hud.id = 'hud'
  const hudLeft = el('div', 'hud-side')
  const hudMid = el('div', 'hud-mid')
  const scoreEl = el('div', 'ui score')
  const comboEl = el('div', 'combo-badge ui')
  comboEl.hidden = true
  const hudMini = el('div', 'hud-mini ui')
  const timeEl = el('div', 'ui timer ring')
  const pauseMenu = el('div', 'scrim')
  pauseMenu.id = 'pause'
  const pauseCard = el('div', 'pause-card')
  const pauseTitle = el('h2', 'pause-title ui')
  pauseTitle.textContent = 'Paused'
  const pauseMain = el('div', 'pause-row')
  const pauseAudio = el('div', 'pause-audio')
  pauseCard.append(pauseTitle, pauseMain, pauseAudio)
  pauseMenu.append(pauseCard)
  const results = el('div', 'card')
  results.id = 'results'
  const stars = el('div', 'stars')
  const newBestEl = el('p', 'new-best ui')
  newBestEl.hidden = true
  const finalEl = el('div', 'ui final')
  const bestEl = el('div', 'ui best')
  const resultRow = el('div', 'row')
  results.append(stars, newBestEl, finalEl, bestEl, resultRow)
  root.append(title, hud, pauseMenu, results)

  const mk = (parent: HTMLElement, label: string, action: string, icon: string, tiny = false) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `ui icon${tiny ? ' tiny' : ''}`
    b.setAttribute('aria-label', label)
    b.dataset.action = action
    b.innerHTML = icon
    b.addEventListener('click', (ev) => {
      ev.stopPropagation()
      onAction(action)
    })
    parent.append(b)
    return b
  }

  const mkPill = (parent: HTMLElement, label: string, action: string, icon: string, extra = '') => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `ui pill icon ${extra}`.trim()
    b.setAttribute('aria-label', label)
    b.dataset.action = action
    b.innerHTML = `<span class="ico">${icon}</span><span class="lbl">${label}</span>`
    b.addEventListener('click', (ev) => {
      ev.stopPropagation()
      onAction(action)
    })
    parent.append(b)
    return b
  }

  mkPill(dock, 'Play', 'timed', ICONS.play, 'primary')
  mkPill(dock, 'Cuddle', 'cuddle', ICONS.heart, 'relax')
  mkPill(dock, 'Daily', 'daily', ICONS.sun)
  dock.append(titleCorner)
  mk(titleCorner, 'Sound', 'sfx', ICONS.sound, true)
  mk(titleCorner, 'Music', 'music', ICONS.note, true)
  mk(hudLeft, 'Pause', 'pause', ICONS.pause)
  mk(hudLeft, 'Home', 'home', ICONS.home)
  hudMid.append(scoreEl, comboEl, hudMini)
  hud.append(hudLeft, hudMid, timeEl)
  mkPill(pauseMain, 'Resume', 'resume', ICONS.play, 'primary')
  mkPill(pauseMain, 'Restart', 'restart', ICONS.restart)
  mkPill(pauseMain, 'Home', 'home', ICONS.home)
  mk(pauseAudio, 'Sound', 'sfx', ICONS.sound)
  mk(pauseAudio, 'Music', 'music', ICONS.note)
  mkPill(resultRow, 'Play again', 'restart', ICONS.play, 'primary')
  mkPill(resultRow, 'Home', 'home', ICONS.home)

  let layout: Layout = boardLayout(innerWidth, innerHeight)
  let state: GameState = createGame('pretty', layout.cols, layout.rows, 'timed')
  let screen: Screen = 'title'
  let pose: Pose = 'idle'
  let mode: Mode = 'timed'
  let freeze = params.has('freeze')
  let ghostOn = false
  let frame = 0
  let highlightFrame = 0
  let popWallMs = 0
  let last = performance.now()
  const springs = new Map<number, Spring>()
  let particles: DrawParticle[] = []
  let waves: { x: number; y: number; r: number; age: number; life: number; color: string }[] = []
  let beams: { x: number; y: number; angle: number; age: number; life: number; color: string }[] = []
  let floats: { x: number; y: number; text: string; age: number; big?: boolean }[] = []
  let popRings: { x: number; y: number; age: number; life: number }[] = []
  let flashT = 0
  let ropeFadeMs = 0
  let ropeTrail: { x: number; y: number }[] = []
  let ropeFadeColor = 0
  let ropeFadeLen = 0
  let clockOn = false
  let clockRunMs = 0
  let clockTickAt = 0
  let ghostDemoDone = false
  let ghostCycleStart = 0
  let perfDprScale = 1
  let canvasDpr = 0
  let fpsBuf: number[] = []
  let fpsWinStart = 0
  let fpsWinFrames = 0
  let bumpX = 0
  let bumpY = 0
  let bumpT = 0
  let ghostPath: Piece[] = []
  let fingerX = 0
  let fingerY = 0
  let fingerOn = false
  const titleSquish = new Map<number, number>()
  const bootMs = performance.now()

  function insetTop(): number {
    return parseFloat(getComputedStyle(probe).paddingTop) || 0
  }

  /** Star bands: greedy ~24k → 2★; skilled combos ~30k+ → 3★ */
  const STAR2_SCORE = 12_000
  const STAR3_SCORE = 28_000

  function viewDpr(): number {
    const native = Math.min(2, devicePixelRatio || 1)
    const area = Math.max(1, innerWidth * innerHeight)
    const areaCap = Math.sqrt(1_400_000 / area)
    if (fpsBuf.length >= 2) {
      const fps = fpsBuf.reduce((a, b) => a + b, 0) / fpsBuf.length
      if (fps < 40) perfDprScale = Math.max(0.62, perfDprScale - 0.05)
      else if (fps < 42) perfDprScale = Math.max(0.65, perfDprScale - 0.03)
      else if (fps > 52) perfDprScale = Math.min(1, perfDprScale + 0.01)
    }
    return Math.max(1, Math.min(native, areaCap * perfDprScale))
  }

  function resize() {
    if (canvasDpr === 0 && (devicePixelRatio || 1) >= 2) perfDprScale = 0.76
    const next = boardLayout(innerWidth, innerHeight, insetTop())
    const dpr = viewDpr()
    if (dpr !== canvasDpr) {
      canvasDpr = dpr
      invalidateBgCache()
    }
    canvas.width = Math.max(1, Math.round(innerWidth * dpr))
    canvas.height = Math.max(1, Math.round(innerHeight * dpr))
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`
    gfx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (next.cols !== layout.cols || next.rows !== layout.rows || next.D !== layout.D) {
      invalidateBgCache()
    }
    if (state && screen !== 'title' && (next.cols !== layout.cols || next.rows !== layout.rows)) {
      const score = state.score
      const timeLeft = state.timeLeft
      const seed = state.seed
      const nextMode = state.mode
      state = createGame(seed, next.cols, next.rows, nextMode)
      state.score = score
      state.timeLeft = timeLeft
      ghostPath = []
    }
    layout = next
  }

  function center(p: Piece): { x: number; y: number } {
    const s = springs.get(p.id) ?? { ox: 0, oy: 0, vx: 0, vy: 0 }
    return {
      x: layout.ox + (p.c + 0.5) * layout.D + s.ox,
      y: layout.oy + layout.padTop + (visualRow(p) + 0.5) * layout.D + s.oy,
    }
  }

  function boardRect(): { x: number; y: number; w: number; h: number } {
    const D = layout.D
    return {
      x: layout.ox - D * 0.1,
      y: layout.oy,
      w: layout.cols * D + D * 0.2,
      h: layout.padTop + layout.rows * D + D * 0.1,
    }
  }

  function hit(x: number, y: number): Piece | null {
    let best: Piece | null = null
    let bestD = layout.D * 0.56
    for (const p of state.pieces) {
      if (p.dead) continue
      const c = center(p)
      const d = Math.hypot(c.x - x, c.y - y)
      if (d <= bestD) {
        best = p
        bestD = d
      }
    }
    return best
  }

  function burst(x: number, y: number, color: number, big: boolean, bomb = false) {
    const lite = perfDprScale < 0.88 || fpsBuf.some((f) => f < 44)
    const dotN = reduced || lite ? 7 : 10 + Math.floor(state.rng() * 5)
    const extra = bomb ? 8 : big ? 4 : 0
    for (let i = 0; i < dotN + extra; i++) {
      const a = state.rng() * Math.PI * 2
      const sp = layout.D * (4 + state.rng() * 5)
      const rad = layout.D * (0.08 + state.rng() * 0.08)
      const conf = bomb && i % 3 === 0
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - layout.D * (0.4 + state.rng() * 0.6),
        life: 450 + state.rng() * 200,
        age: 0,
        color: conf ? CONFETTI[Math.floor(state.rng() * CONFETTI.length)]! : COLORS[color] ?? COLORS[0],
        kind: conf ? 'confetti' : 'dot',
        rot: state.rng() * Math.PI,
        vr: 0,
        w: rad,
      })
    }
    const starN = 3 + Math.floor(state.rng() * 3)
    for (let i = 0; i < starN; i++) {
      const a = state.rng() * Math.PI * 2
      const sp = layout.D * (4.5 + state.rng() * 4.5)
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - layout.D * 0.5,
        life: 480 + state.rng() * 170,
        age: 0,
        color: '#FFFFFF',
        kind: 'star',
        rot: state.rng() * Math.PI,
        vr: 6 + state.rng() * 4,
        w: layout.D * 0.1,
      })
    }
    popRings.push({ x, y, age: 0, life: 180 })
    const cap = lite ? 110 : 160
    while (particles.length > cap) particles.shift()
  }

  function notePops(ids: number[]) {
    const big = state.hitstopTotal > 0
    ids.forEach((id, i) => {
      const p = byId(state, id)
      if (!p) return
      const c = center(p)
      const index = Math.max(0, state.popAt.length - ids.length + i)
      const bomb = p.kind === 'bomb'
      burst(c.x, c.y, p.color, big, bomb)
      if (bomb) {
        flashT = 200
        waves.push({ x: c.x, y: c.y, r: layout.D * 0.25, age: 0, life: 380, color: 'rgba(255,255,255,0.96)' })
        waves.push({ x: c.x, y: c.y, r: layout.D * 0.12, age: 0, life: 420, color: 'rgba(255, 214, 92, 0.9)' })
      }
      if (p.kind === 'rainbow') {
        for (let b = 0; b < 8; b++) {
          beams.push({
            x: c.x,
            y: c.y,
            angle: (Math.PI * 2 * b) / 8,
            age: 0,
            life: 520,
            color: CONFETTI[b % CONFETTI.length],
          })
        }
      }
      if (!qaMode) playPop(index, big)
    })
    if (big && !reduced && ids.length) {
      bumpX = (ids.length % 2 === 0 ? 1 : -1) * 4
      bumpY = 4
      bumpT = 200
    }
    if (!qaMode && ids.length) {
      try {
        navigator.vibrate?.(big ? 16 : 8)
      } catch {
        /* ignore */
      }
    }
  }

  function armRelease() {
    const dragPts = state.drag
      .map((id) => byId(state, id))
      .filter((p): p is Piece => !!p)
      .map((p) => center(p))
    const t0 = performance.now()
    const ids = release(state)
    popWallMs = performance.now() - t0
    if (!ids.length) return
    const spot = center(byId(state, ids[0]) ?? state.pieces[0])
    const margin = layout.D * 0.35
    floats.push({
      x: Math.min(innerWidth - margin, Math.max(margin, spot.x)),
      y: Math.max(layout.hud + layout.D * 0.2, spot.y - layout.D * 0.15),
      text: `+${state.gained}`,
      age: 0,
      big: true,
    })
    ropeTrail = dragPts.length > 1 ? dragPts : ropeTrail
    ropeFadeColor = state.chainColor
    ropeFadeLen = Math.max(ropeFadeLen, state.queue.length)
    ropeFadeMs = 80
    notePops(ids)
    ghostOn = false
    save.tut = true
    storeSave(save)
    syncHud()
  }

  function show(next: Screen) {
    screen = next
    title.hidden = next !== 'title'
    hud.hidden = next !== 'play'
    pauseMenu.hidden = next !== 'pause'
    results.hidden = next !== 'results'
    setAudioPaused(next === 'pause')
    if (next === 'results') {
      finalEl.textContent = String(state.score)
      const prior = mode === 'cuddle' ? save.bestCuddle : mode === 'daily' ? save.dailyBest : save.bestTimed
      const isNew = state.score > prior
      rememberBest()
      const best = mode === 'cuddle' ? save.bestCuddle : mode === 'daily' ? save.dailyBest : save.bestTimed
      const n = state.score >= STAR3_SCORE ? 3 : state.score >= STAR2_SCORE ? 2 : 1
      stars.innerHTML = [0, 1, 2]
        .map(
          (i) =>
            `<span class="star${i < n ? ' on' : ''}" style="transition-delay:${i * 180}ms" aria-hidden="true">${ICONS.star.replace('width="18"', 'width="44"').replace('height="18"', 'height="44"')}</span>`,
        )
        .join('')
      if (isNew) {
        bestEl.hidden = true
        newBestEl.hidden = false
        newBestEl.textContent = 'New best!'
      } else {
        bestEl.hidden = false
        bestEl.innerHTML = `${ICONS.star}<span>${best}</span>`
        newBestEl.hidden = true
        newBestEl.textContent = ''
      }
    }
    syncHud()
    syncTitleBest()
  }

  function syncTitleBest() {
    const best = Math.max(save.bestTimed, save.bestCuddle, save.dailyBest)
    titleBest.textContent = best > 0 ? `Best ${best}` : 'Best —'
  }

  function syncHud() {
    const prev = scoreEl.textContent
    scoreEl.textContent = String(state.score)
    comboEl.hidden = state.combo <= 1 || screen !== 'play'
    comboEl.textContent = state.combo > 1 ? `x${state.combo}` : ''
    if (prev !== scoreEl.textContent && screen === 'play') {
      scoreEl.classList.remove('pop')
      void scoreEl.offsetWidth
      scoreEl.classList.add('pop')
    }
    const secs = Math.ceil(state.timeLeft / 1000)
    if (mode === 'cuddle') {
      timeEl.classList.remove('pulse')
      timeEl.innerHTML = `<span aria-hidden="true">${ICONS.heart}</span>`
    } else {
      const pct = Math.max(0, Math.min(1, state.timeLeft / 60_000))
      const dash = Math.max(0.02, pct) * 88
      timeEl.classList.toggle('pulse', secs <= 10 && screen === 'play')
      timeEl.innerHTML = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" fill="none" stroke="#ffe0f0" stroke-width="4"/><circle cx="26" cy="26" r="22" fill="none" stroke="#ff4f93" stroke-width="4" stroke-dasharray="${dash} 88" stroke-linecap="round" transform="rotate(-90 26 26)"/></svg><span>${secs}</span>`
    }
  }

  function fresh(nextMode: Mode, seed: string) {
    mode = nextMode
    pose = 'idle'
    particles = []
    waves = []
    beams = []
    floats = []
    springs.clear()
    ghostPath = []
    state = createGame(seed, layout.cols, layout.rows, nextMode)
    ghostOn = tutParam || (!save.tut && !qaMode)
    clockOn = false
    clockRunMs = 0
    clockTickAt = 0
    ghostDemoDone = save.tut || qaMode
    ghostCycleStart = 0
  }

  function showPlay() {
    show('play')
  }

  function openPause() {
    if (screen === 'title') return
    if (clockOn && clockTickAt) {
      clockRunMs += performance.now() - clockTickAt
      clockTickAt = 0
    }
    show('pause')
  }

  function syncWallClock(now: number) {
    if (!clockOn || mode === 'cuddle') return
  const running = screen === 'play' && document.visibilityState === 'visible'
    if (running) {
      if (!clockTickAt) clockTickAt = now
      state.timeLeft = Math.max(0, ROUND_MS - clockRunMs - (now - clockTickAt))
    } else {
      if (clockTickAt) {
        clockRunMs += now - clockTickAt
        clockTickAt = 0
      }
      state.timeLeft = Math.max(0, ROUND_MS - clockRunMs)
    }
  }

  function rememberBest() {
    if (mode === 'daily') {
      if (save.dailyDay !== state.seed) {
        save.dailyDay = state.seed
        save.dailyBest = 0
      }
      save.dailyBest = Math.max(save.dailyBest, state.score)
    } else if (mode === 'cuddle') save.bestCuddle = Math.max(save.bestCuddle, state.score)
    else save.bestTimed = Math.max(save.bestTimed, state.score)
    storeSave(save)
  }

  function showResults(score?: number) {
    if (score !== undefined) state.score = score
    show('results')
  }

  function onAction(action: string) {
    if (!qaMode) unlockAudio(false)
    if (action === 'sfx') {
      save.muteSfx = !save.muteSfx
      setAudioPrefs({ sfx: !save.muteSfx })
      storeSave(save)
      paintMutes()
      return
    }
    if (action === 'music') {
      save.muteMusic = !save.muteMusic
      setAudioPrefs({ music: !save.muteMusic })
      storeSave(save)
      paintMutes()
      return
    }
    if (action === 'pause') openPause()
    else if (action === 'resume') {
      last = performance.now()
      clockTickAt = performance.now()
      showPlay()
    } else if (action === 'home') {
      if (screen === 'play') openPause()
      else show('title')
    }
    else if (action === 'restart') {
      const seed = qaMode ? state.seed : mode === 'daily' ? dailySeed() : `${mode}-${Date.now()}`
      fresh(mode, seed)
      showPlay()
    } else if (action === 'timed' || action === 'cuddle' || action === 'daily') {
      const nextMode = action
      const seed =
        seedParam && qaMode
          ? seedParam
          : nextMode === 'daily'
            ? dailySeed()
            : qaMode
              ? 'pretty'
              : `${nextMode}-${Date.now()}`
      fresh(nextMode, seed)
      showPlay()
    }
    draw()
  }

  function paintMutes() {
    for (const b of appRoot.querySelectorAll<HTMLButtonElement>('[data-action="sfx"]')) {
      b.innerHTML = save.muteSfx ? ICONS.muted : ICONS.sound
      b.setAttribute('aria-pressed', save.muteSfx ? 'true' : 'false')
    }
    for (const b of appRoot.querySelectorAll<HTMLButtonElement>('[data-action="music"]')) {
      b.setAttribute('aria-pressed', save.muteMusic ? 'true' : 'false')
      b.style.opacity = save.muteMusic ? '0.45' : '1'
    }
  }

  function titleHeapHit(x: number, y: number): number | null {
    const D = layout.D
    const landscape = innerWidth > innerHeight
    const hero = titleHeroScale(innerWidth, innerHeight, D)
    const cx = landscape ? innerWidth * 0.38 : innerWidth * 0.5
    const cy = landscape ? innerHeight * 0.55 : innerHeight * 0.48
    const spots = [
      [-1, 1],
      [0, 1],
      [1, 1],
      [-0.5, 0],
      [0.5, 0],
      [0, -0.95],
    ].map(([gx, gy], i) => ({
      id: i,
      x: cx + gx * D * 0.92 * hero,
      y: cy + gy * D * 0.78 * hero,
    }))
    let best: number | null = null
    let bestD = D * 0.62
    for (const s of spots) {
      const d = Math.hypot(s.x - x, s.y - y)
      if (d < bestD) {
        best = s.id
        bestD = d
      }
    }
    return best
  }

  function onTitleTap(x: number, y: number) {
    const id = titleHeapHit(x, y)
    if (id === null) return
  if (!qaMode) unlockAudio(false)
    titleSquish.set(id, performance.now())
    if (!qaMode) playLink(id % 4)
    draw()
  }

  function onDown(x: number, y: number) {
    if (screen === 'title') {
      onTitleTap(x, y)
      return
    }
    if (screen !== 'play') return
    if (!mayBeginChain(state)) {
      state.drag = []
      if (roundOver(state)) showResults()
      draw()
      return
    }
    fingerOn = true
    fingerX = x
    fingerY = y
    if (!clockOn) {
      clockOn = true
      clockTickAt = performance.now()
      ghostOn = false
    }
    if (roundOver(state)) {
      showResults()
      return
    }
    state.drag = []
    const p = hit(x, y)
    if (p) extendDrag(state, p.id)
    if (ghostOn) ghostOn = false
    draw()
    highlightFrame = frame
  }

  function onMove(x: number, y: number) {
    if (screen !== 'play') return
    fingerX = x
    fingerY = y
    if (!mayBeginChain(state) && state.drag.length === 0) return
    if (state.drag.length === 0) return
    const before = state.drag.length
    const p = hit(x, y)
    if (p) extendDrag(state, p.id)
    if (state.drag.length > before && !qaMode) playLink(state.drag.length - 1)
    draw()
    highlightFrame = frame
  }

  function onUp() {
    fingerOn = false
    if (screen !== 'play') return
    if (state.drag.length >= 2) armRelease()
    else {
      state.drag = []
      if (!save.tut) ghostOn = tutParam || !qaMode
    }
    if (state.phase === 'idle' && roundOver(state)) showResults()
    draw()
    highlightFrame = frame
  }

  function updateSprings(dt: number, now: number) {
    const amp = reduced ? 0 : layout.D * 0.028
    for (const p of state.pieces) {
      if (p.dead) continue
      let s = springs.get(p.id)
      if (!s) {
        s = { ox: 0, oy: 0, vx: 0, vy: 0 }
        springs.set(p.id, s)
      }
      const tx = Math.sin(now / 520 + p.id) * amp
      const ty = Math.cos(now / 640 + p.id * 1.3) * amp * 0.65
      const k = 0.18
      s.vx = (s.vx + (tx - s.ox) * k) * 0.72
      s.vy = (s.vy + (ty - s.oy) * k) * 0.72
      s.ox += s.vx * (dt / 16)
      s.oy += s.vy * (dt / 16)
    }
  }

  function updateParticles(dt: number) {
    const sec = dt / 1000
    particles = particles.filter((p) => {
      p.age += dt
      p.x += p.vx * sec
      p.y += p.vy * sec
      p.vy += layout.D * 18 * sec
      p.rot += p.vr * sec
      return p.age < p.life
    })
    waves = waves.filter((w) => {
      w.age += dt
      return w.age < w.life
    })
    beams = beams.filter((b) => {
      b.age += dt
      return b.age < b.life
    })
    bumpT = Math.max(0, bumpT - dt)
    const u = bumpT / 200
    bumpX *= u > 0 ? 1 : 0
    bumpY *= u > 0 ? 1 : 0
    if (u > 0) {
      bumpX = Math.sign(bumpX || 1) * 5 * u
      bumpY = 3 * u
    }
    floats = floats.filter((f) => {
      f.age += dt
      f.y -= dt * 0.03
      return f.age < 700
    })
    popRings = popRings.filter((r) => {
      r.age += dt
      return r.age < r.life
    })
    flashT = Math.max(0, flashT - dt)
    ropeFadeMs = Math.max(0, ropeFadeMs - dt)
    if (particles.length > 180) particles.splice(0, particles.length - 180)
  }

  function tick(dt: number, now: number) {
    if (screen === 'title') {
      updateParticles(dt)
      return
    }
    if (screen !== 'play') return
    if (!clockOn && ghostDemoDone) {
      clockOn = true
      clockTickAt = now
    }
    syncWallClock(now)
    if (
      state.combo > 1 &&
      state.phase === 'idle' &&
      state.simMs - state.lastSettleAt > COMBO_WINDOW_MS
    ) {
      state.combo = 1
    }
    const frozen = state.hitstopLeft > 0
    const liteSprings = perfDprScale < 0.85 && frame % 2 === 0
    if (!frozen && !liteSprings) updateSprings(dt, now)
    updateParticles(dt)
    const popped = step(state, dt)
    if (popped.length) notePops(popped)
    if (roundOver(state)) showResults()
    syncHud()
  }

  function ghostPose(now: number): { x: number; y: number; down: boolean; alpha: number; prefix: number } | null {
    if (!ghostOn || screen !== 'play' || state.drag.length > 0 || state.phase !== 'idle') return null
    if (!ghostPath.length || ghostPath.length < 2) {
      ghostPath =
        findPath(state, 3) ??
        findPath(state, 2) ??
        findPath(state, 2, [], 'bottom') ??
        []
      if (ghostPath.length < 2) return null
      ghostCycleStart = now
    }
  if (!ghostCycleStart) ghostCycleStart = now
    const u = Math.min(1, Math.max(0, (now - ghostCycleStart) / 2600))
    const travel = Math.min(1, Math.max(0, (u - 0.1) / 0.62))
    const idx = Math.min(ghostPath.length - 1, Math.floor(travel * ghostPath.length))
    if (idx >= ghostPath.length - 1 && u > 0.88) ghostDemoDone = true
    const c = center(ghostPath[idx])
    const alpha = u < 0.08 ? u / 0.08 : u > 0.88 ? (1 - u) / 0.12 : 1
    const towardX = c.x < innerWidth / 2 ? layout.D * 0.28 : -layout.D * 0.28
    return {
      x: Math.min(innerWidth - 8, Math.max(8, c.x + towardX)),
      y: Math.min(innerHeight - 8, Math.max(8, c.y + layout.D * 0.22)),
      down: u < 0.84,
      alpha,
      prefix: idx,
    }
  }

  function scene(now: number): Scene {
    const D = layout.D
    const ghost = ghostPose(now)
    const selected = new Set<number>(state.drag)
    if (ghost) {
      for (let i = 0; i <= ghost.prefix; i++) selected.add(ghostPath[i].id)
    }
    const ghostSlice = ghost ? ghostPath.slice(0, ghost.prefix + 1) : []
    const pieces = state.pieces
      .filter((p) => {
        if (p.dead && (p.popT < 0 || p.popT >= POP_MS)) return false
        return !p.dead || p.popT >= 0
      })
      .map((p) => {
        const c = center(p)
        const popping = p.popT >= 0 && p.popT < POP_MS
        const popU = popping ? p.popT / POP_MS : 0
        const breathe = reduced || popping ? 0 : Math.sin(now / 280 + p.id) * 0.02
        const on = selected.has(p.id) && !popping
        let sx = 1 + breathe
        let sy = 1 - breathe
        if (on) {
          const wob = reduced ? 0 : Math.sin(now / 85 + p.id) * 0.035
          sx = 1.12 + wob
          sy = 1.12 + wob
        }
        if (popping) {
          const t = p.popT
          if (t < POP_GROW_MS) {
            const u = t / POP_GROW_MS
            sx = sy = 1 + 0.18 * u
          } else if (t < POP_GROW_MS + POP_SQUASH_MS) {
            const u = (t - POP_GROW_MS) / POP_SQUASH_MS
            sx = 1.18 + 0.17 * u
            sy = 1.18 - 0.58 * u
          } else {
            const u = (t - POP_GROW_MS - POP_SQUASH_MS) / POP_VANISH_MS
            sx = Math.max(0.02, 1.35 * (1 - u))
            sy = Math.max(0.02, 0.6 * (1 - u))
          }
          if (p.kind === 'bomb' && t < 35) {
            const swell = 1 + 0.22 * (t / 35)
            sx *= swell
            sy *= swell
          }
        } else if (p.landT >= 0 && p.landT < 180 && !p.dead) {
          const u = p.landT / 180
          const wob = Math.sin(u * Math.PI * 3) * (1 - u) * 0.06
          sx = 1.15 - 0.15 * u + wob
          sy = 0.85 + 0.15 * u - wob
        } else if (p.fallT >= 0 && p.fallT < 1 && !p.dead) {
          const ft = p.fallT
          const land = ft > 0.85 ? Math.sin(((ft - 0.85) / 0.15) * Math.PI) * 0.08 : 0
          sx = 1 + land
          sy = 1 - land * 0.55
        } else if (p.kind !== 'bonbon' && !on) {
          const pulse = reduced ? 0 : Math.sin(now / 220 + p.id) * 0.03
          sx += pulse
          sy -= pulse
        }
        return {
          id: p.id,
          color: p.color,
          kind: p.kind,
          x: c.x,
          y: c.y,
          sx,
          sy,
          popping,
          popU,
          selected: on,
        }
      })
    const rope =
      state.drag.length > 1
        ? state.drag
            .map((id) => byId(state, id))
            .filter((p): p is Piece => !!p)
            .map((p) => center(p))
        : ropeFadeMs > 0 && ropeTrail.length > 1
          ? ropeTrail
          : ghostSlice.length > 1
            ? ghostSlice.map((p) => center(p))
            : []
    let peeks: Scene['peeks'] = []
    if (screen === 'results') {
      const card = results.getBoundingClientRect()
      if (card.width > 0) {
        peeks = [0, 1, 2, 3].map((i) => ({
          color: i,
          x: card.left + ((i + 0.5) * card.width) / 4,
          y: card.top + 2,
        }))
      }
    }
    const landscape = innerWidth > innerHeight
    const hero = titleHeroScale(innerWidth, innerHeight, D)
    const dragPath = state.drag.map((id) => byId(state, id)).filter((p): p is Piece => !!p)
    const ropeColor = dragPath.length
      ? (pathColor(dragPath) ?? dragPath[0].color)
      : ghostSlice.length
        ? (pathColor(ghostSlice) ?? ghostSlice[0]!.color)
        : ropeFadeMs > 0
          ? ropeFadeColor
          : 0
    const chainLen = state.drag.length || (ropeFadeMs > 0 ? ropeFadeLen : ghostSlice.length)
    const lastTip =
      dragPath.length > 0
        ? center(dragPath[dragPath.length - 1])
        : rope.length > 0
          ? rope[rope.length - 1]
          : null
    let titleHint: Scene['titleHint'] = null
    const heapCenterX = landscape ? innerWidth * 0.38 : innerWidth * 0.5
    const heapCenterY = landscape ? innerHeight * 0.55 : innerHeight * 0.48
    const hintColor = 1
    const hintSlots = new Set([0, 1, 2])
    if (screen === 'title') {
      const u = (now % 2800) / 2800
      const travel = Math.min(1, Math.max(0, (u - 0.12) / 0.58))
      const idx = Math.min(2, Math.floor(travel * 3))
      const heapPts = [
        [-1, 1],
        [0, 1],
        [1, 1],
        [-0.5, 0],
        [0.5, 0],
        [0, -0.95],
      ].map(([gx, gy], i) => ({
        color: i % 6,
        x: heapCenterX + gx * D * 0.92 * hero,
        y: heapCenterY + gy * D * 0.78 * hero,
      }))
      const pick = [0, 1, 2].map((i) => ({ ...heapPts[i]!, color: hintColor }))
      const ropePts = pick.slice(0, idx + 1).map((p) => ({ x: p.x, y: p.y }))
      const tip = pick[idx]!
      titleHint = {
        rope: ropePts,
        ropeColor: hintColor,
        hand: {
          x: tip.x + D * 0.2,
          y: tip.y + D * 0.28,
          down: travel < 0.86,
          alpha: u < 0.08 ? u / 0.08 : u > 0.9 ? (1 - u) / 0.1 : 0.88,
        },
      }
    }
    const heap =
      screen === 'title'
        ? [
            [-1, 1],
            [0, 1],
            [1, 1],
            [-0.5, 0],
            [0.5, 0],
            [0, -0.95],
          ].map(([gx, gy], i) => {
            const tap = titleSquish.get(i) ?? 0
            const squash = tap ? Math.max(0, 1 - (now - tap) / 220) : 0
            const idle = freeze || reduced ? 0 : Math.sin(now / 360 + i) * 0.03
            const hx = heapCenterX + gx * D * 0.92 * hero
            const hy = heapCenterY + gy * D * 0.78 * hero + (freeze || reduced ? 0 : Math.sin(now / 380 + i) * 4)
            return {
              id: i,
              color: hintSlots.has(i) ? hintColor : i % 6,
              kind: 'bonbon' as const,
              x: hx,
              y: hy,
              sx: (1 + idle + squash * 0.08) * hero,
              sy: (1 + idle - squash * 0.18) * hero,
            }
          })
        : []
    let bubble: Scene['bubble'] = null
    if (screen === 'play' && chainLen > 1 && rope.length > 1) {
      const anchor =
        fingerOn && state.drag.length > 1
          ? { x: fingerX, y: fingerY }
          : rope[rope.length - 1]!
      let bx = anchor.x
      let by = anchor.y - D * 1.28
      const boardTop = layout.oy
      if (by > boardTop - D * 0.45) {
        by = Math.min(anchor.y - D * 1.35, layout.hud + D * 0.85)
        bx = anchor.x
      }
      const margin = D * 0.45
      bx = Math.min(innerWidth - margin, Math.max(margin, bx))
      by = Math.min(innerHeight - margin, Math.max(layout.hud + D * 0.55, by))
      bubble = { x: bx, y: by, n: chainLen, bomb: chainLen >= 5, rainbow: chainLen >= 7 }
    }
    return {
      w: innerWidth,
      h: innerHeight,
      dpr: viewDpr(),
      D,
      t: now - bootMs,
      pieces: screen === 'title' ? [] : pieces,
      rope: screen === 'title' ? [] : rope,
      ropeColor,
      chainLen,
      bubble,
      titleHint,
      finger:
        state.drag.length > 1 && lastTip
          ? { x: fingerOn ? fingerX : lastTip.x + layout.D * 0.08, y: fingerOn ? fingerY : lastTip.y + layout.D * 0.08 }
          : null,
      particles,
      waves,
      beams,
      ghost: ghost ? { x: ghost.x, y: ghost.y, down: ghost.down, alpha: ghost.alpha } : null,
      flash:
        flashT > 0
          ? Math.min(0.42, 0.38 * (flashT / 200))
          : state.hitstopLeft > 0 && state.hitstopTotal > 0
            ? 0.08 * (state.hitstopLeft / state.hitstopTotal)
            : 0,
      popRings,
      bumpX: reduced ? 0 : bumpX,
      bumpY: reduced ? 0 : bumpY,
      floats: screen === 'results' ? [] : floats,
      screen,
      dim: screen === 'pause' ? 1 : screen === 'results' ? 0.72 : 0,
      heap,
      mat:
        screen === 'title'
          ? null
          : {
              x: layout.ox - D * 0.1,
              y: Math.max(layout.hud, layout.oy - D * 0.08),
              w: layout.cols * D + D * 0.2,
              h: layout.padTop + layout.rows * D + D * 0.12,
            },
      peeks,
      liteRibbon: perfDprScale < 0.92,
    }
  }

  function draw() {
    const now = performance.now()
    const blink = !freeze && !reduced && now % 3200 < 140
    renderScene(gfx, scene(now), blink)
    frame += 1
  }

  function recordFpsFrame(now: number) {
    if (!fpsWinStart) fpsWinStart = now
    fpsWinFrames += 1
    const elapsed = now - fpsWinStart
    if (elapsed >= 1000) {
      fpsBuf.push((fpsWinFrames * 1000) / elapsed)
      if (fpsBuf.length > 12) fpsBuf.shift()
      fpsWinStart = now
      fpsWinFrames = 0
      const dpr = viewDpr()
      if (dpr !== canvasDpr) resize()
    }
  }

  function settleChain(min: number): boolean {
    const path = findPath(state, min)
    if (!path) return false
    state.drag = path.map((p) => p.id)
    armRelease()
    let guard = 0
    while (state.phase !== 'idle' && guard++ < 100) step(state, 40)
    return true
  }

  function chainThrough(kind: 'bomb' | 'rainbow'): Piece[] {
    const special = state.pieces.find((p) => !p.dead && p.kind === kind)
    if (!special) return []
    const seeds =
      kind === 'rainbow'
        ? state.pieces.filter(
            (p) =>
              !p.dead &&
              p.kind === 'bonbon' &&
              Math.abs(p.c - special.c) + Math.abs(p.r - special.r) === 1,
          )
        : [special]
    let best: Piece[] = []
    for (const seed of seeds) {
      const queue: Piece[][] = [kind === 'rainbow' ? [seed, special] : [seed]]
      const seen = new Set(queue[0]!.map((p) => p.id))
      while (queue.length) {
        const path = queue.shift()!
        if (path.length > best.length) best = path
        const last = path[path.length - 1]!
        for (const n of state.pieces) {
          if (n.dead || seen.has(n.id)) continue
          if (Math.abs(n.c - last.c) + Math.abs(n.r - last.r) !== 1) continue
          if (!canAppend(path, n)) continue
          seen.add(n.id)
          queue.push([...path, n])
        }
      }
    }
    return best.length >= 2 ? best : []
  }

  function applyUrl() {
    const want = screenParam ?? 'title'
    if (want === 'results') {
      fresh('timed', seedParam ?? 'feel')
      showPlay()
      clockOn = true
      for (let i = 0; i < 16 && !roundOver(state); i++) {
        if (!settleChain(i % 3 === 0 ? 5 : 3)) break
      }
      clockRunMs = ROUND_MS
      state.timeLeft = 0
      showResults()
      if (qaMode && params.has('freeze')) freeze = true
      return
    }
    if (want === 'title') {
      fresh('timed', seedParam ?? (qaMode ? 'pretty' : `boot-${Date.now()}`))
      show('title')
      return
    }
    const seed =
      want === 'chain' || want === 'pop' || want === 'bomb' || want === 'rainbow'
        ? seedParam && seedParam !== 'pretty'
          ? seedParam
          : 'feel'
        : seedParam ?? (qaMode ? 'pretty' : `boot-${Date.now()}`)
    fresh('timed', seed)
    showPlay()
    if (want === 'chain') {
      const path = findPath(state, 5) ?? findPath(state, 4)
      if (path) {
        state.drag = path.map((p) => p.id)
        const tip = center(path[path.length - 1])
        fingerOn = true
        fingerX = tip.x + layout.D * 0.06
        fingerY = tip.y + layout.D * 0.06
        pose = 'chain'
      }
    } else if (want === 'pop') {
      const path = findPath(state, 6)
      if (path) {
        state.drag = path.map((p) => p.id)
        armRelease()
        let t = 0
        while (t < 80) {
          step(state, 16)
          updateParticles(16)
          t += 16
        }
        state.drag = []
        state.showIds = []
        floats = []
        freeze = true
        pose = 'pop'
      }
    } else if (want === 'bomb' || want === 'bomb-piece' || want === 'bomb-board') {
      for (let n = 0; n < 10; n++) {
        if (settleChain(5) && state.pieces.some((p) => !p.dead && p.kind === 'bomb')) break
      }
      particles = []
      waves = []
      beams = []
      floats = []
      state.drag = []
      state.showIds = []
      for (const p of state.pieces) {
        p.popT = -1
      }
      state.pieces = state.pieces.filter((p) => !p.dead)
      freeze = true
    } else if (want === 'bomb-blast') {
      for (let n = 0; n < 10; n++) {
        if (settleChain(5) && state.pieces.some((p) => !p.dead && p.kind === 'bomb')) break
      }
      const through = chainThrough('bomb')
      if (through.length >= 2) {
        state.drag = through.map((p) => p.id)
        armRelease()
        let t = 0
        while (t < 120) {
          step(state, 16)
          updateParticles(16)
          t += 16
        }
        state.drag = []
        state.showIds = []
      }
      freeze = true
    } else if (want === 'rainbow' || want === 'rainbow-piece' || want === 'rainbow-board') {
      for (let n = 0; n < 12; n++) {
        if (settleChain(7) && state.pieces.some((p) => !p.dead && p.kind === 'rainbow')) break
      }
      particles = []
      waves = []
      beams = []
      floats = []
      state.drag = []
      state.showIds = []
      for (const p of state.pieces) {
        p.popT = -1
      }
      state.pieces = state.pieces.filter((p) => !p.dead)
      freeze = true
    } else if (want === 'rainbow-blast') {
      for (let n = 0; n < 12; n++) {
        if (settleChain(7) && state.pieces.some((p) => !p.dead && p.kind === 'rainbow')) break
      }
      const through = chainThrough('rainbow')
      if (through.length >= 2) {
        state.drag = through.map((p) => p.id)
        armRelease()
        let t = 0
        while (t < 120) {
          step(state, 16)
          updateParticles(16)
          t += 16
        }
        state.drag = []
        state.showIds = []
      }
      freeze = true
    }
    if (want === 'pause') openPause()
  }

  function armHistory() {
    history.replaceState({ bb: 0 }, '')
    history.pushState({ bb: 1 }, '')
    addEventListener('popstate', () => {
      history.pushState({ bb: 1 }, '')
      if (screen === 'play') openPause()
      else if (screen === 'pause') {
        last = performance.now()
        clockTickAt = performance.now()
        showPlay()
      } else if (screen === 'results') show('title')
      draw()
    })
  }

  function visibleUi(): { n: string; r: DOMRect; el: HTMLElement }[] {
    return [...appRoot.querySelectorAll<HTMLElement>('.ui')].filter((el) => {
      if (el.closest('[hidden]')) return false
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0
    }).map((el) => ({
      n: el.getAttribute('aria-label') || el.className,
      r: el.getBoundingClientRect(),
      el,
    }))
  }

  window.__checkOverlaps = () => {
    const els = visibleUi()
    const overlaps: [string, string][] = []
    const offscreen: string[] = []
    for (let i = 0; i < els.length; i++) {
      const a = els[i]
      if (a.r.left < -1 || a.r.top < -1 || a.r.right > innerWidth + 1 || a.r.bottom > innerHeight + 1) offscreen.push(a.n)
      for (let j = i + 1; j < els.length; j++) {
        const b = els[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        if (ix > 2 && iy > 2) overlaps.push([a.n, b.n])
      }
    }
    return { overlaps, offscreen }
  }

  window.__checkHudBoard = () => {
    const violations: string[] = []
    if (screen !== 'play') return { violations }
    const br = boardRect()
    const box = (r: DOMRect) => {
      const ix = Math.min(r.right, br.x + br.w) - Math.max(r.left, br.x)
      const iy = Math.min(r.bottom, br.y + br.h) - Math.max(r.top, br.y)
      return ix > 1 && iy > 1
    }
    const hud = document.getElementById('hud')
    if (!hud || hud.hidden) return { violations }
    for (const el of hud.querySelectorAll<HTMLElement>('.ui, button, .score, .timer')) {
      if (el.closest('[hidden]')) continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && box(r)) violations.push(`hud hits board: ${el.getAttribute('aria-label') || el.className}`)
    }
    return { violations }
  }

  window.__checkPlayGeometry = () => {
    const violations: string[] = []
    for (const u of visibleUi()) {
      if (u.el.tagName === 'BUTTON' && (u.r.width < 44 || u.r.height < 44)) violations.push(`small ${u.n}`)
    }
    if (screen === 'play') {
      const ds = new Set<number>()
      for (const p of state.pieces) {
        if (p.dead && p.popT < 0) continue
        if (p.fallT >= 0 && p.fallT < 1) continue
        ds.add(layout.D)
        const c = center(p)
        const rad = layout.D / 2
        if (c.x - rad < -2 || c.y - rad < -2 || c.x + rad > innerWidth + 2 || c.y + rad > innerHeight + 2) {
          violations.push(`off piece ${p.id}`)
        }
        const br = boardRect()
        if (c.y - rad < br.y - 2) violations.push(`above board ${p.id}`)
        if (c.y + rad > br.y + br.h + 2) violations.push(`below board ${p.id}`)
      }
      if (ds.size !== 1) violations.push('mixed D')
    }
    const g = ghostPose(performance.now())
    if (ghostOn && screen === 'play' && g) {
      if (g.x < 0 || g.y < 0 || g.x > innerWidth || g.y > innerHeight) violations.push('ghost offscreen')
    }
    return { violations }
  }

  const api: Qa = {
    get ready() { return window.__ready },
    get screen() { return screen },
    get pose() { return pose },
    get mode() { return mode },
    get seed() { return state.seed },
    get score() { return state.score },
    get combo() { return state.combo },
    get timeLeft() { return state.timeLeft },
    get paused() { return screen === 'pause' },
    inputLocked: false,
    get chain() { return state.drag.slice() },
    get D() { return layout.D },
    get cols() { return state.cols },
    get rows() { return state.rows },
    get board() {
      return state.pieces
        .filter((p) => !p.dead || p.popT >= 0)
        .map((p) => {
          const c = center(p)
          return {
            id: p.id,
            c: p.c,
            r: p.r,
            color: p.color,
            kind: p.kind,
            popping: p.popT >= 0,
            falling: p.fallT >= 0 && p.fallT < 1,
            x: c.x,
            y: c.y,
            d: layout.D,
          }
        })
    },
    get ghost() { return ghostOn && screen === 'play' },
    get ghostX() { return ghostPose(performance.now())?.x ?? -1 },
    get ghostY() { return ghostPose(performance.now())?.y ?? -1 },
    get hitstopMs() { return state.hitstopTotal },
    get hitstopActive() { return state.hitstopLeft > 0 },
    get particleCount() { return particles.length },
    get particleSig() { return particles.reduce((s, p) => s + p.x + p.y, 0) },
    get popStartedAt() { return state.popAt.slice() },
    get popWallMs() { return popWallMs },
    get settled() { return state.settled },
    get settleMs() { return state.settleMs },
    get muteSfx() { return save.muteSfx },
    get muteMusic() { return save.muteMusic },
    get frame() { return frame },
    get highlightFrame() { return highlightFrame },
    get spriteMisses() { return spriteMisses },
    get audioCreates() { return audioCreates },
    filterOps: 0,
    get maxCluster() {
      return maxSameColorCluster(state)
    },
    boardRect,
    get ribbonThickness() {
      return state.drag.length > 1 || pose === 'chain' ? layout.D * 0.22 : 0
    },
    pointer(phase, x, y) {
      if (phase === 'down') onDown(x, y)
      else if (phase === 'move') onMove(x, y)
      else onUp()
    },
    traceChain(cells: { id: number; x: number; y: number }[]) {
      if (!cells.length || screen !== 'play') return
      if (roundOver(state)) return
      fingerOn = true
      state.drag = []
      for (const cell of cells) {
        extendDrag(state, cell.id)
        fingerX = cell.x
        fingerY = cell.y
      }
      if (ghostOn) ghostOn = false
      draw()
    },
    appendPiece(id: number) {
      if (screen !== 'play') return
      const p = byId(state, id)
      if (!p) return
      extendDrag(state, id)
      const c = center(p)
      fingerX = c.x
      fingerY = c.y
      fingerOn = true
      draw()
    },
    beginChain(id: number) {
      if (screen !== 'play') return
      state.drag = [id]
      const p = byId(state, id)
      if (p) {
        const c = center(p)
        fingerX = c.x
        fingerY = c.y
      }
      fingerOn = true
      if (ghostOn) ghostOn = false
      highlightFrame = frame
      draw()
    },
    appendPieces(ids: number[]) {
      if (screen !== 'play') return
      for (const id of ids) extendDrag(state, id)
      const last = byId(state, ids[ids.length - 1] ?? -1)
      if (last) {
        const c = center(last)
        fingerX = c.x
        fingerY = c.y
      }
      fingerOn = true
      draw()
    },
    findChain(min, avoid = [], prefer) {
      const path = findPath(state, min, avoid, prefer)
      if (!path) return null
      return path.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
    },
    center(id) {
      const p = byId(state, id)
      return p ? center(p) : null
    },
    pause() { openPause(); draw() },
    resume() {
      last = performance.now()
      clockTickAt = performance.now()
      showPlay()
      draw()
    },
    get fps() {
      const now = performance.now()
      if (fpsWinFrames > 4 && now > fpsWinStart) {
        const live = (fpsWinFrames * 1000) / (now - fpsWinStart)
        if (!fpsBuf.length) return live
        return fpsBuf.reduce((a, b) => a + b, live) / (fpsBuf.length + 1)
      }
      if (!fpsBuf.length) return 60
      return fpsBuf.reduce((a, b) => a + b, 0) / fpsBuf.length
    },
    resetFps() {
      fpsBuf.length = 0
      fpsWinStart = performance.now()
      fpsWinFrames = 0
    },
    restart() { onAction('restart') },
    home() { show('title'); draw() },
    start(nextMode, seed) {
      fresh(nextMode, seed ?? (nextMode === 'daily' ? dailySeed() : 'pretty'))
      showPlay()
      draw()
    },
    pump(ms) {
      if (freeze || screen === 'pause') return
      let left = ms
      let t = performance.now()
      while (left > 0) {
        const d = Math.min(16, left)
        tick(d, t)
        t += d
        left -= d
      }
      draw()
    },
    draw() { draw() },
    setMute(sfx, music) {
      save.muteSfx = sfx
      save.muteMusic = music
      setAudioPrefs({ sfx: !sfx, music: !music })
      storeSave(save)
      paintMutes()
    },
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (screen !== 'play' && screen !== 'title') return
    canvas.setPointerCapture(e.pointerId)
    const r = canvas.getBoundingClientRect()
    onDown(e.clientX - r.left, e.clientY - r.top)
  })
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    if (screen === 'title') return
    if (screen !== 'play' || (!state.drag.length && e.buttons === 0)) return
    onMove(e.clientX - r.left, e.clientY - r.top)
  })
  canvas.addEventListener('pointerup', () => onUp())
  canvas.addEventListener('pointercancel', () => onUp())
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    if (screen === 'play') openPause()
      else if (screen === 'pause') {
        last = performance.now()
        clockTickAt = performance.now()
        showPlay()
      } else if (screen === 'results') show('title')
    draw()
  })
  addEventListener('visibilitychange', () => {
    const now = performance.now()
    if (document.hidden && clockTickAt) {
      clockRunMs += now - clockTickAt
      clockTickAt = 0
    } else if (!document.hidden && screen === 'play' && clockOn) {
      clockTickAt = now
    }
    draw()
  })
  addEventListener('resize', () => { resize(); draw() })

  function loop(now: number) {
    if (freeze) return
    recordFpsFrame(now)
    let dt = now - last
    last = now
    if (dt < 0) dt = 0
    if (dt > 200) dt = 200
    tick(dt, now)
    draw()
    requestAnimationFrame(loop)
  }

  syncTitleBest()

  armHistory()
  resize()
  applyUrl()
  paintMutes()
  draw()
  window.__qa = api
  window.__ready = true
  void document.fonts.ready.then(() => draw())
  if (!freeze) requestAnimationFrame(loop)
}

function el(tag: string, className = ''): HTMLElement {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}
