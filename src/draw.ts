import type { Kind } from './sim'

const PAL = [
  { base: '#FF3D8E', deep: '#C10A55', light: '#FFE3F0', ear: '#FF7DB5', rim: '#FF96C5' },
  { base: '#2FDB8E', deep: '#0A8A50', light: '#D9FFED', ear: '#7FF0BC', rim: '#96F5CB' },
  { base: '#FFD02A', deep: '#C98600', light: '#FFF6CF', ear: '#FFE67A', rim: '#FFEB9E' },
  { base: '#5088FF', deep: '#1E52C8', light: '#E2EBFF', ear: '#93B8FF', rim: '#A8C6FF' },
  { base: '#FF7A28', deep: '#D24800', light: '#FFE5D6', ear: '#FFA96A', rim: '#FFBC8E' },
  { base: '#C070FF', deep: '#7A2AD4', light: '#F2E6FF', ear: '#E0B6FF', rim: '#E8C8FF' },
]

const RIBBON = ['#FF3D8E', '#2FDB8E', '#FFD02A', '#5088FF', '#FF7A28', '#C070FF']

export type DrawPiece = {
  id: number
  color: number
  kind: Kind
  x: number
  y: number
  sx: number
  sy: number
  popping: boolean
  popU: number
  selected: boolean
}

export type DrawParticle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  age: number
  color: string
  kind: 'dot' | 'confetti' | 'star' | 'goo'
  rot: number
  vr: number
  w: number
}

export type Scene = {
  w: number
  h: number
  dpr: number
  D: number
  t: number
  pieces: DrawPiece[]
  rope: { x: number; y: number }[]
  ropeColor: number
  chainLen: number
  bubble: { x: number; y: number; n: number; bomb: boolean; rainbow: boolean } | null
  titleHint: {
    rope: { x: number; y: number }[]
    ropeColor: number
    hand: { x: number; y: number; down: boolean; alpha: number }
  } | null
  finger: { x: number; y: number } | null
  particles: DrawParticle[]
  ghost: { x: number; y: number; down: boolean; alpha: number } | null
  flash: number
  bumpX: number
  bumpY: number
  floats: { x: number; y: number; text: string; age: number; big?: boolean }[]
  screen: 'title' | 'play' | 'pause' | 'results'
  heap: { color: number; kind: Kind; x: number; y: number; sx: number; sy: number; id: number }[]
  mat: { x: number; y: number; w: number; h: number } | null
  peeks: { color: number; x: number; y: number }[]
  dim: number
  waves: { x: number; y: number; r: number; age: number; life: number; color: string }[]
  beams: { x: number; y: number; angle: number; age: number; life: number; color: string }[]
  popRings: { x: number; y: number; age: number; life: number }[]
}

