import { tokens } from '../tokens';

export class GameClocks {
  hitstopLeftMs = 0;
  slowMoScale = 1;
  trauma = 0;
  popChainPauseMs = 0;

  addHitstop(ms: number): void {
    const cap = tokens.motion.hitstop.maxPerShot;
    const maxSingle = ms;
    this.hitstopLeftMs = Math.min(
      cap,
      this.hitstopLeftMs + Math.min(ms, maxSingle),
    );
  }

  addTrauma(amount: number, shakeOn: boolean, reduced: boolean): void {
    if (!shakeOn || reduced) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Sim dt multiplier for body integration (0 while hitstop). */
  simScale(realDt: number): number {
    if (this.hitstopLeftMs > 0) {
      this.hitstopLeftMs = Math.max(0, this.hitstopLeftMs - realDt * 1000);
      if (this.hitstopLeftMs > 0) return 0;
    }
    if (this.popChainPauseMs > 0) {
      this.popChainPauseMs = Math.max(0, this.popChainPauseMs - realDt * 1000);
      return 0;
    }
    return this.slowMoScale;
  }

  tickTrauma(realDt: number): number {
    const decay = tokens.motion.shake.decayPerS;
    this.trauma = Math.max(0, this.trauma - decay * realDt);
    const max = tokens.motion.shake.maxAmplitudeFracOfH;
    return Math.min(max, this.trauma * this.trauma);
  }

  setSlowMo(scale: number): void {
    this.slowMoScale = scale;
  }
}
