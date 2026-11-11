import type { Kind } from './sim'

const INK = '#4A2440'
const PAL = [
  { base: '#FF4F93', deep: '#D41468', light: '#FFD5E8', ear: '#FF8BB8' },
  { base: '#2FDB8E', deep: '#0B9A58', light: '#D7FFE8', ear: '#86F2BC' },
  { base: '#FFD23A', deep: '#E09600', light: '#FFF4C8', ear: '#FFE58A' },
  { base: '#5B8CFF', deep: '#2A58D6', light: '#DEE7FF', ear: '#9BB6FF' },
  { base: '#FF8A4A', deep: '#E85E18', light: '#FFE2D2', ear: '#FFB18A' },
]

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
  kind: 'dot' | 'confetti'
  rot: number
  vr: number
  w: number
}

export type Scene = {
  w: number
  h: number
  dpr: number
  D: number
  pieces: DrawPiece[]
  rope: { x: number; y: number }[]
  particles: DrawParticle[]
  ghost: { x: number; y: number; down: boolean; alpha: number } | null
  flash: number
  bumpX: number
  bumpY: number
  floats: { x: number; y: number; text: string; age: number }[]
  screen: 'title' | 'play' | 'pause' | 'results'
  heap: { color: number; kind: Kind; x: number; y: number; sx: number; sy: number }[]
  mat: { x: number; y: number; w: number; h: number } | null
  peeks: { color: number; x: number; y: number }[]
}

const cache = new Map<string, HTMLCanvasElement>()
export let spriteMisses = 0

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function ear(ctx: CanvasRenderingContext2D, color: number, cx: number, cy: number, r: number) {
  const pal = PAL[color]
  ctx.fillStyle = pal.ear
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(2, r * 0.08)
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
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + s * r * 0.62, cy - r * 0.92, r * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}

function paintBody(kind: Kind, color: number, px: number): HTMLCanvasElement {
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const pal = kind === 'rainbow' ? { base: '#FFF7FB', deep: '#F3D2E4', light: '#FFFFFF', ear: '#FFE0A8' } : PAL[color]
  const cx = px / 2
  const cy = px * 0.56
  const r = px * 0.32
  ctx.fillStyle = 'rgba(90, 40, 70, 0.16)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.92, r * 0.78, r * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  if (kind !== 'rainbow') ear(ctx, color, cx, cy, r)
  else {
    ctx.fillStyle = '#FFE08A'
    ctx.strokeStyle = INK
    ctx.lineWidth = Math.max(2, r * 0.08)
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.55, cy - r * 0.7)
    ctx.lineTo(cx - r * 0.28, cy - r * 1.25)
    ctx.lineTo(cx, cy - r * 0.78)
    ctx.lineTo(cx + r * 0.28, cy - r * 1.25)
    ctx.lineTo(cx + r * 0.55, cy - r * 0.7)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(cx, cy, r + px * 0.025, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.08, cx, cy + r * 0.1, r * 1.05)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.16, pal.light)
  g.addColorStop(0.5, pal.base)
  g.addColorStop(1, pal.deep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.28, cy - r * 0.38, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2)
  ctx.fill()
  if (kind === 'bomb') {
    ctx.fillStyle = '#3A2148'
    ctx.beginPath()
    const s = r * 0.28
    ctx.moveTo(cx, cy + r * 0.05 - s)
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
      const b = a + Math.PI / 5
      ctx.lineTo(cx + Math.cos(a) * s, cy + r * 0.05 + Math.sin(a) * s)
      ctx.lineTo(cx + Math.cos(b) * s * 0.45, cy + r * 0.05 + Math.sin(b) * s * 0.45)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#6A3A18'
    ctx.lineWidth = Math.max(2, r * 0.07)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx + r * 0.35, cy - r * 0.55)
    ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 0.95, cx + r * 0.7, cy - r * 1.15)
    ctx.stroke()
    ctx.fillStyle = '#FFB703'
    ctx.beginPath()
    ctx.arc(cx + r * 0.7, cy - r * 1.18, r * 0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFF3B0'
    ctx.beginPath()
    ctx.arc(cx + r * 0.66, cy - r * 1.22, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }
  if (kind === 'rainbow') {
    const hues = ['#FF5A8A', '#FFD23A', '#3DDE97', '#5B8CFF', '#C084FC']
    hues.forEach((h, i) => {
      ctx.strokeStyle = h
      ctx.lineWidth = Math.max(2, r * 0.07)
      ctx.beginPath()
      ctx.arc(cx, cy + r * 0.15, r * (0.55 + i * 0.08), Math.PI * 1.05, Math.PI * 1.95)
      ctx.stroke()
    })
  }
  return c
}

