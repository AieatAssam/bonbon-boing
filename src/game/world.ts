import { tokens } from '../tokens';
import {
  bonbonRadius,
  generateRow,
  initialField,
  resetBonbonIds,
} from '../sim/lattice';
import { LEVELS, generateLevelBoard } from '../sim/levels';
import { makeRng } from '../sim/rng';
import type { Bonbon, Flavour } from '../sim/types';

const BASE_Y = 1340;
/** Extra vertical clearance before icing game over (u). */
const FROSTING_MARGIN = 122;
const FROSTING = tokens.layout.frostingY;
const PITCH = tokens.layout.lattice.rowPitch;

export type ModeKind = 'rise' | 'daily' | 'trail';

const STAGE_FLAVOURS: Flavour[][] = [
  ['berry', 'mint', 'lemon', 'blueberry'],
  ['berry', 'mint', 'lemon', 'blueberry', 'peach'],
  ['berry', 'mint', 'lemon', 'blueberry', 'peach'],
  ['berry', 'mint', 'lemon', 'blueberry', 'peach'],
  ['berry', 'mint', 'lemon', 'blueberry', 'peach', 'grape'],
];

export class GameWorld {
  seed: string;
  mode: ModeKind;
  rng: () => number;
  bonbons: Bonbon[] = [];
  baseRow = 0;
  stage = 1;
  shots = 0;
  score = 0;
  shotScore = 0;
  popsThisShot = 0;
  chainThisShot = 0;
  catches = 0;
  bestHug = 0;
  popCounts: Partial<Record<Flavour, number>> = {};
  streakMult = 1;
  consecutivePopShots = 0;
  currentCoat: Flavour = 'berry';
  nextCoat: Flavour = 'mint';
  sugarRushOffered = false;
  sugarRushUsed = false;
  gameOver = false;
  rising = false;
  riseT = 0;
  warned = false;
  trailLevel = 1;
  pipsLeft = 10;
  heartsLeft = 0;
  dailyCap = 40;
  bankWallThisShot = false;

  constructor(seed: string, mode: ModeKind) {
    this.seed = seed;
    this.mode = mode;
    this.rng = makeRng(seed);
    resetBonbonIds();
    if (mode === 'trail') {
      const lvl = Number(String(seed).replace(/[^\d]/g, '')) || 1;
      this.loadTrail(lvl);
    } else {
      const { bonbons } = initialField(seed, 5);
      this.bonbons = bonbons.map((b) => ({ ...b, homeX: b.x, homeY: b.y }));
      this.pickPipQueue();
    }
  }

  activeFlavours(): Flavour[] {
    const idx = Math.min(this.stage, STAGE_FLAVOURS.length) - 1;
    return STAGE_FLAVOURS[idx] ?? STAGE_FLAVOURS[0];
  }

  emptyShare(): number {
    if (this.stage < 6) return 0.24;
    const drop = Math.floor((this.stage - 5) / 2) * 0.02;
    return Math.max(0.08, 0.18 - drop);
  }

  bonbonMap(): Map<string, Bonbon> {
    const m = new Map<string, Bonbon>();
    for (const b of this.bonbons) {
      if (!b.popped) m.set(`${b.row},${b.col}`, b);
    }
    return m;
  }

  living(): Bonbon[] {
    return this.bonbons.filter((b) => !b.popped);
  }

  pickCoatFromField(): Flavour {
    const live = this.living();
    if (!live.length) return this.activeFlavours()[0];
    const weights = new Map<Flavour, number>();
    for (const b of live) {
      weights.set(b.flavour, (weights.get(b.flavour) ?? 0) + 1);
    }
    const entries = [...weights.entries()];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.rng() * total;
    for (const [fl, w] of entries) {
      r -= w;
      if (r <= 0) return fl;
    }
    return entries[0][0];
  }

  pickPipQueue(): void {
    this.currentCoat = this.pickCoatFromField();
    this.nextCoat = this.pickCoatFromField();
    if (this.nextCoat === this.currentCoat) {
      const opts = this.activeFlavours().filter((f) => f !== this.currentCoat);
      if (opts.length) this.nextCoat = opts[Math.floor(this.rng() * opts.length)];
    }
  }

  swapPips(): void {
    const t = this.currentCoat;
    this.currentCoat = this.nextCoat;
    this.nextCoat = t;
  }

