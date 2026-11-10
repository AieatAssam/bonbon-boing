import { tokens } from '../tokens';
import { bonbonRadius } from '../sim/lattice';
import { computeLayout, puffScreenRect } from '../render/scene';
import type { GameApp } from '../game/app';

const W = tokens.layout;
const PITCH = W.lattice.rowPitch;

function bonbonHalfW(size: import('../sim/types').Size): number {
  return bonbonRadius(size) * 1.01;
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

  for (const b of world.living()) {
    if (b.popped || b.falling) continue;
    const hw = bonbonHalfW(b.size) * sc;
    const sx = fx + b.x * sc;
    if (sx - hw < leftWall + 1) v.push(`bonbon:${b.id}:left-wall`);
    if (sx + hw > rightWall - 1) v.push(`bonbon:${b.id}:right-wall`);
  }

  const puff = puffScreenRect(vw, vh);
  if (!L.landscape) {
    if (puff.left < -2 || puff.right > vw + 2 || puff.top < L.hudH - 4) {
      v.push('puff:offscreen');
    }
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

  const cupBandTop = W.seaSurfaceY - PITCH * 0.35;
  const tip = document.querySelector('.tip-milk');
  if (tip && world.shots === 0) {
    const tr = tip.getBoundingClientRect();
    if (tr.width > 0) {
      for (const b of world.living()) {
        if (b.falling) continue;
        if (b.y > cupBandTop - bonbonRadius(b.size) * 0.5) continue;
        const hw = bonbonHalfW(b.size) * sc;
        const sy = fieldY + b.y * sc;
        const sx = fx + b.x * sc;
        const ix =
          Math.min(tr.right, sx + hw) - Math.max(tr.left, sx - hw);
        const iy =
          Math.min(tr.bottom, sy + hw) - Math.max(tr.top, sy - hw);
        if (ix > 2 && iy > 2) v.push('tip:bonbon-overlap');
      }
    }
  }

  const icingWorld = W.frostingY;
  let topBonbonY = Infinity;
  for (const b of world.living()) {
    if (!b.falling) topBonbonY = Math.min(topBonbonY, b.y - bonbonRadius(b.size));
  }
  if (!L.landscape) {
    const puffBottom = puff.bottom;
    const topRowScreen = fieldY + topBonbonY * sc;
    if (topRowScreen < puffBottom + 6) v.push('field:top-row-under-puff');

    const icingScreen = fieldY + icingWorld * sc;
    if (icingScreen < puffBottom + 6) v.push('icing:under-puff');
    if (topRowScreen < icingScreen + 10) v.push('field:top-row-under-icing');
  }

  return [...new Set(v)];
}
