import { tokens } from '../tokens';
import type { Settings } from '../store';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private qa: boolean;
  private ladderIdx = 0;

  constructor(qa: boolean) {
    this.qa = qa;
  }

  unlock(): void {
    if (this.qa) return;
    if (!this.ctx) this.ctx = new AudioContext();
    void this.ctx.resume();
  }

  playUiClick(): void {
    if (this.qa) this.playSynthFallback(440, 0.05);
    else this.playSynthFallback(523, 0.08);
  }

  playPopRung(_settings: Settings): void {
    const hz = tokens.sound.ladder.rungHz[this.ladderIdx % 12];
    this.ladderIdx++;
    this.playSynthFallback(hz, 0.15);
    this.playSynthFallback(hz * 2, 0.1, -10);
  }

  private playSynthFallback(hz: number, dur: number, db = -8): void {
    if (this.qa && !this.ctx) {
      /* QA: no AudioContext — UI still triggers silent synth path */
      return;
    }
    if (!this.ctx) this.ctx = new AudioContext();
    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = Math.pow(10, db / 20);
    g.connect(this.ctx.destination);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = hz;
    const o2 = this.ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = hz * 2;
    o1.connect(g);
    o2.connect(g);
    o1.start(t0);
    o2.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o1.stop(t0 + dur);
    o2.stop(t0 + dur);
  }

  playLaunch(): void {
    this.playSynthFallback(330, 0.12, -12);
  }
}
