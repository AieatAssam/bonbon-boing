import { tokens } from '../tokens';
import { neighbours } from './lattice';
import { bonbonByKey } from './bonbon-map';
import type { Bonbon } from './types';

const SEA = tokens.layout.seaSurfaceY;
const G = tokens.physics.gravityU;

export function refreshSupportFlags(bonbons: Bonbon[]): void {
  const live = bonbons.filter((b) => !b.popped);
  const byKey = bonbonByKey(bonbons);
  for (const b of live) {
    if (b.falling) continue;
    let supported = false;
    if (b.row === 0) supported = true;
    else {
      for (const [nr, nc] of neighbours(b.row, b.col)) {
        if (nr >= b.row) continue;
        const below = byKey.get(`${nr},${nc}`);
        if (below && !below.popped && !below.falling) {
          supported = true;
          break;
        }
      }
    }
    if (!supported && b.y < SEA - 20) {
      b.falling = true;
      b.vy = (b.vy ?? 0) + 80;
      b.expr = 'worried';
    }
  }
}

export function tickFalling(bonbons: Bonbon[], dt: number): Bonbon[] {
  const splashes: Bonbon[] = [];
  const live = bonbons.filter((b) => !b.popped && b.falling);
  for (const b of live) {
    b.vy = (b.vy ?? 0) + G * dt;
    b.y += b.vy * dt;
    b.sy = 1.05;
    b.sx = 0.95;
    if (b.y >= SEA - 8) {
      b.y = SEA - 8;
      b.vy = -Math.abs(b.vy) * 0.35;
      b.sx = 1.2;
      b.sy = 0.8;
      if (Math.abs(b.vy) < 120) {
        b.popped = true;
        b.falling = false;
        splashes.push(b);
      }
    }
  }
  return splashes;
}
