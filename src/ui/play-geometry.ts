import { tokens } from '../tokens';
import { bonbonRadius } from '../sim/lattice';
import {
  MILK_BAND_U,
  computeLayout,
  cupScreenRect,
  puffScreenRect,
} from '../render/scene';
import { cupXAtTime } from '../sim/shot';
import {
  PORTRAIT_MOCKUP,
  milkBandMaxPx,
  mockupPuffCyPx,
} from '../render/layout-mockup';
import type { GameApp } from '../game/app';
import { paintBonbonPreview } from '../render/preview';

const W = tokens.layout;
const PITCH = W.lattice.rowPitch;
const BONBON_DRAW = 1.84;

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  pad = 2,
): boolean {
  const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return ix > pad && iy > pad;
}

function bonbonScreenBox(
  b: import('../sim/types').Bonbon,
  fx: number,
  fieldY: number,
  sc: number,
): { left: number; top: number; right: number; bottom: number } {
  const r = bonbonRadius(b.size);
  const hw = r * BONBON_DRAW * 0.5 * sc;
  const hh = r * BONBON_DRAW * 0.94 * sc;
  const sx = fx + b.x * sc;
  const sy = fieldY + b.y * sc;
  return {
    left: sx - hw,
    right: sx + hw,
    top: sy - hh * 0.55,
    bottom: sy + hh * 0.45,
  };
}

function canvasDpr(): number {
  const c = document.getElementById('field') as HTMLCanvasElement | null;
  if (!c || !c.width || !c.clientWidth) return Math.min(devicePixelRatio || 1, 2);
  return c.width / c.clientWidth;
}

function pixelLooksBonbon(d: Uint8ClampedArray): boolean {
  if (d[3] < 80) return false;
  const chroma = Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2]);
  const white = d[0] > 238 && d[1] > 238 && d[2] > 238;
  return chroma > 22 && !white;
}

function scanColour(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ox: number,
  oy: number,
  rw: number,
  rh: number,
): boolean {
  const step = Math.max(4, Math.floor(Math.min(rw, rh) / 14));
  for (let y = oy; y < oy + rh; y += step) {
    for (let x = ox; x < ox + rw; x += step) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (pixelLooksBonbon(ctx.getImageData(x, y, 1, 1).data)) return true;
    }
  }
  return false;
}

function sampleBubbleHasColour(
  L: ReturnType<typeof computeLayout>,
  landscape: boolean,
): boolean {
  if (landscape) {
    const prev = document.querySelector(
      '#next-preview',
    ) as HTMLCanvasElement | null;
    if (!prev) return false;
    const app = (window as unknown as { __bbApp?: GameApp }).__bbApp;
    if (app?.world) paintBonbonPreview(prev, app.world.nextCoat, 58);
    const ctx = prev.getContext('2d');
    if (!ctx || !prev.width) return false;
    const pad = Math.floor(prev.width * 0.12);
    return scanColour(ctx, prev.width, prev.height, pad, pad, prev.width - pad * 2, prev.height - pad * 2);
  }
  const canvas = document.getElementById('field') as HTMLCanvasElement | null;
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const nb = W.nextBubblePortrait;
  const dpr = canvasDpr();
  const cx = (L.fx + nb.x * L.scale) * dpr;
  const cy = (L.fieldY + L.nextWorldY * L.scale) * dpr;
  const r = nb.r * L.scale * dpr;
  return scanColour(
    ctx,
    canvas.width,
    canvas.height,
    Math.floor(cx - r * 0.92),
    Math.floor(cy - r * 0.92),
    Math.floor(r * 1.84),
    Math.floor(r * 1.84),
  );
}

