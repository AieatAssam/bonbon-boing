import {
  ADVENTURE_LANDSCAPE_TOP_RESERVE,
  ADVENTURE_PORTRAIT_HUD_RESERVE,
  boardLayout,
  boardLayoutFixedGrid,
  earsInsideMatAtRest,
  titleHeapCenter,
  titleHeroScale,
  type Layout,
} from './layout'
import {
  at,
  byId,
  canAppend,
  createAdventureGame,
  createGame,
  COMBO_WINDOW_MS,
  dailySeed,
  extendDrag,
  findPath,
  findPathEndingAt,
  findPathTouchingKind,
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
import { createMetaLayer } from './meta-shell'
import { ADVENTURE_LEVELS, type AdventureLevelDef } from './adventure/levels'
import {
  allGoalsMet,
  emptyGoalState,
  evaluateStars,
  type AdventureGoalState,
} from './adventure/goals'
import { renderMetaDock } from './ui/metaDom'
import { goalChip } from './adventure/goals'
import { showTipCard } from './ui/tipCard'
import { equip, purchase } from './meta/catalogue'
import { PLUSH_ICONS } from './ui/plushIcons'
import { getCosmetics } from './draw'
import { queueToast, setToastBlocked } from './ui/toastQueue'
import type { SaveV3 } from './meta/save'

type Screen = 'title' | 'play' | 'pause' | 'results'
type Pose = 'idle' | 'chain' | 'pop'

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
  movesLeft: number
  paused: boolean
  inputLocked: boolean
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
  backingDpr: () => number
  pieceCenters: () => { x: number; y: number }[]
  bubbleCheck: () => {
    dist: number
    distOk: boolean
    tipClear: boolean
    neighbourCover: boolean
    layoutD: number
  }
  findEdgeChain: (edge: 'top' | 'bottom' | 'left' | 'right' | 'corner-tl' | 'corner-br') => ChainCell[] | null
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
  openMeta: (which: 'map' | 'shop' | 'achievements' | 'collection', mapChapter?: number) => void
  closeMeta: () => void
  prepPromoSave: () => void
  prepMapLock: () => void
  prepAdventureLevel: (levelId: number) => void
  boardPieces: () => { spawning: boolean; spawnT: number; x: number; y: number }[]
  markTipsSeen: () => void
  playRealRound: () => void
  buySkin: (id: string) => void
  equipItem: (id: string) => void
  showBlockerTip: (tipId: string) => void
  earsOk: () => boolean
  startAdventure: (levelId: number) => void
  capturePopBurst: () => void
  settleChain: (min: number) => boolean
  hasBomb: () => boolean
  lastChainLen: number
  setMovesLeft: (n: number) => void
  bonusActive: () => boolean
  lastMovesLeftAtGoal: number
  forceBonusFinale: (moves: number) => void
  finalePopsTotal: () => number
  findGoalChain: (min?: number) => ChainCell[] | null
  showTestToast: () => void
  adventureMovesTable: (max: number) => { level: number; moves: number; chapter: number }[]
  finishAdventureWin: () => void
}

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
    __checkAdventureHudGoals: () => { violations: string[] }
    __checkHudPlayfield: () => { violations: string[] }
    __checkPlayfieldInViewport: () => { violations: string[] }
    __piecePlayfieldRect: () => { x: number; y: number; w: number; h: number }
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
  gear: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="#4A2440" stroke-width="2"/><path fill="none" stroke="#4A2440" stroke-width="2" stroke-linecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></svg>',
}

