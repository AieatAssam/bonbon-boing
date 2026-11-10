import { tokens } from '../tokens';
import { bonbonRadius } from './lattice';
import { hugChainBfs } from './chain';
import { bonbonByKey } from './bonbon-map';
import type { Bonbon, Flavour, PipState } from './types';
export type { PipState };
import { makeRng } from './rng';

const P = tokens.physics;
const W = tokens.layout.walls;

export interface ShotInput {
  angleRad: number;
  coat: Flavour;
  spawnX: number;
  spawnY: number;
}

export type ContactKind = 'wall' | 'bonbon' | 'sea' | 'cup' | 'none';

export interface ContactEvent {
  kind: ContactKind;
  bonbon?: Bonbon;
  sameColour: boolean;
  tickle: boolean;
  pop: boolean;
  chain?: Bonbon[];
  t: number;
  x: number;
  y: number;
  speed: number;
}

export interface ShotResult {
  contacts: ContactEvent[];
  ended: 'sea' | 'cup' | 'timeout' | 'stuck';
  path: Array<{ x: number; y: number }>;
  final: PipState;
  wallBounces: number;
}

function restitution(type: Bonbon['type'], marshmallowHold = false): number {
  if (marshmallowHold) return 0.15;
  return P.restitution[type] ?? P.restitution.plush;
}

function shrinkTickle(b: Bonbon): void {
  b.puffs -= 1;
  if (b.size === 's3') b.size = 's2';
  else if (b.size === 's2') b.size = 's1';
  if (b.puffs <= 0 || b.size === 's1' && b.puffs <= 0) {
    b.popped = true;
  }
}

function sweetPopChain(
  hit: Bonbon,
  coat: Flavour,
  _bonbons: Bonbon[],
  byKey: Map<string, Bonbon>,
): Bonbon[] {
  hit.popped = true;
  const chain = hugChainBfs(hit, byKey, coat);
  for (const b of chain) {
    if (b.id !== hit.id && !b.popped) b.popped = true;
  }
  return chain;
}

