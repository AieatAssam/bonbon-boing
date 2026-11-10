import { tokens } from '../tokens';
import type { Settings } from '../store';

type MusicId = 'title' | 'play';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private qa: boolean;
  private ladderIdx = 0;
  private musicEl: HTMLAudioElement | null = null;
  private musicId: MusicId | null = null;
  private sfxGain = 1;
  private musicGain = 0.85;

  constructor(qa: boolean) {
    this.qa = qa;
    if (!qa) this.warm();
  }

  private warm(): void {
    this.musicEl = new Audio(`${import.meta.env.BASE_URL}audio/music-play.ogg`);
    this.musicEl.loop = true;
    this.musicEl.volume = 0;
  }

  applySettings(s: Settings): void {
    this.sfxGain = s.sfx;
    this.musicGain = s.music;
    if (this.musicEl) this.musicEl.volume = this.musicGain * 0.35;
  }

  unlock(): void {
    if (this.qa) return;
    if (!this.ctx) this.ctx = new AudioContext();
    void this.ctx.resume();
    void this.musicEl?.play().catch(() => {});
  }

  playMusic(id: MusicId): void {
    if (this.qa) return;
    if (this.musicId === id) return;
    this.musicId = id;
    const file =
      id === 'title'
        ? `${import.meta.env.BASE_URL}audio/music-title.ogg`
        : `${import.meta.env.BASE_URL}audio/music-play.ogg`;
    if (!this.musicEl) this.musicEl = new Audio(file);
    this.musicEl.src = file;
    this.musicEl.volume = this.musicGain * 0.35;
    void this.musicEl.play().catch(() => {});
  }

  playUiClick(): void {
    this.playSample('ui', 0.08, 1);
    this.playSynthFallback(523, 0.06, -16);
  }

  playPopRung(settings: Settings): void {
    const hz = tokens.sound.ladder.rungHz[this.ladderIdx % 12];
    this.ladderIdx++;
    this.playSynthFallback(hz * settings.sfx, 0.14, -8);
    this.playSynthFallback(hz * 2, 0.1, -14);
    this.playSample('pop', 0.05, settings.sfx);
  }

  playLaunch(): void {
    this.playSample('launch', 0.12, this.sfxGain);
  }

  playTickle(): void {
    this.playSample('pop', 0.08, this.sfxGain, 1.1);
  }

  private playSample(
    name: string,
    dur: number,
    gainMul: number,
    rate = 1,
  ): void {
    if (this.qa) return;
    const a = new Audio(`${import.meta.env.BASE_URL}audio/${name}.ogg`);
    a.volume = Math.min(1, gainMul);
    a.playbackRate = rate;
    void a.play().catch(() => {});
    setTimeout(() => a.pause(), dur * 1000);
  }

  private playSynthFallback(hz: number, dur: number, db = -8): void {
    if (this.qa) return;
    if (!this.ctx) this.ctx = new AudioContext();
    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = Math.pow(10, db / 20) * this.sfxGain;
    g.connect(this.ctx.destination);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = hz;
    o1.connect(g);
    o1.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o1.stop(t0 + dur);
  }
}