export function boot(): void {
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

  let adventureLevel: AdventureLevelDef | null = null
  let adventureGoals: AdventureGoalState | null = null
  let lastResultStars: number | null = null
  let lastAdventureWon = false
  let lastFinishedAdventureLevel: AdventureLevelDef | null = null
  let lastRunRewards = { coins: 0, xp: 0 }
  let lastRunRewardNote = ''
  type BonusFinale = {
    popsLeft: number
    popsTotal: number
    elapsed: number
    nextPopAt: number
  }
  let bonusFinale: BonusFinale | null = null
  let movesLeftAtGoal = 0
  let resultsLocked = false
  let hudStarsLive = { s2: true, s3: true }
  const BONUS_SCORE_PER_MOVE = 500
  const BONUS_POP_GAP_MS = 250
  const BONUS_CAP_MS = 4000

  function resetRunPhase() {
    bonusFinale = null
    movesLeftAtGoal = 0
    resultsLocked = false
    hudStarsLive = { s2: true, s3: true }
    if (state) state.inputLocked = false
  }

  function finishBonusFinale() {
    if (!bonusFinale) return
    if (bonusFinale.popsLeft > 0) {
      const n = bonusFinale.popsLeft
      const lump = n * BONUS_SCORE_PER_MOVE
      state.score += lump
      if (adventureGoals) adventureGoals.score = state.score
      floats.push({
        x: layout.ox + (layout.cols * layout.D) / 2,
        y: layout.oy + layout.padTop,
        text: `+${n} × ${BONUS_SCORE_PER_MOVE}`,
        age: 0,
        big: true,
      })
      bonusFinale.popsLeft = 0
    }
    bonusFinale = null
    state.inputLocked = false
    state.movesLeft = 0
    if (finaleHintEl) finaleHintEl.hidden = true
    setToastBlocked(false)
    showResults()
  }

  function doBonusFinalePop() {
    const live = state.pieces.filter((p) => !p.dead && p.popT < 0 && p.kind === 'bonbon')
  const pick = live.length ? live[Math.floor(state.rng() * live.length)]! : null
    const useRow = state.rng() < 0.55
    let pts = 0
    const hits: Piece[] = []
    if (pick && useRow) {
      hits.push(...state.pieces.filter((p) => !p.dead && p.popT < 0 && p.r === pick.r).slice(0, 5))
    } else if (pick) {
      hits.push(...state.pieces.filter((p) => !p.dead && p.popT < 0 && p.c === pick.c).slice(0, 5))
    } else if (pick) {
      hits.push(pick)
    }
    for (const p of hits.length ? hits : live.slice(0, 1)) {
      const c = center(p)
      burst(c.x, c.y, p.color, hits.length > 2, hits.length > 3)
      p.landT = 0
    }
    pts = BONUS_SCORE_PER_MOVE
    state.score += pts
    if (adventureGoals) adventureGoals.score = state.score
    state.gained = pts
    if (!save.muteSfx) playPop(pick?.color ?? 0, hits.length > 2)
    floats.push({
      x: layout.ox + (layout.cols * layout.D) * 0.5,
      y: layout.oy + layout.padTop + layout.D * 2,
      text: `+${pts}`,
      age: 0,
      big: true,
    })
  }

  function playRoundOver(): boolean {
    if (bonusFinale) return false
    if (mode === 'adventure' && adventureLevel && adventureGoals && allGoalsMet(adventureGoals, adventureLevel.goals)) {
      return false
    }
    return roundOver(state)
  }

  function syncAdventureGoalsFromTrack() {
    if (!adventureGoals) return
    adventureGoals.score = state.score
    adventureGoals.movesUsed = state.track.movesUsed
    adventureGoals.bombsPopped = state.track.bombsPopped
    adventureGoals.iceBroken = state.track.iceBroken
    adventureGoals.chocoCleared = state.track.chocoCleared
    adventureGoals.clearedByColor = {}
    state.track.clearedByColor.forEach((n, i) => {
      if (n > 0) adventureGoals!.clearedByColor[i] = n
    })
  }

  function startAdventureLevel(level: AdventureLevelDef) {
    resetRunPhase()
    perfLevel = 0
    perfSlowStreak = 0
    perfFastStreak = 0
    perfFastNeed = 5
    perfLastStep = null
    adventureLevel = level
    adventureGoals = emptyGoalState(level.moves)
    mode = 'adventure'
    pose = 'idle'
    particles = []
    waves = []
    beams = []
    floats = []
    springs.clear()
    ghostPath = []
    state = createAdventureGame(level, level.cols, level.rows)
    ghostOn = tutParam || (!meta.save.tut && !qaMode)
    clockOn = false
    clockRunMs = 0
    clockTickAt = 0
    ghostDemoDone = meta.save.tut || qaMode
    ghostCycleStart = 0
    lastSimPhase = 'idle'
    showPlay()
    applyBoardLayout()
    const intro = adventureLevel.tutorialTip
    if (intro && !save.seenTips.includes(intro)) {
      showTipCard(intro, () => {
        save.seenTips.push(intro)
        meta.persist()
        draw()
      })
    }
  }

  const meta = createMetaLayer(appRoot, startAdventureLevel)
  const save = meta.save as SaveV3
  setAudioPrefs({ sfx: !save.muteSfx, music: !save.muteMusic })
  meta.applyCosmetics()

  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;left:0;top:0;padding-top:env(safe-area-inset-top);visibility:hidden'
  document.body.append(probe)

  const title = el('div')
  title.id = 'title'
  const logo = el('h1', 'logo title-logo')
  logo.dataset.nozoom = '1'
  logo.textContent = 'Bonbon Boing!'
  const titleProfile = el('div', 'title-profile')
  const titleBest = el('p', 'title-best')
  const titleCorner = el('div', 'title-corner')
  const dock = el('div', 'dock')
  title.append(logo, titleProfile, titleBest, titleCorner, dock)
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
  const rewardEl = el('div', 'results-reward ui')
  rewardEl.hidden = true
  const xpBar = el('div', 'xp-bar')
  xpBar.innerHTML = '<div class="xp-fill"></div>'
  const coinRoll = el('p', 'coin-roll ui')
  const resultRow = el('div', 'row')
  results.append(stars, newBestEl, finalEl, bestEl, rewardEl, xpBar, coinRoll, resultRow)
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

  mkPill(dock, 'Score Rush', 'timed', PLUSH_ICONS.rush, 'primary')
  mkPill(dock, 'Cuddle', 'cuddle', PLUSH_ICONS.cuddle, 'relax')
  mkPill(dock, 'Daily', 'daily', PLUSH_ICONS.daily)
  const metaRow = renderMetaDock(meta.save, (action) => onAction(action))
  metaRow.classList.add('meta-row')
  dock.append(metaRow)
  const settingsPop = el('div', 'title-settings-pop')
  settingsPop.hidden = true
  mk(settingsPop, 'Sound', 'sfx', ICONS.sound, true)
  mk(settingsPop, 'Music', 'music', ICONS.note, true)
  titleCorner.append(settingsPop)
  const settingsBtn = mk(titleCorner, 'Settings', 'settings', ICONS.gear, true)
  settingsBtn.title = 'Sound & music'
  settingsBtn.addEventListener('click', (ev) => {
    ev.stopPropagation()
    settingsPop.hidden = !settingsPop.hidden
  })
  mk(hudLeft, 'Pause', 'pause', ICONS.pause)
  mk(hudLeft, 'Home', 'home', ICONS.home)
  const hudTopRow = el('div', 'hud-top-row')
  const hudRightTop = el('div', 'hud-right-top')
  const movesPillEl = el('div', 'ui timer ring moves-pill')
  const hudGoalRow = el('div', 'hud-goal-row')
  hudGoalRow.hidden = true
  const starBarEl = el('div', 'star-progress ui')
  starBarEl.setAttribute('aria-label', 'Star targets by moves left')
  const goalStripEl = el('div', 'goal-strip ui')
  goalStripEl.hidden = true
  hudGoalRow.append(starBarEl, goalStripEl)
  const finaleHintEl = el('div', 'finale-skip-hint ui')
  finaleHintEl.hidden = true
  finaleHintEl.innerHTML = '<span class="finale-skip-ico" aria-hidden="true">👆</span><span>Tap to skip</span>'
  hudMid.append(scoreEl, comboEl, hudMini)
  hudRightTop.append(timeEl, movesPillEl)
  hudTopRow.append(hudLeft, hudMid, hudRightTop)
  hud.append(hudTopRow, hudGoalRow)
  root.append(finaleHintEl)
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
  let lastSimPhase: GameState['phase'] = 'idle'
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
  const DPR_FLOOR = 1.25
  const PERF_REL = [1, 0.75, 0.625] as const
  let perfLevel = 0
  let perfSlowStreak = 0
  let perfFastStreak = 0
  let perfFastNeed = 5
  let perfLastStep: 'up' | 'down' | null = null
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

  function baseHudPx(): number {
    const landscape = innerWidth > innerHeight
    return Math.round(Math.min(landscape ? 72 : 84, Math.max(64, innerHeight * (landscape ? 0.07 : 0.09))))
  }

  function measureHudInset(): { extraTop: number; side: number } {
    const sat = insetTop()
    const hudEl = document.getElementById('hud')
    if (screen !== 'play' || !hudEl || hudEl.hidden) {
      return { extraTop: sat, side: 0 }
    }
    const landscape = innerWidth > innerHeight
    if (mode === 'adventure') {
      if (landscape) {
        const topRow = hudEl.querySelector('.hud-top-row')
        const topH = topRow?.getBoundingClientRect().height ?? ADVENTURE_LANDSCAPE_TOP_RESERVE
        const extraTop = Math.max(sat, Math.ceil(topH + 8) - baseHudPx())
        const side = Math.ceil(hudEl.getBoundingClientRect().width + 12)
        return { extraTop, side }
      }
      return { extraTop: Math.max(sat, ADVENTURE_PORTRAIT_HUD_RESERVE - baseHudPx()), side: 0 }
    }
    const hr = hudEl.getBoundingClientRect()
    const wantTop = Math.ceil(hr.bottom + 8)
    return { extraTop: Math.max(sat, wantTop - baseHudPx()), side: 0 }
  }

  function piecePlayfieldRect(): { x: number; y: number; w: number; h: number } {
    return {
      x: layout.ox,
      y: layout.oy + layout.padTop,
      w: layout.cols * layout.D,
      h: layout.rows * layout.D,
    }
  }

  function publishBoardCssVars() {
    const pf = piecePlayfieldRect()
    const br = boardRect()
    document.documentElement.style.setProperty('--playfield-x', `${pf.x}px`)
    document.documentElement.style.setProperty('--playfield-y', `${pf.y}px`)
    document.documentElement.style.setProperty('--playfield-w', `${pf.w}px`)
    document.documentElement.style.setProperty('--playfield-h', `${pf.h}px`)
    document.documentElement.style.setProperty('--board-x', `${br.x}px`)
    document.documentElement.style.setProperty('--board-w', `${br.w}px`)
  }

  function applyBoardLayout() {
    const { extraTop, side } = measureHudInset()
    const next =
      adventureLevel && mode === 'adventure'
        ? boardLayoutFixedGrid(innerWidth, innerHeight, adventureLevel.cols, adventureLevel.rows, extraTop, side)
        : boardLayout(innerWidth, innerHeight, extraTop, side)
    const dpr = computeTargetDpr()
    if (dpr !== canvasDpr) {
      canvasDpr = dpr
      invalidateBgCache()
    }
    canvas.width = Math.max(1, Math.round(innerWidth * dpr))
    canvas.height = Math.max(1, Math.round(innerHeight * dpr))
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`
    gfx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (next.D !== layout.D) invalidateBgCache()
    if (state && screen !== 'title' && !adventureLevel && (next.cols !== layout.cols || next.rows !== layout.rows)) {
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
    publishBoardCssVars()
    if (screen === 'play') draw()
  }

  const STAR2_SCORE = 20_000
  const STAR3_SCORE = 35_000

  function nativeDprCap(): number {
    return Math.min(2, devicePixelRatio || 1)
  }

  function computeTargetDpr(): number {
    const native = nativeDprCap()
    const area = Math.max(1, innerWidth * innerHeight)
    const areaCap = Math.sqrt(1_400_000 / area)
    const rel = PERF_REL[perfLevel] ?? 1
    let target = Math.min(native, areaCap * rel)
    if (native >= DPR_FLOOR) target = Math.max(DPR_FLOOR, target)
    return target
  }

  /** Canvas backing-store pixels per CSS px (read-only; does not change scale). */
  function backingDpr(): number {
    if (canvas.width < 1 || innerWidth < 1) return computeTargetDpr()
    return canvas.width / innerWidth
  }

  function tunePerfDpr(fps: number) {
    if (fps < 40) {
      perfSlowStreak += 1
      perfFastStreak = 0
      if (perfSlowStreak >= 2 && perfLevel < PERF_REL.length - 1) {
        perfLevel += 1
        perfSlowStreak = 0
        if (perfLastStep === 'up') perfFastNeed = Math.min(40, perfFastNeed * 2)
        else perfFastNeed = 5
        perfLastStep = 'down'
        perfFastStreak = 0
      }
    } else if (fps > 48) {
      perfFastStreak += 1
      perfSlowStreak = 0
      if (perfFastStreak >= perfFastNeed && perfLevel > 0) {
        perfLevel -= 1
        perfFastStreak = 0
        perfLastStep = 'up'
      }
    } else {
      perfSlowStreak = Math.max(0, perfSlowStreak - 1)
      perfFastStreak = Math.max(0, perfFastStreak - 1)
    }
  }

  function resize() {
    applyBoardLayout()
  }

  function center(p: Piece): { x: number; y: number } {
    const s = springs.get(p.id) ?? { ox: 0, oy: 0, vx: 0, vy: 0 }
    let yExtra = 0
    if (p.spawnT >= 0 && p.spawnT < 1) {
      const u = p.spawnT
      const ease = 1 - (1 - u) ** 2.2
      yExtra = -layout.D * 0.42 * (1 - ease)
    }
    return {
      x: layout.ox + (p.c + 0.5) * layout.D + s.ox,
      y: layout.oy + layout.padTop + (visualRow(p) + 0.5) * layout.D + yExtra + s.oy,
    }
  }

  function boardRect(): { x: number; y: number; w: number; h: number } {
    const D = layout.D
    return {
      x: layout.ox - D * 0.1,
      y: layout.oy,
      w: layout.cols * D + D * 0.2,
      h: layout.padTop + layout.rows * D + D * 0.18,
    }
  }

  function bubblePillSize(chainLen: number, bomb: boolean, rainbow: boolean): { w: number; h: number } {
    const D = layout.D
    const gold = bomb || rainbow
    const h = D * 0.55
    const w = D * (gold ? 1.05 : 0.92) + Math.max(0, chainLen - 2) * D * 0.08
    return { w, h }
  }

  function dragTipPiece(): Piece | null {
    const id = state.drag[state.drag.length - 1]
    return id != null ? (byId(state, id) ?? null) : null
  }

  function pillHitsPieceCentre(bx: number, by: number, px: number, py: number, forPlace = false): boolean {
    const bubbleR = layout.D * (forPlace ? 0.28 : 0.32)
    const pieceR = layout.D * 0.34
    return Math.hypot(bx - px, by - py) < bubbleR + pieceR
  }

  function neighbourCoverCounts(
    bx: number,
    by: number,
    tip: Piece,
    dragSet: Set<number>,
  ): { nonChain: number; inChain: number } {
    let nonChain = 0
    let inChain = 0
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue
        const p = at(state, tip.c + dc, tip.r + dr)
        if (!p || p.dead) continue
        if (!pillHitsPieceCentre(bx, by, center(p).x, center(p).y, true)) continue
        if (dragSet.has(p.id)) inChain += 1
        else nonChain += 1
      }
    }
    return { nonChain, inChain }
  }

  function clampPillInBoard(tx: number, ty: number, hw: number, hh: number, board: ReturnType<typeof boardRect>) {
    const D = layout.D
    return {
      x: Math.max(board.x + hw + D * 0.04, Math.min(board.x + board.w - hw - D * 0.04, tx)),
      y: Math.max(board.y + hh + D * 0.04, Math.min(board.y + board.h - hh - D * 0.04, ty)),
    }
  }

  function placeChainBubble(
    anchor: { x: number; y: number },
    rope: { x: number; y: number }[],
    chainLen: number,
  ): Scene['bubble'] {
    const D = layout.D
    const bomb = chainLen >= 5
    const rainbow = chainLen >= 7
    const pill = bubblePillSize(chainLen, bomb, rainbow)
    const hw = pill.w * 0.5
    const hh = pill.h * 0.5
    const board = boardRect()
    const prev = rope.length >= 2 ? rope[rope.length - 2]! : anchor
    const dragAway = anchor.x - prev.x >= 0 ? -1 : 1
    const tip = dragTipPiece()
    const tipPt = tip ? center(tip) : anchor
    const dragSet = new Set(state.drag)
    const boardMidX = board.x + board.w * 0.5
    const boardMidY = board.y + board.h * 0.5
    type Cand = {
      x: number
      y: number
      nonChain: number
      inChain: number
      dist: number
      up: number
      side: number
      inward: number
    }
    const cands: Cand[] = []
    for (const radius of [1.0, 1.25, 1.5]) {
      for (let i = 0; i < 8; i++) {
        const ang = -Math.PI / 2 + i * (Math.PI / 4)
        let tx = tipPt.x + Math.cos(ang) * D * radius
        let ty = tipPt.y + Math.sin(ang) * D * radius
        const clamped = clampPillInBoard(tx, ty, hw, hh, board)
        tx = clamped.x
        ty = clamped.y
        if (pillHitsPieceCentre(tx, ty, tipPt.x, tipPt.y, true)) continue
        const dist = Math.hypot(tx - anchor.x, ty - anchor.y)
        if (dist > D * 1.6) continue
        if (!tip) continue
        const cover = neighbourCoverCounts(tx, ty, tip, dragSet)
        cands.push({
          x: tx,
          y: ty,
          nonChain: cover.nonChain,
          inChain: cover.inChain,
          dist,
          up: -ty,
          side: dragAway * tx,
          inward: -Math.hypot(tx - boardMidX, ty - boardMidY),
        })
      }
    }
    const pick = (pool: Cand[]) =>
      pool.sort((a, b) => {
        if (a.nonChain !== b.nonChain) return a.nonChain - b.nonChain
        if (a.inChain !== b.inChain) return b.inChain - a.inChain
        if (a.up !== b.up) return a.up - b.up
        if (a.side !== b.side) return a.side - b.side
        if (a.inward !== b.inward) return a.inward - b.inward
        return a.dist - b.dist
      })[0]!
    let chosen: Cand | undefined
    const clear = cands.filter((c) => c.nonChain === 0)
    if (clear.length) chosen = pick(clear)
    else if (cands.length) chosen = pick(cands)
    else {
      chosen = {
        x: tipPt.x,
        y: tipPt.y + D * 0.92,
        nonChain: 0,
        inChain: 0,
        dist: D * 1.25,
        up: -(tipPt.y - D * 1.25),
        side: dragAway * tipPt.x,
        inward: -Math.hypot(tipPt.x - boardMidX, tipPt.y - D * 1.25 - boardMidY),
      }
      const clamped = clampPillInBoard(chosen.x, chosen.y, hw, hh, board)
      chosen.x = clamped.x
      chosen.y = clamped.y
    }
    return { x: chosen.x, y: chosen.y, n: chainLen, bomb, rainbow }
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
    const popId = getCosmetics().pop
    const lite = perfLevel > 0 || fpsBuf.some((f) => f < 44)
    const dotN = reduced || lite ? 7 : 10 + Math.floor(state.rng() * 5)
    const extra = bomb ? 8 : big ? 4 : 0
    for (let i = 0; i < dotN + extra; i++) {
      const a = state.rng() * Math.PI * 2
      const sp = layout.D * (4 + state.rng() * 5)
      const rad = layout.D * (0.08 + state.rng() * 0.08)
      const conf = bomb && i % 3 === 0
      const trailStar = popId === 'sparkle' || popId === 'stars'
      const trailHeart = popId === 'hearts'
      const trailBubble = popId === 'bubbles'
      const trailConf = popId === 'confetti' || conf
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - layout.D * (0.4 + state.rng() * 0.6),
        life: 450 + state.rng() * 200,
        age: 0,
        color: trailConf
          ? CONFETTI[Math.floor(state.rng() * CONFETTI.length)]!
          : trailHeart
            ? '#FF4F93'
            : trailBubble
              ? '#A8E8FF'
              : COLORS[color] ?? COLORS[0],
        kind: trailConf ? 'confetti' : trailStar ? 'star' : 'dot',
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
    const bombsBefore = state.track.bombsPopped
    const dragPts = state.drag
      .map((id) => byId(state, id))
      .filter((p): p is Piece => !!p)
      .map((p) => center(p))
    const t0 = performance.now()
    const ids = release(state)
    if (state.track.bombsPopped > bombsBefore) {
      meta.notifyFacts({ bomb: true, bombs: state.track.bombsPopped, chainLen: state.lastChainLen, score: state.score })
    } else if (state.lastChainLen >= 3) {
      meta.notifyFacts({ chainLen: state.lastChainLen, combo: state.combo, score: state.score, pops: state.track.clearedByColor.reduce((a, b) => a + b, 0) })
    }
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
    meta.persist()
    syncHud()
  }

  function show(next: Screen) {
    screen = next
    setToastBlocked(next === 'results')
    title.hidden = next !== 'title'
    hud.hidden = next !== 'play'
    pauseMenu.hidden = next !== 'pause'
    results.hidden = next !== 'results'
    setAudioPaused(next === 'pause')
    if (next === 'results') {
      finalEl.textContent = String(state.score)
      const prior = mode === 'cuddle' ? save.bestCuddle : mode === 'daily' ? save.dailyBest : save.bestTimed
      const isNew = mode !== 'adventure' && state.score > prior
      rememberBest()
      const best = mode === 'cuddle' ? save.bestCuddle : mode === 'daily' ? save.dailyBest : save.bestTimed
      const n =
        mode === 'adventure'
          ? (lastResultStars ?? 0)
          : (lastResultStars ?? (state.score >= STAR3_SCORE ? 3 : state.score >= STAR2_SCORE ? 2 : 1))
      if (mode === 'adventure') {
        newBestEl.hidden = lastAdventureWon
        newBestEl.textContent = lastAdventureWon ? '' : 'Out of moves!'
        bestEl.hidden = true
        rewardEl.textContent = lastAdventureWon ? 'Level clear!' : 'Keep squishing — try again!'
        resultRow.innerHTML = ''
        if (lastAdventureWon) {
          mkPill(resultRow, 'Next level', 'adventure-next', ICONS.play, 'primary')
          mkPill(resultRow, 'Map', 'adventure-map', PLUSH_ICONS.map)
          mkPill(resultRow, 'Replay', 'adventure-retry', ICONS.restart)
        } else {
          mkPill(resultRow, 'Retry', 'adventure-retry', ICONS.restart, 'primary')
          mkPill(resultRow, 'Map', 'adventure-map', PLUSH_ICONS.map)
        }
      } else {
        resultRow.innerHTML = ''
        mkPill(resultRow, 'Play again', 'restart', ICONS.play, 'primary')
        mkPill(resultRow, 'Home', 'home', ICONS.home)
      }
      rewardEl.hidden = false
      if (mode !== 'adventure') rewardEl.textContent = lastRunRewardNote || 'Nice squish!'
      const fill = results.querySelector('.xp-fill') as HTMLElement | null
      if (fill) {
        const need = Math.max(1, save.profile.xp + lastRunRewards.xp)
        const pct = Math.min(100, (save.profile.xp / need) * 100)
        fill.style.width = '0%'
        requestAnimationFrame(() => {
          fill.style.width = `${pct}%`
        })
      }
      coinRoll.textContent = ''
      if (lastRunRewards.coins > 0) {
        let n = 0
        const target = lastRunRewards.coins
        const step = () => {
          n = Math.min(target, n + Math.max(1, Math.ceil(target / 12)))
          coinRoll.textContent = `+${n} coins`
          if (n < target) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
      stars.innerHTML = [0, 1, 2]
        .map(
          (i) =>
            `<span class="star${i < n ? ' on' : ''}" style="transition-delay:${i * 180}ms" aria-hidden="true">${ICONS.star.replace('width="18"', 'width="44"').replace('height="18"', 'height="44"')}</span>`,
        )
        .join('')
      if (mode === 'adventure') {
        bestEl.hidden = true
      } else if (isNew) {
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
    titleBest.textContent = best > 0 ? `Best rush ${best}` : 'Best rush —'
    titleProfile.innerHTML = `<span class="title-stat">${PLUSH_ICONS.coin} <b>${save.profile.coins}</b></span><span class="title-stat">Lv <b>${save.profile.level}</b></span>`
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
    } else if (mode === 'adventure') {
      const showAdvHud = screen === 'play'
      timeEl.hidden = true
      movesPillEl.hidden = !showAdvHud
      hudGoalRow.hidden = !showAdvHud
      hud.classList.toggle('hud--adventure', showAdvHud)
      timeEl.classList.remove('pulse')
      const limit = adventureLevel?.moves ?? Math.max(1, state.movesLeft)
      const moves = bonusFinale ? bonusFinale.popsLeft : Math.max(0, state.movesLeft)
      const fillPct = Math.max(0, Math.min(100, (moves / limit) * 100))
      const t2 = Math.ceil(limit * 0.25)
      const t3 = Math.ceil(limit * 0.45)
      const pct2 = (t2 / limit) * 100
      const pct3 = (t3 / limit) * 100
      const on2 = moves >= t2
      const on3 = moves >= t3
      const pop2 = hudStarsLive.s2 && !on2
      const pop3 = hudStarsLive.s3 && !on3
      hudStarsLive = { s2: on2, s3: on3 }
      const bonus = bonusFinale ? ' bonus-active' : ''
      movesPillEl.className = `ui timer ring moves-pill${bonus}`
      movesPillEl.setAttribute('aria-label', `Moves left ${moves} of ${limit}`)
      movesPillEl.innerHTML = `<span class="moves-num">${moves}</span><span class="moves-lbl">moves</span>`
      starBarEl.innerHTML = `<div class="star-fill" style="width:${fillPct}%"></div>
        <span class="star-marker star-goal on" style="left:6%" title="Beat the level">★</span>
        <span class="star-marker star-s2 ${on2 ? 'on' : 'off'}${pop2 ? ' pop' : ''}" style="left:${pct2}%">★</span>
        <span class="star-marker star-s3 ${on3 ? 'on' : 'off'}${pop3 ? ' pop' : ''}" style="left:${pct3}%">★</span>`
      if (finaleHintEl) finaleHintEl.hidden = !bonusFinale
      if (adventureLevel && adventureGoals) {
        goalStripEl.hidden = false
        goalStripEl.innerHTML = adventureLevel.goals
          .map((g) => `<span class="goal-chip">${goalChip(g, adventureGoals!)}</span>`)
          .join('')
      } else {
        goalStripEl.hidden = true
        goalStripEl.innerHTML = ''
      }
      hudMini.hidden = true
      hudMini.innerHTML = ''
    } else {
      goalStripEl.hidden = true
      goalStripEl.innerHTML = ''
      hudGoalRow.hidden = true
      hud.classList.remove('hud--adventure')
      movesPillEl.hidden = true
      timeEl.hidden = false
      if (finaleHintEl) finaleHintEl.hidden = true
      hudMini.hidden = true
      hudMini.className = 'hud-mini ui'
      hudMini.innerHTML = ''
      const pct = Math.max(0, Math.min(1, state.timeLeft / 60_000))
      const dash = Math.max(0.02, pct) * 88
      timeEl.classList.toggle('pulse', secs <= 10 && screen === 'play')
      timeEl.innerHTML = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" fill="none" stroke="#ffe0f0" stroke-width="4"/><circle cx="26" cy="26" r="22" fill="none" stroke="#ff4f93" stroke-width="4" stroke-dasharray="${dash} 88" stroke-linecap="round" transform="rotate(-90 26 26)"/></svg><span>${secs}</span>`
    }
    if (screen === 'play') publishBoardCssVars()
  }

  function fresh(nextMode: Mode, seed: string) {
    resetRunPhase()
    perfLevel = 0
    perfSlowStreak = 0
    perfFastStreak = 0
    perfFastNeed = 5
    perfLastStep = null
    if (nextMode !== 'adventure') {
      adventureLevel = null
      adventureGoals = null
    }
    mode = nextMode
    pose = 'idle'
    particles = []
    waves = []
    beams = []
    floats = []
    springs.clear()
    ghostPath = []
    if (adventureLevel) {
      applyBoardLayout()
      state = createAdventureGame(adventureLevel, adventureLevel.cols, adventureLevel.rows)
      adventureGoals = emptyGoalState(adventureLevel.moves)
    } else {
      state = createGame(seed, layout.cols, layout.rows, nextMode)
    }
    if (nextMode === 'timed' || nextMode === 'daily') meta.touchStreak()
    ghostOn = tutParam || (!save.tut && !qaMode)
    clockOn = false
    clockRunMs = 0
    clockTickAt = 0
    ghostDemoDone = save.tut || qaMode
    ghostCycleStart = 0
    lastSimPhase = 'idle'
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
    if (!clockOn || mode === 'cuddle' || mode === 'adventure') return
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
    if (mode === 'adventure') return
    if (state.track.movesUsed <= 0 && clockRunMs < 2000 && state.timeLeft > ROUND_MS - 2500) return
    if (mode === 'daily') {
      if (save.dailyDay !== state.seed) {
        save.dailyDay = state.seed
        save.dailyBest = 0
      }
      save.dailyBest = Math.max(save.dailyBest, state.score)
    } else if (mode === 'cuddle') save.bestCuddle = Math.max(save.bestCuddle, state.score)
    else save.bestTimed = Math.max(save.bestTimed, state.score)
    meta.persist()
  }

  function showResults(score?: number) {
    if (bonusFinale) return
    if (resultsLocked) return
    if (score !== undefined) state.score = score
    const coinsBefore = save.profile.coins
    const xpBefore = save.profile.xp
  const pops = state.track.clearedByColor.reduce((a, b) => a + b, 0)
    if (mode === 'adventure' && adventureLevel && adventureGoals) {
      const bonusClear = movesLeftAtGoal > 0
      if (adventureGoals.movesUsed <= 0 && !allGoalsMet(adventureGoals, adventureLevel.goals) && !bonusClear) return
      syncAdventureGoalsFromTrack()
      if (bonusClear && !allGoalsMet(adventureGoals, adventureLevel.goals)) {
        adventureGoals.movesUsed = Math.max(1, adventureGoals.movesUsed)
        for (const g of adventureLevel.goals) {
          if (g.type === 'clear_color') adventureGoals.clearedByColor[g.color] = g.count
          else if (g.type === 'break_ice') adventureGoals.iceBroken = g.count
          else if (g.type === 'pop_bombs') adventureGoals.bombsPopped = g.count
          else if (g.type === 'clear_choco') adventureGoals.chocoCleared = g.count
          else if (g.type === 'score_moves') adventureGoals.score = Math.max(adventureGoals.score, g.score)
        }
      }
      const ev = evaluateStars(adventureGoals, adventureLevel, movesLeftAtGoal)
      lastAdventureWon = ev.goalMet
      lastResultStars = lastAdventureWon ? ev.stars : 0
      lastFinishedAdventureLevel = adventureLevel
      resultsLocked = true
      meta.onAdventureEnd(adventureLevel, adventureGoals, lastAdventureWon, movesLeftAtGoal)
    } else {
      resultsLocked = true
      lastResultStars = null
      meta.onRunEnd({
        mode,
        score: state.score,
        chainLen: state.lastChainLen,
        combo: state.combo,
        bombs: state.track.bombsPopped,
        rainbows: state.track.starbursts,
        pops,
      })
    }
    lastRunRewards = {
      coins: save.profile.coins - coinsBefore,
      xp: save.profile.xp - xpBefore,
    }
    lastRunRewardNote = lastRunRewards.xp > 0 ? `+${lastRunRewards.xp} XP` : 'Sweet round!'
    adventureLevel = null
    adventureGoals = null
    show('results')
  }

  function onAction(action: string) {
    if (!qaMode) unlockAudio(false)
    if (action === 'sfx') {
      save.muteSfx = !save.muteSfx
      setAudioPrefs({ sfx: !save.muteSfx })
      meta.persist()
      paintMutes()
      return
    }
    if (action === 'music') {
      save.muteMusic = !save.muteMusic
      setAudioPrefs({ music: !save.muteMusic })
      meta.persist()
      paintMutes()
      return
    }
    if (action === 'pause') openPause()
    else if (action === 'resume') {
      last = performance.now()
      clockTickAt = performance.now()
      showPlay()
    } else if (action === 'home') {
      if (screen === 'play' && mode === 'adventure') {
        meta.close()
        meta.open('map')
        show('title')
      } else if (screen === 'play') openPause()
      else {
        meta.close()
        show('title')
      }
    } else if (action === 'adventure-map') {
      meta.close()
      meta.open('map')
      show('title')
    } else if (action === 'adventure-next' && lastFinishedAdventureLevel) {
      const next = ADVENTURE_LEVELS.find((l) => l.id === lastFinishedAdventureLevel!.id + 1)
      if (next) startAdventureLevel(next)
      else {
        meta.open('map')
        show('title')
      }
    } else if (action === 'adventure-retry' && lastFinishedAdventureLevel) {
      startAdventureLevel(lastFinishedAdventureLevel)
    } else if (action === 'map' || action === 'shop' || action === 'achievements' || action === 'collection') {
      meta.open(action)
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
    if (bonusFinale) {
      finishBonusFinale()
      return
    }
    if (screen !== 'play') return
    if (!mayBeginChain(state)) {
      state.drag = []
      if (playRoundOver()) showResults()
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
    if (playRoundOver()) {
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
    if (state.phase === 'idle' && playRoundOver()) showResults()
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
    const liteSprings = perfLevel > 0 && frame % 2 === 0
    if (!frozen && !liteSprings) updateSprings(dt, now)
    updateParticles(dt)
    const popped = step(state, dt)
    if (lastSimPhase === 'clearing' && state.phase === 'falling') {
    }
    lastSimPhase = state.phase
    if (popped.length) notePops(popped)
    if (bonusFinale) {
      bonusFinale.elapsed += dt
      if (bonusFinale.elapsed >= bonusFinale.nextPopAt && bonusFinale.popsLeft > 0) {
        doBonusFinalePop()
        bonusFinale.popsLeft -= 1
        state.movesLeft = bonusFinale.popsLeft
        bonusFinale.nextPopAt += BONUS_POP_GAP_MS
      }
      if (bonusFinale.popsLeft <= 0 || bonusFinale.elapsed >= BONUS_CAP_MS) {
        finishBonusFinale()
        return
      }
      syncHud()
      return
    }
    if (mode === 'adventure' && adventureLevel && adventureGoals && state.phase === 'idle' && state.settled && !state.drag.length) {
      syncAdventureGoalsFromTrack()
      if (allGoalsMet(adventureGoals, adventureLevel.goals)) {
        const left = state.movesLeft
        movesLeftAtGoal = left
        if (left > 0) {
          bonusFinale = {
            popsLeft: left,
            popsTotal: left,
            elapsed: 0,
            nextPopAt: BONUS_POP_GAP_MS,
          }
          if (finaleHintEl) finaleHintEl.hidden = false
          setToastBlocked(true)
          state.inputLocked = true
          syncHud()
          return
        }
        showResults()
        return
      }
    }
    if (playRoundOver()) showResults()
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
    return {
      x: c.x,
      y: c.y,
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
        } else if (p.spawnT >= 0 && p.spawnT < 1 && !p.dead) {
          const u = p.spawnT
          const pop = u < 0.45 ? (u / 0.45) * 1.15 : 1.15 - ((u - 0.45) / 0.55) * 0.15
          sx = sy = pop
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
    const heapPt = titleHeapCenter(innerWidth, innerHeight)
    const heapCenterX = heapPt.x
    const heapCenterY = heapPt.y
    const hintColor = 1
    const hintSlots = new Set([0, 1, 2])
    if (screen === 'title' && !save.tut && !qaMode) {
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
          x: tip.x,
          y: tip.y,
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
      bubble = placeChainBubble(anchor, rope, chainLen)
    }
    const mat =
      screen === 'title'
        ? null
        : {
            x: layout.ox - D * 0.1,
            y: layout.oy - D * 0.06,
            w: layout.cols * D + D * 0.2,
            h: layout.padTop + layout.rows * D + D * 0.18,
          }
    return {
      w: innerWidth,
      h: innerHeight,
      dpr: backingDpr(),
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
      mat,
      pieceClip: null,
      peeks,
      liteRibbon: perfLevel > 0,
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
      const winFps = (fpsWinFrames * 1000) / elapsed
      fpsBuf.push(winFps)
      if (fpsBuf.length > 4) fpsBuf.shift()
      tunePerfDpr(winFps)
      fpsWinStart = now
      fpsWinFrames = 0
      const target = computeTargetDpr()
      if (Math.abs(target - canvasDpr) > 0.02) resize()
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

  function rectOverlap(a: DOMRect, b: { x: number; y: number; w: number; h: number }, slack = 2): boolean {
    const ix = Math.min(a.right, b.x + b.w) - Math.max(a.left, b.x)
    const iy = Math.min(a.bottom, b.y + b.h) - Math.max(a.top, b.y)
    return ix > slack && iy > slack
  }

  function circleRectOverlap(cx: number, cy: number, rad: number, r: DOMRect, slack = 1): boolean {
    const nearX = Math.max(r.left, Math.min(cx, r.right))
    const nearY = Math.max(r.top, Math.min(cy, r.bottom))
    return Math.hypot(cx - nearX, cy - nearY) < rad + slack
  }

  window.__piecePlayfieldRect = () => piecePlayfieldRect()

  window.__checkAdventureHudGoals = () => window.__checkHudPlayfield()

  window.__checkHudPlayfield = () => {
    const violations: string[] = []
    if (screen !== 'play') return { violations }
    const pf = piecePlayfieldRect()
    const hudSel =
      '#hud button, #hud .score, #hud .combo-badge, #hud .moves-pill, #hud .star-progress, #hud .goal-chip, #hud .timer.ring'
    const hudEls = [...document.querySelectorAll<HTMLElement>(hudSel)].filter((el) => {
      if (el.closest('[hidden]')) return false
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0
    })
    for (const el of hudEls) {
      const r = el.getBoundingClientRect()
      if (rectOverlap(r, pf, 1)) {
        violations.push(`hud on playfield: ${el.getAttribute('aria-label') || el.className}`)
      }
    }
    for (let i = 0; i < hudEls.length; i++) {
      for (let j = i + 1; j < hudEls.length; j++) {
        const a = hudEls[i]!.getBoundingClientRect()
        const b = hudEls[j]!.getBoundingClientRect()
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (ix > 2 && iy > 2) {
          violations.push(`hud overlap: ${hudEls[i]!.className} × ${hudEls[j]!.className}`)
        }
      }
    }
    const rad = layout.D * 0.46
    for (const p of state.pieces) {
      if (p.dead && p.popT < 0) continue
      if (p.fallT >= 0 && p.fallT < 1) continue
      const c = center(p)
      for (const el of hudEls) {
        if (circleRectOverlap(c.x, c.y, rad, el.getBoundingClientRect(), 2)) {
          violations.push(`hud on piece ${p.id} (${el.className})`)
        }
      }
    }
    const toast = document.querySelector('body > .meta-toast.ui')
    if (toast && getComputedStyle(toast).display !== 'none') {
      const tr = toast.getBoundingClientRect()
      if (rectOverlap(tr, pf, 1)) violations.push('toast on playfield')
      for (const p of state.pieces) {
        if (p.dead && p.popT < 0) continue
        const c = center(p)
        if (circleRectOverlap(c.x, c.y, rad, tr, 2)) violations.push(`toast on piece ${p.id}`)
      }
    }
    return { violations }
  }

  window.__checkPlayfieldInViewport = () => {
    const violations: string[] = []
    if (screen !== 'play') return { violations }
    const pf = piecePlayfieldRect()
    const sat = insetTop()
    const sab = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    const sal = 0
    const sar = 0
    if (pf.y < sat - 4) violations.push(`playfield top ${pf.y} < safe ${sat}`)
    if (pf.x < sal - 4) violations.push(`playfield left ${pf.x} < safe ${sal}`)
    if (pf.y + pf.h > innerHeight - sab + 4) violations.push(`playfield bottom off (${pf.y + pf.h} > ${innerHeight - sab})`)
    if (pf.x + pf.w > innerWidth - sar + 4) violations.push(`playfield right off (${pf.x + pf.w} > ${innerWidth - sar})`)
    return { violations }
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
    const br = piecePlayfieldRect()
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
    get lastChainLen() { return state.lastChainLen },
    get timeLeft() { return state.timeLeft },
    get movesLeft() { return state.movesLeft },
    get paused() { return screen === 'pause' },
    get inputLocked() { return state.inputLocked },
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
            spawning: p.spawnT >= 0 && p.spawnT < 1,
            spawnT: p.spawnT,
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
    backingDpr,
    pieceCenters() {
      return state.pieces.filter((p) => !p.dead).map((p) => center(p))
    },
    bubbleCheck() {
      const sc = scene(performance.now())
      const D = layout.D
      if (!sc.bubble) return { dist: Infinity, distOk: false, tipClear: true, neighbourCover: false, layoutD: D }
      const anchor =
        fingerOn && state.drag.length > 0 ? { x: fingerX, y: fingerY } : sc.finger ?? sc.rope[sc.rope.length - 1]!
      const dist = Math.hypot(sc.bubble.x - anchor.x, sc.bubble.y - anchor.y)
      const tip = dragTipPiece()
      const dragSet = new Set(state.drag)
      const tipClear = !tip || !pillHitsPieceCentre(sc.bubble.x, sc.bubble.y, center(tip).x, center(tip).y)
      const cover = tip ? neighbourCoverCounts(sc.bubble.x, sc.bubble.y, tip, dragSet) : { nonChain: 0, inChain: 0 }
      return {
        dist,
        distOk: dist <= D * 1.6,
        tipClear,
        neighbourCover: cover.nonChain > 0,
        layoutD: D,
      }
    },
    findEdgeChain(edge) {
      const cols = state.cols
      const rows = state.rows
      const tips: { c: number; r: number }[] = []
      if (edge === 'top') {
        for (let c = 0; c < cols; c++) tips.push({ c, r: 0 })
      } else if (edge === 'bottom') {
        for (let c = 0; c < cols; c++) tips.push({ c, r: rows - 1 })
      } else if (edge === 'left') {
        for (let r = 0; r < rows; r++) tips.push({ c: 0, r })
      } else if (edge === 'right') {
        for (let r = 0; r < rows; r++) tips.push({ c: cols - 1, r })
      } else if (edge === 'corner-tl') {
        tips.push({ c: 0, r: 0 })
      } else {
        tips.push({ c: cols - 1, r: rows - 1 })
      }
      for (const tip of tips) {
        for (let min = 4; min >= 2; min--) {
          const path = findPathEndingAt(state, min, tip.c, tip.r)
          if (path) return path.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
        }
      }
      return null
    },
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
    findGoalChain(min = 2) {
      const levelGoals = adventureLevel?.goals ?? []
      const needIce =
        adventureGoals &&
        levelGoals.some((g) => g.type === 'break_ice' && adventureGoals!.iceBroken < g.count)
      if (needIce) {
        for (let n = 8; n >= min; n--) {
          const cand = findPathTouchingKind(state, n, 'ice')
          if (cand) return cand.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
        }
      }
      const needChoco =
        adventureGoals &&
        levelGoals.some((g) => g.type === 'clear_choco' && adventureGoals!.chocoCleared < g.count)
      if (needChoco) {
        for (let n = 8; n >= min; n--) {
          const cand = findPathTouchingKind(state, n, 'choco')
          if (cand) return cand.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
        }
      }
      const goalColor = levelGoals.find((g) => g.type === 'clear_color')?.color
      for (let n = 8; n >= min; n--) {
        const cand = findPath(state, n)
        if (!cand) continue
        if (goalColor == null || cand[0]!.color === goalColor) {
          return cand.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
        }
      }
      const fallback = findPath(state, min)
      if (!fallback) return null
      return fallback.map((p) => ({ id: p.id, ...center(p), c: p.c, r: p.r }))
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
      if (fpsBuf.length) return fpsBuf[fpsBuf.length - 1]!
      const now = performance.now()
      if (fpsWinFrames > 2 && now > fpsWinStart) {
        return (fpsWinFrames * 1000) / (now - fpsWinStart)
      }
      return 60
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
      meta.persist()
      paintMutes()
    },
    openMeta(which, mapChapter?: number) {
      const ch = mapChapter as 1 | 2 | 3 | 4 | undefined
      meta.open(which, ch ? { mapChapter: ch } : undefined)
    },
    closeMeta() {
      meta.close()
    },
    prepPromoSave() {
      save.profile.stars = 80
      save.profile.coins = 120
      save.profile.level = 12
      for (const id of ['macaron', 'gummy', 'mochi', 'night', 'beach']) {
        if (id === 'macaron' || id === 'gummy' || id === 'mochi') {
          if (!save.owned.skins.includes(id)) save.owned.skins.push(id)
        } else if (!save.owned.themes.includes(id)) save.owned.themes.push(id)
      }
      save.achievements.first_bomb = 1
      meta.persist()
    },
    startAdventure(levelId) {
      const level = ADVENTURE_LEVELS.find((l) => l.id === levelId) ?? ADVENTURE_LEVELS[0]!
      startAdventureLevel(level)
      draw()
    },
    capturePopBurst() {
      const path = findPath(state, 6)
      if (!path) return
      state.drag = path.map((p) => p.id)
      release(state)
      for (let t = 0; t < 6; t++) {
        step(state, 18)
        draw()
      }
    },
    prepMapLock() {
      save.profile.stars = 6
      save.adventure.chapterStars = { '1': 6 }
      save.adventure.frontier = 18
      meta.persist()
    },
    prepAdventureLevel(levelId: number) {
      save.adventure.frontier = Math.max(1, levelId)
      save.adventure.chapterStars = { '1': 30, '2': 30, '3': 30, '4': 30 }
      for (const t of ['ice', 'choco', 'jelly', 'sleepy', 'starburst']) {
        if (!save.seenTips.includes(t)) save.seenTips.push(t)
      }
      meta.persist()
    },
    boardPieces() {
      return state.pieces
        .filter((p) => !p.dead)
        .map((p) => {
          const c = center(p)
          return {
            spawning: p.spawnT >= 0 && p.spawnT < 1,
            spawnT: p.spawnT,
            x: c.x,
            y: c.y,
          }
        })
    },
    markTipsSeen() {
      for (const t of ['ice', 'choco', 'jelly', 'sleepy', 'starburst']) {
        if (!save.seenTips.includes(t)) save.seenTips.push(t)
      }
      meta.persist()
    },
    playRealRound() {
      fresh('timed', seedParam ?? 'qa-real-round')
      showPlay()
      clockOn = true
      clockTickAt = performance.now()
      clockRunMs = 0
      let guard = 0
      while (state.timeLeft > 500 && guard++ < 900) {
        if (state.phase === 'idle') {
          if (!settleChain(guard % 3 === 0 ? 5 : 4)) {
            clockRunMs += 180
            state.timeLeft = Math.max(0, ROUND_MS - clockRunMs)
          }
        } else {
          step(state, 28)
        }
        syncWallClock(performance.now())
      }
      clockRunMs = ROUND_MS
      state.timeLeft = 0
      showResults()
    },
    buySkin(id: string) {
      save.profile.coins = Math.max(save.profile.coins, 300)
      purchase(save, id)
      meta.persist()
    },
    equipItem(id: string) {
      if (equip(save, id)) {
        meta.applyCosmetics()
        meta.persist()
      }
    },
    showBlockerTip(tipId: string) {
      showTipCard(tipId, () => {})
      freeze = true
    },
    earsOk() {
      return earsInsideMatAtRest(layout, 1) && earsInsideMatAtRest(layout, 0.82)
    },
    settleChain(min: number) {
      return settleChain(min)
    },
    hasBomb() {
      return state.pieces.some((p) => !p.dead && p.kind === 'bomb')
    },
    setMovesLeft(n: number) {
      if (!qaMode) return
      state.movesLeft = Math.max(0, n)
      syncHud()
      draw()
    },
    bonusActive() {
      return bonusFinale !== null
    },
    get lastMovesLeftAtGoal() {
      return movesLeftAtGoal
    },
    finalePopsTotal() {
      return bonusFinale?.popsTotal ?? 0
    },
    showTestToast() {
      if (!qaMode) return
      queueToast('Combo ×5!', '🎂')
    },
    adventureMovesTable(max: number) {
      return ADVENTURE_LEVELS.filter((l) => l.id <= max).map((l) => ({
        level: l.id,
        moves: l.moves,
        cols: l.cols,
        rows: l.rows,
        chapter: l.chapter,
        goals: l.goals.map((g) => {
          if (g.type === 'clear_color') return `c${g.color}:${g.count}`
          if (g.type === 'break_ice') return `ice:${g.count}`
          if (g.type === 'clear_choco') return `ch:${g.count}`
          if (g.type === 'pop_bombs') return `bomb:${g.count}`
          return g.type
        }),
      }))
    },
    finishAdventureWin() {
      if (!qaMode || mode !== 'adventure' || !adventureLevel || !adventureGoals) return
      for (const g of adventureLevel.goals) {
        if (g.type === 'clear_color') adventureGoals.clearedByColor[g.color] = g.count
        else if (g.type === 'break_ice') adventureGoals.iceBroken = g.count
        else if (g.type === 'pop_bombs') adventureGoals.bombsPopped = g.count
        else if (g.type === 'clear_choco') adventureGoals.chocoCleared = g.count
        else if (g.type === 'score_moves') adventureGoals.score = Math.max(adventureGoals.score, g.score)
      }
      syncAdventureGoalsFromTrack()
      movesLeftAtGoal = Math.max(1, state.movesLeft)
      showResults()
    },
    forceBonusFinale(moves: number) {
      if (!qaMode || mode !== 'adventure' || !adventureLevel || !adventureGoals) return
      const n = Math.max(1, moves)
      movesLeftAtGoal = n
      state.movesLeft = n
      syncAdventureGoalsFromTrack()
      adventureGoals.movesUsed = Math.max(1, adventureGoals.movesUsed)
      for (const g of adventureLevel.goals) {
        if (g.type === 'clear_color') adventureGoals.clearedByColor[g.color] = g.count
        else if (g.type === 'break_ice') adventureGoals.iceBroken = g.count
        else if (g.type === 'pop_bombs') adventureGoals.bombsPopped = g.count
        else if (g.type === 'clear_choco') adventureGoals.chocoCleared = g.count
        else if (g.type === 'score_moves') adventureGoals.score = Math.max(adventureGoals.score, g.score)
      }
      bonusFinale = {
        popsLeft: n,
        popsTotal: n,
        elapsed: 0,
        nextPopAt: BONUS_POP_GAP_MS,
      }
      state.inputLocked = true
      if (finaleHintEl) finaleHintEl.hidden = false
      setToastBlocked(true)
      syncHud()
      draw()
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
