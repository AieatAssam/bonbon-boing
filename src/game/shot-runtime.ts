import { tokens } from '../tokens';
import { bonbonRadius } from '../sim/lattice';
import { hugChainBfs } from '../sim/chain';
import { bonbonByKey } from '../sim/bonbon-map';
import {
  cupXAtTime,
  previewShot,
  type ContactEvent,
  type ShotInput,
} from '../sim/shot';
import type { PipState } from '../sim/types';
import type { Bonbon } from '../sim/types';
import { GameClocks } from './clocks';
import type { GameWorld } from './world';
import { refreshSupportFlags } from '../sim/gravity';
import {
  BANK_BOING,
  CATCH_POINTS,
  CLEAN_SWEEP,
  hugChainBonus,
  popPoints,
  ticklePoints,
} from '../sim/scoring';

const P = tokens.physics;
const W = tokens.layout.walls;
const SPAWN = tokens.layout.pipSpawn;

export type ShotPhase = 'idle' | 'flying' | 'done';

export class ShotRuntime {
  phase: ShotPhase = 'idle';
  pip: PipState | null = null;
  path: Array<{ x: number; y: number }> = [];
  contacts: ContactEvent[] = [];
  marshmallowUntil = 0;
  simT = 0;
  wallBounces = 0;
  chainQueue: Bonbon[] = [];
  chainIndex = 0;
  chainTimer = 0;
  cupX = 400;
  angle = -Math.PI / 2;
  caught = false;

  constructor(
    readonly world: GameWorld,
    readonly clocks: GameClocks,
    readonly onFx: (e: ContactEvent) => void,
    readonly onDone: (caught: boolean) => void,
  ) {}

  canAim(): boolean {
    return this.phase === 'idle' && !this.world.rising;
  }

  launch(angle: number): void {
    if (!this.canAim()) return;
    this.angle = angle;
    this.world.beginShot();
    this.cupX = cupXAtTime(this.world.seed, this.world.shots + performance.now() * 0.001);
    this.pip = {
      x: SPAWN.x,
      y: SPAWN.y,
      vx: Math.sin(angle) * P.launchSpeedU,
      vy: Math.cos(angle) * P.launchSpeedU,
      coat: this.world.currentCoat,
      active: true,
      radius: P.pipRadiusU,
    };
    this.phase = 'flying';
    this.path = [{ x: SPAWN.x, y: SPAWN.y }];
    this.contacts = [];
    this.simT = 0;
    this.wallBounces = 0;
    this.chainQueue = [];
    this.chainIndex = 0;
    this.caught = false;
  }

  private living(): Bonbon[] {
    return this.world.bonbons.filter((b) => !b.popped);
  }

  tick(realDt: number): void {
    if (this.phase !== 'flying' || !this.pip) return;
    const simDt = realDt * this.clocks.simScale(realDt);
    if (simDt <= 0) return;
    let spent = 0;
    const step = P.fixedDt;
    while (spent < simDt && this.phase === 'flying') {
      this.stepOnce(step);
      spent += step;
    }
    this.tickChain(realDt);
  }

  private tickChain(realDt: number): void {
    if (this.chainQueue.length === 0) return;
    this.chainTimer -= realDt;
    if (this.chainTimer > 0) return;
    const b = this.chainQueue[this.chainIndex];
    if (!b || b.popped) {
      this.chainIndex++;
      this.chainTimer = 0.06;
      return;
    }
    b.popped = true;
    b.popT = 0;
    b.expr = 'happy';
    this.world.popsThisShot += 1;
    const k = this.world.popsThisShot;
    const pts = popPoints(b.size, k) * this.world.streakMult;
    this.world.shotScore += Math.round(pts);
    this.world.trackPop(b.flavour, this.chainQueue.length + 1);
    this.clocks.addHitstop(tokens.motion.hitstop.sweetPop);
    this.onFx({
      kind: 'bonbon',
      bonbon: b,
      sameColour: true,
      tickle: false,
      pop: true,
      t: this.simT,
      x: b.x,
      y: b.y,
      speed: 0,
    });
    this.chainIndex++;
    this.chainTimer = 0.06;
    if (this.chainIndex >= this.chainQueue.length) {
      const n = this.chainQueue.length;
      if (n >= 3) {
        this.world.shotScore += hugChainBonus(n);
        if (n >= 4) {
          this.clocks.addHitstop(tokens.motion.hitstop.hugChainEnd);
        }
      }
      this.chainQueue = [];
      refreshSupportFlags(this.world.bonbons);
    }
  }