function integrateShot(
  input: ShotInput,
  bonbons: Bonbon[],
  cupX: number,
  cupHalfW: number,
  cupY: number,
  maxSteps: number,
  previewOnly: boolean,
): ShotResult {
  const pip: PipState = {
    x: input.spawnX,
    y: input.spawnY,
    vx: Math.sin(input.angleRad) * P.launchSpeedU,
    vy: Math.cos(input.angleRad) * P.launchSpeedU,
    coat: input.coat,
    active: true,
    radius: P.pipRadiusU,
  };
  const contacts: ContactEvent[] = [];
  const path: Array<{ x: number; y: number }> = [];
  const alive = () => bonbons.filter((b) => !b.popped);
  const dt = P.fixedDt;
  let t = 0;
  let wallBounces = 0;
  let marshmallowUntil = 0;
  const maxT = P.maxShotMs / 1000;

  for (let step = 0; step < maxSteps && t < maxT; step++) {
    if (step % 4 === 0) path.push({ x: pip.x, y: pip.y });
    if (previewOnly && path.length >= 40) break;
    if (t < marshmallowUntil) {
      /* slow sink */
    }
    pip.vy += P.gravityU * dt;
    const drag = 1 - P.airDragPerS * dt;
    pip.vx *= drag;
    pip.vy *= drag;
    pip.x += pip.vx * dt;
    pip.y += pip.vy * dt;
    const speed = Math.hypot(pip.vx, pip.vy);
    if (speed > P.maxSpeedU) {
      const s = P.maxSpeedU / speed;
      pip.vx *= s;
      pip.vy *= s;
    }

    if (pip.x - pip.radius < W.leftX) {
      pip.x = W.leftX + pip.radius;
      pip.vx = -pip.vx * P.restitution.wall;
      wallBounces += 1;
      if (!previewOnly)
        contacts.push({
          kind: 'wall',
          sameColour: false,
          tickle: false,
          pop: false,
          t,
          x: pip.x,
          y: pip.y,
          speed,
        });
    }
    if (pip.x + pip.radius > W.rightX) {
      pip.x = W.rightX - pip.radius;
      pip.vx = -pip.vx * P.restitution.wall;
      wallBounces += 1;
      if (!previewOnly)
        contacts.push({
          kind: 'wall',
          sameColour: false,
          tickle: false,
          pop: false,
          t,
          x: pip.x,
          y: pip.y,
          speed,
        });
    }

    let hit: Bonbon | undefined;
    let hitD = Infinity;
    for (const b of alive()) {
      const r = bonbonRadius(b.size);
      const d = Math.hypot(b.x - pip.x, b.y - pip.y);
      if (d < r + pip.radius && d < hitD) {
        hitD = d;
        hit = b;
      }
    }
    if (hit && hitD > 0.001) {
      const same = hit.flavour === pip.coat;
      let pop = same;
      const tickle = !same;
      if (tickle && hit.size === 's1' && hit.puffs <= 1) pop = true;
      const hold = hit.type === 'marshmallow';
      const e = restitution(
        hit.type === 'bubble' ? 'plush' : hit.type,
        t < marshmallowUntil,
      );
      const nx = (pip.x - hit.x) / hitD;
      const ny = (pip.y - hit.y) / hitD;
      let vDot = pip.vx * nx + pip.vy * ny;
      pip.vx = pip.vx - (1 + e) * vDot * nx;
      pip.vy = pip.vy - (1 + e) * vDot * ny;
      if (hit.type === 'jelly') {
        const boost = 1.12;
        pip.vx *= boost;
        pip.vy *= boost;
        const sp = Math.hypot(pip.vx, pip.vy);
        if (sp > P.maxSpeedU) {
          const s = P.maxSpeedU / sp;
          pip.vx *= s;
          pip.vy *= s;
        }
      }
      if (hold && !same) {
        marshmallowUntil = t + P.marshmallowHoldMs / 1000;
        hit.expr = 'tickled';
      }
      if (hit.type === 'bubble') {
        hit.type = 'plush';
        hit.flavour = hit.flavour;
      }
      if (!same) pip.coat = hit.flavour;
      let chain: Bonbon[] | undefined;
      if (!previewOnly) {
        const byKey = bonbonByKey(bonbons);
        if (pop) chain = sweetPopChain(hit, pip.coat, bonbons, byKey);
        else if (tickle) {
          if (pop) hit.popped = true;
          else shrinkTickle(hit);
        }
      }
      contacts.push({
        kind: 'bonbon',
        bonbon: hit,
        sameColour: same,
        tickle,
        pop,
        chain,
        t,
        x: pip.x,
        y: pip.y,
        speed: Math.hypot(pip.vx, pip.vy),
      });
      if (previewOnly) {
        continue;
      }
    }

    if (
      !previewOnly &&
      pip.y > tokens.layout.seaSurfaceY &&
      Math.abs(pip.x - cupX) < cupHalfW &&
      pip.y < cupY + 40
    ) {
      return {
        contacts,
        ended: 'cup',
        path,
        final: { ...pip, active: false },
        wallBounces,
      };
    }
    if (pip.y > tokens.layout.seaSurfaceY + 80) {
      return {
        contacts,
        ended: previewOnly ? 'sea' : 'sea',
        path,
        final: { ...pip, active: false },
        wallBounces,
      };
    }
    t += dt;
  }
  return {
    contacts,
    ended: 'timeout',
    path,
    final: pip,
    wallBounces,
  };
}

/** Mutates `bonbons` in place (callers that need a pristine field must clone first). */
export function simulateShot(
  input: ShotInput,
  bonbons: Bonbon[],
  cupX: number,
): ShotResult {
  return integrateShot(
    input,
    bonbons,
    cupX,
    tokens.layout.cup.halfW,
    tokens.layout.cup.y,
    3000,
    false,
  );
}

export function previewShot(
  input: ShotInput,
  bonbons: Bonbon[],
  _cupX: number,
): ShotResult {
  const clone = bonbons.map((b) => ({ ...b }));
  return integrateShot(input, clone, 0, 0, 0, 220, true);
}

export function cupXAtTime(seed: string, tSec: number): number {
  const { driftMinX, driftMaxX, periodS } = tokens.layout.cup;
  const rng = makeRng(seed + '-cup');
  const phase = rng() * Math.PI * 2;
  const mid = (driftMinX + driftMaxX) / 2;
  const amp = (driftMaxX - driftMinX) / 2;
  return mid + amp * Math.sin((tSec / periodS) * Math.PI * 2 + phase);
}

export { integrateShot as stepShotForTests };