export function checkPlayGeometry(app: GameApp): string[] {
  const world = app.world;
  if (!world || app.screen !== 'play') return [];
  const vw = innerWidth;
  const vh = innerHeight;
  const L = computeLayout(vw, vh);
  const fieldY = L.fieldY;
  const sc = L.scale;
  const fx = L.fx;
  const leftWall = fx + W.walls.leftX * sc;
  const rightWall = fx + W.walls.rightX * sc;
  const v: string[] = [];

  if (!L.landscape) {
    const milkViewport = milkBandMaxPx(vh);
    const milkOnCanvas = MILK_BAND_U * sc;
    const milkTotal = Math.min(vh, Math.max(milkOnCanvas, milkViewport));
    if (milkTotal > vh * 0.12 + 1) v.push('milk:band-too-tall');
  }

  for (const b of world.living()) {
    if (b.popped || b.falling) continue;
    const box = bonbonScreenBox(b, fx, fieldY, sc);
    if (box.left < leftWall + 1) v.push(`bonbon:${b.id}:left-wall`);
    if (box.right > rightWall - 1) v.push(`bonbon:${b.id}:right-wall`);
  }

  const puff = puffScreenRect(vw, vh);
  if (!L.landscape) {
    if (puff.left < -2 || puff.right > vw + 2 || puff.top < L.hudH - 4) {
      v.push('puff:offscreen');
    }
    const targetCy = mockupPuffCyPx(vh);
    if (Math.abs(puff.cy - targetCy) > vh * 0.08) v.push('puff:off-mockup');
  } else if (puff.top < 0 || puff.bottom > vh + 2) {
    v.push('puff:offscreen');
  }

  if (!L.landscape) {
    const nb = W.nextBubblePortrait;
    const ncx = fx + nb.x * sc;
    const nr = nb.r * sc;
    if (ncx + nr > rightWall - 3) v.push('next:right-wall');
    if (ncx + nr > vw - 2) v.push('next:offscreen');
    if (ncx - nr < leftWall + 3) v.push('next:left-wall');
  }

  if (!sampleBubbleHasColour(L, L.landscape)) v.push('next:empty-bubble');

  const tip = document.querySelector('.tip-tutorial');
  if (tip && world.shots === 0) {
    const tr = tip.getBoundingClientRect();
    if (tr.width > 0) {
      const tipR = {
        left: tr.left,
        top: tr.top,
        right: tr.right,
        bottom: tr.bottom,
      };
      if (rectsOverlap(tipR, puff)) v.push('tip:puff-overlap');
      const cupBandTop = W.seaSurfaceY - PITCH * 0.35;
      for (const b of world.living()) {
        if (b.falling || b.popped) continue;
        if (b.y > cupBandTop - bonbonRadius(b.size)) continue;
        const box = bonbonScreenBox(b, fx, fieldY, sc);
        if (rectsOverlap(tipR, box)) v.push('tip:bonbon-overlap');
      }
      const cupX = cupXAtTime(world.seed, world.shots + 0.001);
      const cup = cupScreenRect(L, cupX);
      if (rectsOverlap(tipR, cup)) v.push('tip:cup-overlap');
    }
  }

  const icingWorld = L.icingWorldY;
  let topBonbonY = Infinity;
  for (const b of world.living()) {
    if (!b.falling) topBonbonY = Math.min(topBonbonY, b.y - bonbonRadius(b.size));
  }
  if (!L.landscape) {
    const topRowScreen = fieldY + topBonbonY * sc;
    if (topRowScreen < puff.bottom + 6) v.push('field:top-row-under-puff');

    const py = L.puffWorldY;
    const pw = W.puffCloud.w;
    const puffBottomWorld = py - pw * 0.28 + pw * 0.52;
    if (icingWorld < puffBottomWorld + 12) v.push('icing:under-puff');
    const icingScreen = fieldY + icingWorld * sc;
    const icingTarget = vh * PORTRAIT_MOCKUP.icing;
    if (Math.abs(icingScreen - icingTarget) > vh * 0.06)
      v.push('icing:off-mockup');
    if (topRowScreen > icingScreen + PITCH * sc * 2.45)
      v.push('field:gap-under-icing');
    if (topRowScreen < icingScreen + 2) v.push('field:top-row-under-icing');
  }

  return [...new Set(v)];
}
