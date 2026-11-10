import { initialField } from './lattice';
import { simulateShot, cupXAtTime } from './shot';
import type { Flavour } from './types';
import { makeRng } from './rng';

const SPAWN = { x: 500, y: 235 };

export function randomBotShots(seed: string): number {
  const rng = makeRng(seed);
  const { bonbons } = initialField(seed, 5);
  let shots = 0;
  const flavours: Flavour[] = ['berry', 'mint', 'lemon', 'blueberry'];
  while (shots < 300) {
    shots++;
    const angle = (rng() * 168 - 84) * (Math.PI / 180);
    const coat = flavours[Math.floor(rng() * flavours.length)];
    const cupX = cupXAtTime(seed, shots * 2);
    const res = simulateShot(
      { angleRad: angle, coat, spawnX: SPAWN.x, spawnY: SPAWN.y },
      bonbons,
      cupX,
    );
    if (res.contacts.length === 0 && res.ended === 'sea') {
      /* rise would happen — simplified: end run after empty contacts 3x */
    }
    const alive = bonbons.filter((b) => !b.popped);
    if (alive.length === 0) break;
    for (const c of res.contacts) {
      if (c.bonbon && c.pop) c.bonbon.popped = true;
    }
  }
  return shots;
}

export function greedyBestAngle(
  _seed: string,
  bonbons: import('./types').Bonbon[],
  coat: Flavour,
  cupX: number,
): number {
  let best = -Math.PI / 2;
  let bestScore = -1;
  for (let i = 0; i < 64; i++) {
    const deg = -84 + (168 * i) / 63;
    const angle = deg * (Math.PI / 180);
    const clone = bonbons.map((b) => ({ ...b }));
    const res = simulateShot(
      { angleRad: angle, coat, spawnX: SPAWN.x, spawnY: SPAWN.y },
      clone,
      cupX,
    );
    const score = res.contacts.filter((c) => c.pop).length;
    if (score > bestScore) {
      bestScore = score;
      best = angle;
    }
  }
  return best;
}