const cache = new Map<string, HTMLCanvasElement>()
export let spriteMisses = 0

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function ear(ctx: CanvasRenderingContext2D, color: number, cx: number, cy: number, r: number, stroke: string) {
  const pal = PAL[color % PAL.length]
  ctx.fillStyle = pal.ear
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, r * 0.07)
  ctx.lineJoin = 'round'
  if (color === 0) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * r * 0.15, cy - r * 0.72)
      ctx.lineTo(cx + s * r * 0.55, cy - r * 1.28)
      ctx.lineTo(cx + s * r * 0.95, cy - r * 0.62)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (color === 1) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + s * r * 0.48, cy - r * 1.05, r * 0.28, r * 0.55, s * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#FFF6FB'
      ctx.beginPath()
      ctx.ellipse(cx + s * r * 0.48, cy - r * 1.02, r * 0.14, r * 0.32, s * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = pal.ear
    }
  } else if (color === 2) {
    for (const [dx, dy, rr] of [
      [0, -1.15, 0.22],
      [-0.32, -0.95, 0.16],
      [0.32, -0.95, 0.16],
    ] as const) {
      ctx.beginPath()
      ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  } else if (color === 3) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + s * r * 0.95, cy - r * 0.05, r * 0.28, r * 0.42, s * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  } else if (color === 4) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + s * r * 0.62, cy - r * 0.92, r * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  } else {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
      const b = a + Math.PI / 5
      const sx = cx + Math.cos(a) * r * 0.42
      const sy = cy - r * 1.05 + Math.sin(a) * r * 0.42
      const bx = cx + Math.cos(b) * r * 0.22
      const by = cy - r * 1.05 + Math.sin(b) * r * 0.22
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
      ctx.lineTo(bx, by)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

function paintBomb(color: number, px: number): HTMLCanvasElement {
  const pal = PAL[color % PAL.length]
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const cx = px / 2
  const cy = px * 0.54
  const r = px * 0.44
  ctx.fillStyle = 'rgba(40, 12, 52, 0.18)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.96, r * 0.74, r * 0.19, 0, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.46, r * 0.05, cx + r * 0.05, cy + r * 0.1, r * 1.14)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.12, pal.light)
  g.addColorStop(0.5, pal.base)
  g.addColorStop(1, pal.deep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = pal.deep
  ctx.lineWidth = Math.max(2.5, r * 0.07)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.32, cy - r * 0.4, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2)
  ctx.fill()
  const star = r * 0.36
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#FFD93A'
  ctx.lineWidth = Math.max(2, r * 0.06)
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const b = a + Math.PI / 5
    ctx.lineTo(cx + Math.cos(a) * star, cy + r * 0.06 + Math.sin(a) * star)
    ctx.lineTo(cx + Math.cos(b) * star * 0.42, cy + r * 0.06 + Math.sin(b) * star * 0.42)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#FFB703'
  ctx.lineWidth = Math.max(2.5, r * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + r * 0.28, cy - r * 0.55)
  ctx.quadraticCurveTo(cx + r * 0.95, cy - r * 1.05, cx + r * 0.75, cy - r * 1.22)
  ctx.stroke()
  for (const [fx, fy] of [
    [cx + r * 0.75, cy - r * 1.22],
    [cx + r * 0.55, cy - r * 0.92],
    [cx + r * 0.82, cy - r * 0.88],
  ]) {
    ctx.fillStyle = fx === cx + r * 0.75 ? '#FFE566' : 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    const s = fx === cx + r * 0.75 ? r * 0.14 : r * 0.07
    if (fx === cx + r * 0.75) ctx.arc(fx, fy, s, 0, Math.PI * 2)
    else {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2
        ctx.lineTo(fx + Math.cos(a) * s, fy + Math.sin(a) * s)
        ctx.lineTo(fx + Math.cos(a + Math.PI / 4) * s * 0.35, fy + Math.sin(a + Math.PI / 4) * s * 0.35)
      }
      ctx.closePath()
    }
    ctx.fill()
  }
  return c
}

function paintRainbow(px: number): HTMLCanvasElement {
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const cx = px / 2
  const cy = px * 0.54
  const r = px * 0.44
  ctx.fillStyle = 'rgba(48, 24, 62, 0.16)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.96, r * 0.72, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  const core = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.04, cx, cy, r * 1.05)
  core.addColorStop(0, '#FFFFFF')
  core.addColorStop(0.35, '#FFF4FF')
  core.addColorStop(1, '#E8C4F8')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  const hues = ['#FF5A8A', '#FFD23A', '#3DDE97', '#5B8CFF', '#C084FC', '#FF7A28']
  hues.forEach((h, i) => {
    ctx.strokeStyle = h
    ctx.lineWidth = Math.max(3, r * 0.09)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy + r * 0.08, r * (0.42 + i * 0.1), Math.PI * 1.08, Math.PI * 1.92)
    ctx.stroke()
  })
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.3, cy - r * 0.38, r * 0.28, r * 0.16, -0.45, 0, Math.PI * 2)
  ctx.fill()
  for (const [tx, ty, s] of [
    [cx - r * 0.52, cy - r * 0.72, 0.08],
    [cx + r * 0.46, cy - r * 0.58, 0.1],
    [cx + r * 0.2, cy - r * 0.85, 0.07],
  ]) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    const rad = r * s
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      ctx.lineTo(tx + Math.cos(a) * rad, ty + Math.sin(a) * rad)
      ctx.lineTo(tx + Math.cos(a + Math.PI / 4) * rad * 0.35, ty + Math.sin(a + Math.PI / 4) * rad * 0.35)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#6A1F5C'
  ctx.beginPath()
  ctx.arc(cx - r * 0.18, cy + r * 0.08, r * 0.08, 0, Math.PI * 2)
  ctx.arc(cx + r * 0.18, cy + r * 0.08, r * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cx - r * 0.21, cy + r * 0.07, r * 0.03, 0, Math.PI * 2)
  ctx.arc(cx + r * 0.15, cy + r * 0.07, r * 0.03, 0, Math.PI * 2)
  ctx.fill()
  return c
}