  private stepOnce(dt: number): void {
    const pip = this.pip!;
    this.simT += dt;
    pip.vy += P.gravityU * dt;
    const drag = 1 - P.airDragPerS * dt;
    pip.vx *= drag;
    pip.vy *= drag;
    pip.x += pip.vx * dt;
    pip.y += pip.vy * dt;
    let speed = Math.hypot(pip.vx, pip.vy);
    if (speed > P.maxSpeedU) {
      const s = P.maxSpeedU / speed;
      pip.vx *= s;
      pip.vy *= s;
      speed = P.maxSpeedU;
    }
    if (this.path.length % 3 === 0) this.path.push({ x: pip.x, y: pip.y });

    if (pip.x - pip.radius < W.leftX) {
      pip.x = W.leftX + pip.radius;
      pip.vx = -pip.vx * P.restitution.wall;
      this.wallBounces += 1;
      this.world.bankWallThisShot = true;
    }
    if (pip.x + pip.radius > W.rightX) {
      pip.x = W.rightX - pip.radius;
      pip.vx = -pip.vx * P.restitution.wall;
      this.wallBounces += 1;
      this.world.bankWallThisShot = true;
    }

    let hit: Bonbon | undefined;
    let hitD = Infinity;
    for (const b of this.living()) {
      const r = bonbonRadius(b.size);
      const d = Math.hypot(b.x - pip.x, b.y - pip.y);
      if (d < r + pip.radius && d < hitD) {
        hitD = d;
        hit = b;
      }
    }
    if (hit && hitD > 0.01) {
      const same = hit.flavour === pip.coat;
      let pop = same;
      const tickle = !same;
      if (tickle && hit.puffs <= 1 && hit.size === 's1') pop = true;
      const e =
        hit.type === 'marshmallow' && this.simT < this.marshmallowUntil
          ? 0.15
          : (P.restitution[hit.type === 'bubble' ? 'plush' : hit.type] ??
            P.restitution.plush);
      const nx = (pip.x - hit.x) / hitD;
      const ny = (pip.y - hit.y) / hitD;
      const vDot = pip.vx * nx + pip.vy * ny;
      pip.vx = pip.vx - (1 + e) * vDot * nx;
      pip.vy = pip.vy - (1 + e) * vDot * ny;
      if (hit.type === 'jelly') {
        pip.vx *= 1.15;
        pip.vy *= 1.15;
      }
      if (hit.type === 'marshmallow' && tickle) {
        this.marshmallowUntil = this.simT + P.marshmallowHoldMs / 1000;
        hit.expr = 'tickled';
        hit.sx = 0.85;
        hit.sy = 1.15;
      }
      if (hit.type === 'bubble' && tickle) hit.type = 'plush';
      if (!same) pip.coat = hit.flavour;
      const ev: ContactEvent = {
        kind: 'bonbon',
        bonbon: hit,
        sameColour: same,
        tickle,
        pop,
        t: this.simT,
        x: pip.x,
        y: pip.y,
        speed,
      };
      this.contacts.push(ev);
      if (pop) {
        const byKey = bonbonByKey(this.world.bonbons);
        const chain = hugChainBfs(hit, byKey, pip.coat);
        hit.popped = true;
        hit.popT = 0;
        this.chainQueue = chain.filter((c) => c.id !== hit.id);
        this.chainIndex = 0;
        this.chainTimer = 0.06;
        this.world.popsThisShot += 1;
        const k = this.world.popsThisShot;
        this.world.shotScore += Math.round(
          popPoints(hit.size, k) * this.world.streakMult,
        );
        if (this.world.bankWallThisShot && this.wallBounces > 0) {
          this.world.shotScore += BANK_BOING;
        }
        this.world.trackPop(hit.flavour, chain.length);
        this.clocks.addHitstop(tokens.motion.hitstop.sweetPop);
        refreshSupportFlags(this.world.bonbons);
      } else if (tickle) {
        hit.puffs -= 1;
        if (hit.size === 's3') hit.size = 's2';
        else if (hit.size === 's2') hit.size = 's1';
        if (hit.puffs <= 0) {
          hit.popped = true;
          this.world.popsThisShot += 1;
          this.world.shotScore += Math.round(
            popPoints(hit.size, this.world.popsThisShot) *
              this.world.streakMult,
          );
        } else {
          this.world.shotScore += ticklePoints(hit.size);
        }
        hit.expr = 'tickled';
      }
      this.onFx(ev);
    }

    if (
      pip.y > tokens.layout.seaSurfaceY &&
      Math.abs(pip.x - this.cupX) < tokens.layout.cup.halfW
    ) {
      this.caught = true;
      this.world.shotScore += CATCH_POINTS;
      this.world.catches += 1;
      this.finish(true);
      return;
    }
    if (pip.y > tokens.layout.seaSurfaceY + 60) {
      this.finish(false);
      return;
    }
    if (this.simT > P.maxShotMs / 1000) {
      this.finish(false);
    }
  }

  private finish(caught: boolean): void {
    if (this.living().length === 0) {
      this.world.shotScore += CLEAN_SWEEP;
    }
    this.phase = 'done';
    this.pip = null;
    this.world.onShotEnd(caught);
    this.onDone(caught);
    setTimeout(() => {
      this.phase = 'idle';
    }, 300);
  }

  buildPreview(): Array<{ x: number; y: number; a: number }> {
    const input: ShotInput = {
      angleRad: this.angle,
      coat: this.world.currentCoat,
      spawnX: SPAWN.x,
      spawnY: SPAWN.y,
    };
    const prev = previewShot(input, this.world.bonbons, 0);
    const sparse = prev.path.filter((_, i) => i % 3 === 0).slice(0, 28);
    return sparse.map((p, i) => ({
      ...p,
      a: Math.max(0.35, 0.95 - i * 0.04),
    }));
  }
}