  beginShot(): void {
    this.shotScore = 0;
    this.popsThisShot = 0;
    this.chainThisShot = 0;
    this.bankWallThisShot = false;
  }

  onShotEnd(caught: boolean): void {
    this.shots += 1;
    if (this.shotScore >= 2000) {
      /* toast handled in fx */
    }
    if (this.popsThisShot >= 3) {
      this.consecutivePopShots += 1;
      this.streakMult = Math.min(
        2,
        1 + 0.1 * this.consecutivePopShots,
      );
    } else if (this.popsThisShot === 0) {
      this.consecutivePopShots = 0;
      this.streakMult = 1;
    }
    this.score += this.shotScore;
    if (this.stage < 6 && this.shots % 12 === 0) this.stage += 1;
    if (!caught && this.mode !== 'trail') {
      this.startRise();
    } else if (caught) {
      this.pipsLeft = Math.min(this.pipsLeft + 1, 15);
    }
    this.pickPipQueue();
    if (this.mode === 'daily' && this.shots >= this.dailyCap) {
      this.gameOver = true;
    }
    if (this.mode === 'trail') {
      this.pipsLeft -= 1;
      this.heartsLeft = this.living().filter((b) => b.heart).length;
      if (this.heartsLeft === 0 || this.pipsLeft <= 0) this.gameOver = true;
    }
  }

  startRise(): void {
    this.rising = true;
    this.riseT = 0;
  }

  tickRise(dt: number): boolean {
    if (!this.rising) return false;
    this.riseT += dt;
    const dur = tokens.motion.duration.rowRise / 1000;
    const t = Math.min(1, this.riseT / dur);
    const ease = 1 - Math.pow(1 - t, 3);
    for (const b of this.living()) {
      const home = b.homeY ?? b.y;
      b.y = home - PITCH * ease;
    }
    if (t >= 1) {
      for (const b of this.living()) {
        b.row += 1;
        b.y = (b.homeY ?? b.y) - PITCH;
        b.homeY = b.y;
        b.homeX = b.x;
        b.asleep = false;
      }
      this.bonbons = this.bonbons.filter((b) => !b.popped);
      const newRow = generateRow(
        0,
        new Map(),
        this.activeFlavours(),
        this.stage,
        this.emptyShare(),
        this.rng,
        BASE_Y,
      );
      for (const b of newRow) {
        b.row = 0;
        b.y = BASE_Y;
        b.homeY = b.y;
        b.homeX = b.x;
        b.asleep = true;
        b.expr = 'sleepy';
        this.bonbons.push(b);
      }
      this.rising = false;
      return this.checkGameOver();
    }
    return false;
  }

  checkWarn(): boolean {
    const warn = this.living().some(
      (b) => b.y - bonbonRadius(b.size) < FROSTING + PITCH,
    );
    this.warned = warn;
    return warn;
  }

  checkGameOver(): boolean {
    const live = this.living();
    const badY = live.some(
      (b) => b.y - bonbonRadius(b.size) < FROSTING - FROSTING_MARGIN,
    );
    if (badY) this.gameOver = true;
    return this.gameOver;
  }

  sugarRushPop(): void {
    const live = this.living();
    if (!live.length) return;
    const minRow = Math.min(...live.map((b) => b.row));
    for (const b of live) {
      if (b.row <= minRow + 1) {
        b.popped = true;
        b.popT = 0;
      }
    }
    this.sugarRushUsed = true;
    this.gameOver = false;
  }

  loadTrail(level: number): void {
    const def = LEVELS.find((l) => l.id === level) ?? LEVELS[0];
    this.trailLevel = def.id;
    resetBonbonIds();
    const bonbons = generateLevelBoard(def.seed, def.hearts);
    this.bonbons = bonbons.map((b) => ({
      ...b,
      homeX: b.x,
      homeY: b.y,
    }));
    this.heartsLeft = this.living().filter((b) => b.heart).length;
    this.pipsLeft = 10;
    this.pickPipQueue();
  }

  trackPop(fl: Flavour, chainSize: number): void {
    this.popCounts[fl] = (this.popCounts[fl] ?? 0) + 1;
    this.bestHug = Math.max(this.bestHug, chainSize);
    this.onLifetimePop?.(fl);
  }

  onLifetimePop?: (fl: Flavour) => void;
}