function paintBody(kind: Kind, color: number, px: number): HTMLCanvasElement {
  if (kind === 'bomb') return paintBomb(color, px)
  if (kind === 'rainbow') return paintRainbow(px)
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const pal = PAL[color % PAL.length]
  const cx = px / 2
  const cy = px * 0.54
  const r = px * 0.44
  ctx.fillStyle = 'rgba(70, 30, 55, 0.14)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.96, r * 0.72, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ear(ctx, color, cx, cy, r, pal.deep)
  const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.5, r * 0.06, cx + r * 0.06, cy + r * 0.12, r * 1.12)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.12, pal.light)
  g.addColorStop(0.48, pal.base)
  g.addColorStop(1, pal.deep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = pal.deep
  ctx.lineWidth = Math.max(2.5, r * 0.07)
  ctx.stroke()
  ctx.strokeStyle = pal.rim
  ctx.lineWidth = Math.max(1.5, r * 0.05)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92, -0.6, 2.3)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.86)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.34, cy - r * 0.42, r * 0.34, r * 0.2, -0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.28, cy - r * 0.08, r * 0.16, r * 0.1, 0.4, 0, Math.PI * 2)
  ctx.fill()
  return c
}

function paintFace(blink: boolean, px: number): HTMLCanvasElement {
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const cx = px / 2
  const cy = px * 0.54
  const r = px * 0.44
  const ink = '#3A1530'
  ctx.fillStyle = 'rgba(255,110,160,0.52)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.52, cy + r * 0.16, r * 0.18, r * 0.11, 0, 0, Math.PI * 2)
  ctx.ellipse(cx + r * 0.52, cy + r * 0.16, r * 0.18, r * 0.11, 0, 0, Math.PI * 2)
  ctx.fill()
  const eyeY = cy - r * 0.02
  const eyeX = r * 0.34
  for (const s of [-1, 1]) {
    if (blink) {
      ctx.strokeStyle = ink
      ctx.lineWidth = Math.max(2, r * 0.08)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx + s * eyeX, eyeY, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.ellipse(cx + s * eyeX, eyeY, r * 0.23, r * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = ink
      ctx.lineWidth = Math.max(1.5, r * 0.045)
      ctx.stroke()
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(cx + s * eyeX + r * 0.02, eyeY + r * 0.045, r * 0.13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(cx + s * eyeX - r * 0.05, eyeY - r * 0.06, r * 0.055, 0, Math.PI * 2)
      ctx.arc(cx + s * eyeX + r * 0.08, eyeY + r * 0.03, r * 0.028, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1.5, r * 0.055)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.28, r * 0.17, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  return c
}

function sprite(key: string, paint: () => HTMLCanvasElement): HTMLCanvasElement {
  const hit = cache.get(key)
  if (hit) return hit
  spriteMisses += 1
  const made = paint()
  cache.set(key, made)
  return made
}

export function bodySprite(kind: Kind, color: number, px: number): HTMLCanvasElement {
  const key = kind === 'bonbon' ? `b:bonbon:${color}:${px}` : `b:${kind}:${color}:${px}`
  return sprite(key, () => paintBody(kind, color, px))
}

export function faceSprite(blink: boolean, px: number): HTMLCanvasElement {
  return sprite(blink ? `f:1:${px}` : `f:0:${px}`, () => paintFace(blink, px))
}

function blit(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  ox: number,
  oy: number,
  img: HTMLCanvasElement,
  x: number,
  y: number,
  dw: number,
  dh: number,
  sx: number,
  sy: number,
  alpha = 1,
) {
  ctx.globalAlpha = alpha
  ctx.setTransform(dpr * sx, 0, 0, dpr * sy, dpr * (x + ox), dpr * (y + oy))
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
}

/** Cached static sky + tray (includes clouds). */
let bgKey = ''
let bgCanvas: HTMLCanvasElement | null = null

export function invalidateBgCache(): void {
  bgKey = ''
  bgCanvas = null
}

function drawSkyStatic(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#9AD8FF')
  sky.addColorStop(0.45, '#DDF3FF')
  sky.addColorStop(1, '#FFD9EE')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  for (let i = 0; i < 16; i++) {
    const sx = (i * 97 + 40) % w
    const sy = (i * 61 + 30) % h
    ctx.beginPath()
    ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 173 + 90) % (w + 120)) - 60
    const cy = 40 + (i % 3) * 50
    ctx.beginPath()
    ctx.ellipse(cx, cy, 42 + (i % 2) * 12, 22, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 32, cy + 6, 34, 18, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - 28, cy + 8, 28, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function ensureBgCache(
  w: number,
  h: number,
  dpr: number,
  mat: { x: number; y: number; w: number; h: number } | null,
  D: number,
  screen: Scene['screen'],
): HTMLCanvasElement {
  const matKey = mat ? `${mat.x},${mat.y},${mat.w},${mat.h}` : 'none'
  const key = `${w}x${h}@${dpr}:${screen}:${matKey}:${D}`
  if (bgCanvas && key === bgKey) return bgCanvas
  const c = canvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)))
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  drawSkyStatic(ctx, w, h)
  if (screen !== 'title' && mat) drawTray(ctx, mat, D)
  bgCanvas = c
  bgKey = key
  return c
}

function drawTray(ctx: CanvasRenderingContext2D, m: { x: number; y: number; w: number; h: number }, D: number) {
  const g = ctx.createLinearGradient(m.x, m.y, m.x, m.y + m.h)
  g.addColorStop(0, 'rgba(255,255,255,0.94)')
  g.addColorStop(0.5, 'rgba(255,244,250,0.88)')
  g.addColorStop(1, 'rgba(255,220,236,0.92)')
  ctx.fillStyle = g
  ctx.strokeStyle = '#FFB8D9'
  ctx.lineWidth = Math.max(3, D * 0.055)
  round(ctx, m.x, m.y, m.w, m.h, D * 0.3)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'
  ctx.lineWidth = Math.max(2, D * 0.035)
  ctx.beginPath()
  ctx.moveTo(m.x + D * 0.2, m.y + D * 0.12)
  ctx.lineTo(m.x + m.w - D * 0.2, m.y + D * 0.12)
  ctx.stroke()
}

function drawRibbon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], color: number, width: number) {
  if (pts.length < 2) return
  const col = RIBBON[color % RIBBON.length]
  const deep = PAL[color % PAL.length].deep
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = width * 1.22
  strokeRope(ctx, pts)
  ctx.strokeStyle = col
  ctx.lineWidth = width
  strokeRope(ctx, pts)
  ctx.strokeStyle = deep
  ctx.globalAlpha = 0.55
  ctx.lineWidth = width * 0.55
  strokeRope(ctx, pts)
  ctx.globalAlpha = 1
}

function drawChainBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  n: number,
  D: number,
  bomb: boolean,
  rainbow: boolean,
) {
  const gold = bomb || rainbow
  const s = D * (gold ? 0.44 : 0.36) * (1 + Math.min(0.1, n * 0.018))
  ctx.fillStyle = gold ? 'rgba(255, 214, 92, 0.95)' : 'rgba(255,255,255,0.94)'
  ctx.strokeStyle = gold ? '#E8A400' : '#FF8CB8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, s, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = gold ? '#7A4A00' : '#D41468'
  ctx.font = `700 ${Math.round(D * 0.34)}px "Fredoka Variable", system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`x${n}`, x, y + 1)
}

export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, blink: boolean): void {
  const { w, h, D } = scene
  const dpr = scene.dpr
  const px = Math.max(32, Math.round(D * dpr))
  const pieceD = D * 0.88
  const bg = ensureBgCache(w, h, dpr, scene.mat, D, scene.screen)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(bg, 0, 0)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.save()
  ctx.translate(scene.bumpX, scene.bumpY)
  const ox = scene.bumpX
  const oy = scene.bumpY
  for (const h of scene.heap) {
    blit(ctx, dpr, ox, oy, bodySprite(h.kind, h.color, px), h.x, h.y, pieceD, pieceD, h.sx, h.sy)
    blit(ctx, dpr, ox, oy, faceSprite(false, px), h.x, h.y + pieceD * (1 - h.sy) * 0.08, pieceD, pieceD, 1, 1)
  }
  for (const p of scene.peeks) {
    blit(ctx, dpr, ox, oy, bodySprite('bonbon', p.color, px), p.x, p.y, pieceD, pieceD, 1, 1)
    blit(ctx, dpr, ox, oy, faceSprite(false, px), p.x, p.y, pieceD, pieceD, 1, 1)
  }
  for (const p of scene.pieces) {
    const alpha = p.popping ? Math.max(0, 1 - p.popU) : 1
    if (p.popping && p.popU >= 0.99) continue
    const drawKind = p.kind
    blit(ctx, dpr, ox, oy, bodySprite(drawKind, p.color, px), p.x, p.y, pieceD, pieceD, p.sx, p.sy, alpha)
    if (p.selected && !p.popping) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
      ctx.globalAlpha = 1
      const ring = RIBBON[p.color % RIBBON.length]
      ctx.strokeStyle = ring
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = ring
      ctx.lineWidth = Math.max(9, D * 0.16)
      ctx.beginPath()
      ctx.arc(p.x, p.y, pieceD * 0.54, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineWidth = Math.max(4, D * 0.09)
      ctx.beginPath()
      ctx.arc(p.x, p.y, pieceD * 0.54, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (!p.popping && p.kind === 'bonbon') {
      blit(
        ctx,
        dpr,
        ox,
        oy,
        faceSprite(blink, px),
        p.x,
        p.y + pieceD * (1 - p.sy) * 0.1,
        pieceD,
        pieceD,
        1,
        1,
        1,
      )
    }
    if (!p.popping && (p.kind === 'bomb' || p.kind === 'rainbow')) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
      const pulse =
        0.74 +
        Math.sin(scene.t / (p.kind === 'bomb' ? 130 : 180) + p.id) * (p.kind === 'bomb' ? 0.16 : 0.1)
      ctx.strokeStyle = p.kind === 'bomb' ? 'rgba(255, 120, 220, 0.82)' : 'rgba(120, 220, 255, 0.65)'
      ctx.lineWidth = Math.max(3, D * 0.1) * pulse
      ctx.beginPath()
      ctx.arc(p.x, p.y, pieceD * 0.58 * pulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  if (scene.titleHint && scene.titleHint.rope.length > 1) {
    ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
    drawRibbon(ctx, scene.titleHint.rope, scene.titleHint.ropeColor, D * 0.2)
    drawHand(
      ctx,
      scene.titleHint.hand.x,
      scene.titleHint.hand.y,
      D,
      scene.titleHint.hand.down,
      scene.titleHint.hand.alpha,
    )
  }
  if (scene.rope.length > 1) {
    ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
    drawRibbon(ctx, scene.rope, scene.ropeColor, D * 0.22)
    if (scene.bubble) {
      const b = scene.bubble
      drawChainBubble(ctx, b.x, b.y, b.n, D, b.bomb, b.rainbow)
    }
    if (scene.finger) {
      const fp = scene.finger
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = RIBBON[scene.ropeColor % RIBBON.length]
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(fp.x, fp.y, Math.max(6, D * 0.09), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  for (const ring of scene.popRings) {
    const u = ring.age / ring.life
    ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.globalAlpha = Math.max(0, 1 - u)
    ctx.lineWidth = Math.max(2, D * 0.06) * (1 - u * 0.25)
    ctx.beginPath()
    ctx.arc(ring.x, ring.y, D * 0.9 * u, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  for (const wave of scene.waves) {
    const u = wave.age / wave.life
    ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
    ctx.strokeStyle = wave.color
    ctx.globalAlpha = Math.max(0, 0.95 * (1 - u * 0.85))
    ctx.lineWidth = Math.max(4, D * 0.12) * (1 - u * 0.35)
    ctx.beginPath()
    ctx.arc(wave.x, wave.y, wave.r + u * D * 3.5 * 1.05, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = Math.max(2, D * 0.05) * (1 - u)
    ctx.beginPath()
    ctx.arc(wave.x, wave.y, wave.r + u * D * 2.05, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  for (const beam of scene.beams) {
    const u = beam.age / beam.life
    ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
    ctx.strokeStyle = beam.color
    ctx.globalAlpha = Math.max(0, 0.7 * (1 - u))
    ctx.lineWidth = Math.max(4, D * 0.09)
    ctx.beginPath()
    ctx.moveTo(beam.x, beam.y)
    ctx.lineTo(beam.x + Math.cos(beam.angle) * D * 2.2, beam.y + Math.sin(beam.angle) * D * 2.2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
  ctx.globalAlpha = 1
  for (const q of scene.particles) {
    const u = q.age / q.life
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - u)
    ctx.translate(q.x, q.y)
    ctx.rotate(q.rot)
    ctx.fillStyle = q.color
    if (q.kind === 'confetti') ctx.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2)
    else if (q.kind === 'star') {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
        const b = a + Math.PI / 5
        ctx.lineTo(Math.cos(a) * q.w, Math.sin(a) * q.w)
        ctx.lineTo(Math.cos(b) * q.w * 0.42, Math.sin(b) * q.w * 0.42)
      }
      ctx.closePath()
      ctx.fill()
    } else if (q.kind === 'goo') {
      ctx.beginPath()
      ctx.ellipse(0, 0, q.w * 0.55, q.w * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, q.w / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()
  if (scene.ghost && scene.ghost.alpha > 0.02) {
    drawHand(ctx, scene.ghost.x, scene.ghost.y, scene.D, scene.ghost.down, scene.ghost.alpha)
  }
  if (scene.dim > 0.01) {
    ctx.fillStyle = `rgba(58, 24, 52, ${scene.dim * 0.42})`
    ctx.fillRect(0, 0, w, h)
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, `rgba(48,16,42,${scene.dim * 0.35})`)
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
  }
  if (scene.flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${scene.flash})`
    ctx.fillRect(0, 0, w, h)
  }
  ctx.font = `800 ${Math.round(D * (scene.floats.some((f) => f.big) ? 0.56 : 0.46))}px "Fredoka Variable", system-ui`
  ctx.textAlign = 'center'
  ctx.lineWidth = 5
  const floatPad = D * 0.4
  for (const f of scene.floats) {
    const u = f.age / 900
    const bounce = Math.sin(u * Math.PI) * D * 0.12
    const a = Math.max(0, 1 - u)
    ctx.globalAlpha = a
    ctx.strokeStyle = '#FFFFFF'
    ctx.fillStyle = f.big ? '#FF9A00' : '#E2186E'
    const y = f.y - bounce
    const x = Math.min(w - floatPad, Math.max(floatPad, f.x))
    ctx.strokeText(f.text, x, y)
    ctx.fillText(f.text, x, y)
  }
  ctx.globalAlpha = 1
}

function strokeRope(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.stroke()
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  D: number,
  down: boolean,
  alpha: number,
) {
  const s = D / 70
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.scale(s * (down ? 1.04 : 1), s * (down ? 0.94 : 1))
  ctx.fillStyle = '#FFE8C8'
  ctx.strokeStyle = '#3A1530'
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.ellipse(2, -18, 9, 16, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 8, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#FF8AB8'
  ctx.beginPath()
  ctx.roundRect(-16, 12, 32, 12, 6)
  ctx.fill()
  ctx.restore()
}
