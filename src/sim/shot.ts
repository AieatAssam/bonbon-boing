import { tokens } from '../tokens';
import { bonbonRadius } from './lattice';
import type { Bonbon, Flavour, PipState } from './types';
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
  t: number;
  x: number;
  y: number;
}

export interface ShotResult {
  contacts: ContactEvent[];
  ended: 'sea' | 'cup' | 'timeout' | 'stuck';
  path: Array<{ x: number; y: number }>;
  final: PipState;
}

function restitution(type: Bonbon['type']): number {
  return P.restitution[type] ?? P.restitution.plush;
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
  const alive = bonbons.filter((b) => !b.popped);
  const dt = P.fixedDt;
  let t = 0;
  let wallBounced = false;
  const maxT = P.maxShotMs / 1000;

  for (let step = 0; step < maxSteps && t < maxT; step++) {
    if (step % 4 === 0) path.push({ x: pip.x, y: pip.y });
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
      wallBounced = true;
      if (!previewOnly)
        contacts.push({
          kind: 'wall',
          sameColour: false,
          tickle: false,
          pop: false,
          t,
          x: pip.x,
          y: pip.y,
        });
    }
    if (pip.x + pip.radius > W.rightX) {
      pip.x = W.rightX - pip.radius;
      pip.vx = -pip.vx * P.restitution.wall;
      wallBounced = true;
      if (!previewOnly)
        contacts.push({
          kind: 'wall',
          sameColour: false,
          tickle: false,
          pop: false,
          t,
          x: pip.x,
          y: pip.y,
        });
    }

    let hit: Bonbon | undefined;
    let hitD = Infinity;
    for (const b of alive) {
      const r = bonbonRadius(b.size);
      const d = Math.hypot(b.x - pip.x, b.y - pip.y);
      if (d < r + pip.radius && d < hitD) {
        hitD = d;
        hit = b;
      }
    }
    if (hit) {
      const same = hit.flavour === pip.coat;
      const tickle = !same;
      let pop = same;
      if (tickle && hit.puffs <= 1 && hit.size === 's1') pop = true;
      const e = restitution(hit.type);
      const nx = (pip.x - hit.x) / hitD;
      const ny = (pip.y - hit.y) / hitD;
      const vDot = pip.vx * nx + pip.vy * ny;
      pip.vx = pip.vx - (1 + e) * vDot * nx;
      pip.vy = pip.vy - (1 + e) * vDot * ny;
      if (!same) pip.coat = hit.flavour;
      contacts.push({
        kind: 'bonbon',
        bonbon: hit,
        sameColour: same,
        tickle,
        pop,
        t,
        x: pip.x,
        y: pip.y,
      });
      if (previewOnly) {
        return {
          contacts,
          ended: 'sea',
          path,
          final: { ...pip },
        };
      }
      if (pop) hit.popped = true;
      else if (tickle) {
        hit.puffs -= 1;
        if (hit.puffs <= 0) hit.popped = true;
        if (hit.size === 's2') hit.size = 's1';
        else if (hit.size === 's3') hit.size = 's2';
      }
    }

    if (
      pip.y > tokens.layout.seaSurfaceY &&
      Math.abs(pip.x - cupX) < cupHalfW &&
      pip.y < cupY + 40
    ) {
      return {
        contacts,
        ended: 'cup',
        path,
        final: { ...pip, active: false },
      };
    }
    if (pip.y > tokens.layout.seaSurfaceY + 80) {
      return {
        contacts,
        ended: 'sea',
        path,
        final: { ...pip, active: false },
      };
    }
    t += dt;
    void wallBounced;
  }
  return {
    contacts,
    ended: 'timeout',
    path,
    final: pip,
  };
}

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
    2000,
    false,
  );
}

export function previewShot(
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
    2000,
    true,
  );
}

export function cupXAtTime(seed: string, tSec: number): number {
  const { driftMinX, driftMaxX, periodS } = tokens.layout.cup;
  const rng = makeRng(seed + '-cup');
  const phase = rng() * Math.PI * 2;
  const mid = (driftMinX + driftMaxX) / 2;
  const amp = (driftMaxX - driftMinX) / 2;
  return mid + amp * Math.sin((tSec / periodS) * Math.PI * 2 + phase);
}