function paintFace(blink: boolean, px: number): HTMLCanvasElement {
  const c = canvas(px, px)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const cx = px / 2
  const cy = px * 0.56
  const r = px * 0.32
  ctx.fillStyle = 'rgba(255,110,160,0.45)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.55, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2)
  ctx.ellipse(cx + r * 0.55, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  const eyeY = cy - r * 0.02
  const eyeX = r * 0.32
  for (const s of [-1, 1]) {
    if (blink) {
      ctx.strokeStyle = INK
      ctx.lineWidth = Math.max(2, r * 0.08)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx + s * eyeX, eyeY, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.ellipse(cx + s * eyeX, eyeY, r * 0.2, r * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = INK
      ctx.lineWidth = Math.max(1.5, r * 0.05)
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(cx + s * eyeX + r * 0.02, eyeY + r * 0.04, r * 0.11, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(cx + s * eyeX - r * 0.04, eyeY - r * 0.05, r * 0.045, 0, Math.PI * 2)
      ctx.arc(cx + s * eyeX + r * 0.07, eyeY + r * 0.02, r * 0.025, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(1.5, r * 0.06)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.28, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI)
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

export function resetSpriteStats(): void {
  spriteMisses = 0
}

export function bodySprite(kind: Kind, color: number, px: number): HTMLCanvasElement {
  const c = kind === 'rainbow' ? 0 : color
  const key = `b:${kind}:${c}:${px}`
  return sprite(key, () => paintBody(kind, c, px))
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

export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, blink: boolean): void {
  const { w, h, D } = scene
  const dpr = scene.dpr
  const px = Math.max(32, Math.round(D * dpr))
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#9AD8FF')
  sky.addColorStop(0.55, '#E7F6FF')
  sky.addColorStop(1, '#FFD4EC')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.translate(scene.bumpX, scene.bumpY)
  if (scene.mat) {
    const m = scene.mat
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.strokeStyle = '#FFC4DE'
    ctx.lineWidth = Math.max(3, D * 0.06)
    round(ctx, m.x, m.y, m.w, m.h, D * 0.28)
    ctx.fill()
    ctx.stroke()
  }
  if (scene.rope.length > 1) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = D * 0.2
    strokeRope(ctx, scene.rope)
    ctx.strokeStyle = 'rgba(255,180,210,0.95)'
    ctx.lineWidth = D * 0.08
    strokeRope(ctx, scene.rope)
  }
  const ox = scene.bumpX
  const oy = scene.bumpY
  for (const h of scene.heap) {
    blit(ctx, dpr, ox, oy, bodySprite(h.kind, h.color, px), h.x, h.y, D, D, h.sx, h.sy)
    blit(ctx, dpr, ox, oy, faceSprite(false, px), h.x, h.y + D * (1 - h.sy) * 0.08, D, D, 1, 1)
  }
  for (const p of scene.peeks) {
    blit(ctx, dpr, ox, oy, bodySprite('bonbon', p.color, px), p.x, p.y, D, D, 1, 1)
    blit(ctx, dpr, ox, oy, faceSprite(false, px), p.x, p.y, D, D, 1, 1)
  }
  for (const p of scene.pieces) {
    const alpha = p.popping ? Math.max(0, 1 - p.popU) : 1
    const faceScale = p.popping ? Math.max(0, 1 - p.popU) : 1
    blit(ctx, dpr, ox, oy, bodySprite(p.kind, p.color, px), p.x, p.y, D, D, p.sx, p.sy, alpha)
    if (p.selected && !p.popping) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = Math.max(3, D * 0.07)
      ctx.beginPath()
      ctx.arc(p.x, p.y, D * 0.48, 0, Math.PI * 2)
      ctx.stroke()
    }
    blit(
      ctx,
      dpr,
      ox,
      oy,
      faceSprite(blink && !p.popping, px),
      p.x,
      p.y + (p.popping ? 0 : D * (1 - p.sy) * 0.12),
      D,
      D,
      faceScale,
      faceScale,
      alpha,
    )
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
    if (q.kind === 'confetti') {
      ctx.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2)
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
  if (scene.flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${scene.flash})`
    ctx.fillRect(0, 0, w, h)
  }
  ctx.font = `700 ${Math.round(D * 0.42)}px "Fredoka Variable", system-ui`
  ctx.textAlign = 'center'
  ctx.lineWidth = 4
  for (const f of scene.floats) {
    const a = Math.max(0, 1 - f.age / 700)
    ctx.globalAlpha = a
    ctx.strokeStyle = '#FFFFFF'
    ctx.fillStyle = '#E2186E'
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillText(f.text, f.x, f.y)
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
  ctx.strokeStyle = INK
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
