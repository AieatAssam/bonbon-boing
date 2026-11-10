import { tokens } from '../tokens';
import { installOverlapChecker } from '../ui/overlap';
import {
  computeLayout,
  drawField,
  drawSky,
  puffAnchorY,
  puffMouthU,
} from '../render/scene';
import { drawBonbon } from '../render/bonbon';
import { paintBonbonPreview } from '../render/preview';
import { bonbonRadius } from '../sim/lattice';
import { FxLayer } from '../render/fx';
import { SoftRing } from '../render/softring';
import { loadStore, saveStore, type StoreData } from '../store';
import { AudioEngine } from '../audio/engine';
import {
  renderBookHud,
  renderCreditsHud,
  renderGalleryHud,
  renderPlayHud,
  renderResultsHud,
  renderSugarRushHud,
  renderTitleHud,
  renderTrailHud,
  renderTip,
  type Screen,
} from '../ui/screens';
import type { Flavour } from '../sim/types';
import { GameClocks } from './clocks';
import { GameWorld, type ModeKind } from './world';
import { ShotRuntime } from './shot-runtime';
import { cupXAtTime } from '../sim/shot';
import { tickFalling } from '../sim/gravity';
import { dailySeed } from '../sim/levels';

function pipSpawnU(ps = { x: 1, y: 1 }): { x: number; y: number } {
  const py = puffAnchorY(computeLayout(innerWidth, innerHeight).landscape);
  return puffMouthU(py, tokens.layout.puffCloud.w, ps);
}
const MAX_AIM = (84 * Math.PI) / 180;

export class GameApp {
  readonly qa: boolean;
  freeze: boolean;
  store: StoreData;
  audio: AudioEngine;
  canvas: HTMLCanvasElement;
  uiRoot: HTMLElement;
  ctx: CanvasRenderingContext2D;
  screen: Screen = 'title';
  dpr = 2;
  world: GameWorld | null = null;
  clocks = new GameClocks();
  fx = new FxLayer();
  rings = new Map<number, SoftRing>();
  shot!: ShotRuntime;
  aiming = false;
  aimAngle = -Math.PI / 2.5;
  pointer = { x: 0, y: 0 };
  puffScale = { x: 1, y: 1 };
  pipSquash = { x: 1, y: 1 };
  toast = '';
  toastT = 0;
  sugarRushPending = false;
  qaAutoplay = 0;
  time = 0;
  nextBlink = 2 + Math.random() * 2;

  constructor(qa: boolean, freeze: boolean, qaScreen?: Screen) {
    this.shot = new ShotRuntime(
      new GameWorld('bootstrap', 'rise'),
      this.clocks,
      () => {},
      () => {},
    );
    this.qa = qa;
    this.freeze = freeze;
    this.store = loadStore();
    this.audio = new AudioEngine(qa);
    this.canvas = document.getElementById('field') as HTMLCanvasElement;
    this.uiRoot = document.getElementById('ui-root') as HTMLElement;
    this.ctx = this.canvas.getContext('2d')!;
    installOverlapChecker();
    if (qa && qaScreen) this.screen = qaScreen;
    const params = new URLSearchParams(location.search);
    this.qaAutoplay = Number(params.get('autoplay') ?? params.get('mid') ?? 0);
  }

  boot(): void {
    const params = new URLSearchParams(location.search);
    if (params.has('gallery')) this.screen = 'gallery';
    this.syncHud();
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.syncHud();
    });
    this.bindInput();
    window.__bbApp = this;
    if (!this.freeze) this.loop();
    document.addEventListener('pointerdown', () => this.audio.unlock(), {
      once: true,
    });
    if (this.qa) {
      this.runQaBootstrap();
      this.draw();
    } else {
      this.audio.playMusic('title');
      window.__ready = true;
    }
  }

  private runQaBootstrap(): void {
    const params = new URLSearchParams(location.search);
    const scr = params.get('screen') ?? 'title';
  this.screen = scr as Screen;
    if (scr === 'title' || scr === 'gallery') {
      this.syncHud();
      window.__ready = true;
      return;
    }
    if (scr === 'results') {
      this.startMode('rise', 'qa');
      this.world!.score = 24960;
      this.world!.bestHug = 9;
      this.world!.catches = 6;
      this.screen = 'results';
      this.syncHud();
      window.__ready = true;
      return;
    }
    if (scr === 'play' || scr === 'combo') {
      this.startMode('rise', this.qa ? 'qa-tut' : 'tut-1');
      this.screen = 'play';
      if (params.has('aim')) {
        this.aiming = true;
        this.aimAngle = -0.78;
        this.puffScale = { x: 0.96, y: 1.04 };
      }
      const n = this.qaAutoplay || (scr === 'combo' ? 4 : 0);
      if (n === 0) {
        this.freeze = this.freeze || params.has('freeze');
        this.syncHud();
        window.__ready = true;
        return;
      }
      let i = 0;
      const fire = () => {
        while (this.world?.rising) this.world.tickRise(1 / 30);
        if (i >= n || !this.world) {
          if (scr === 'combo' && this.world) {
            const b = this.world.living()[0];
            if (b) {
              b.expr = 'love';
              b.sx = 1.2;
              b.sy = 0.85;
              this.fx.showBigWord(`HUG ×${4}!`, true);
              this.fx.emitConfetti(500, 700, 40);
            }
          }
          this.freeze = true;
          this.syncHud();
          window.__ready = true;
          return;
        }
        this.aimAngle = -0.6 - i * 0.08;
        this.shot.launch(this.aimAngle);
        i++;
        setTimeout(fire, 520);
      };
      setTimeout(fire, 400);
      setTimeout(() => {
        this.freeze = true;
        this.syncHud();
        window.__ready = true;
      }, 12_000);
    }
  }

  startMode(mode: ModeKind, seed: string): void {
    this.world = new GameWorld(seed, mode);
    if (this.qa) this.world.sugarRushUsed = true;
    this.world.onLifetimePop = (fl) => {
      this.store.book[fl] = (this.store.book[fl] ?? 0) + 1;
      saveStore(this.store);
    };
    this.shot = new ShotRuntime(
      this.world,
      this.clocks,
      (e) => this.onContactFx(e),
      (c) => this.onShotDone(c),
    );
    this.rings.clear();
    for (const b of this.world.bonbons) {
      this.rings.set(b.id, new SoftRing(b.x, b.y, bonbonRadius(b.size)));
    }
    if (mode === 'rise' && !this.store.tipsSeen.includes('aim')) {
      this.toast = 'Drag to aim, let go to boing!';
      this.toastT = 4;
    }
    this.audio.playMusic('play');
  }

  private lastHudScore = -1;

  private refreshHudScore(): void {
    if (!this.world || this.world.score === this.lastHudScore) return;
    this.lastHudScore = this.world.score;
    const el = this.uiRoot.querySelector(
      '[data-hud="score"] .score-sticker',
    ) as HTMLElement | null;
    if (el) el.textContent = this.world.score.toLocaleString();
  }

  private onContactFx(e: import('../sim/shot').ContactEvent): void {
    if (!this.world) return;
    if (e.kind === 'bonbon' && e.bonbon) {
      const b = e.bonbon;
      const ring = this.rings.get(b.id);
      ring?.dent(this.shot.pip?.x ?? b.x, this.shot.pip?.y ?? b.y, 30, 0.25);
      ring?.wake(800);
      if (e.pop) {
        this.fx.emitPop(b.x, b.y, b.flavour, this.world.popsThisShot);
        this.audio.playPopRung(this.store.settings);
        this.audio.duckMusic(180);
        if (e.chain && e.chain.length >= 4) {
          this.fx.showBigWord(`HUG ×${e.chain.length}!`, true);
          this.fx.emitConfetti(b.x, b.y, 40);
        }
        if (e.pop && e.bonbon) {
          const r = bonbonRadius(e.bonbon.size);
          this.fx.scorePop(e.bonbon.x, e.bonbon.y - r * 0.55, `+${popPts(e)}`);
        }
        this.clocks.addTrauma(
          tokens.motion.shake.add.sweetPop,
          this.store.settings.shake,
          this.store.settings.reducedMotion,
        );
      } else if (e.tickle) {
        this.audio.playTickle();
        b.tickleT = 0.16;
      }
    }
  }

  private onShotDone(caught: boolean): void {
    if (!this.world) return;
    if (this.world.shots >= 1 && this.toast.includes('Drag to aim')) {
      this.toast = '';
      this.toastT = 0;
      if (!this.store.tipsSeen.includes('aim')) {
        this.store.tipsSeen.push('aim');
        saveStore(this.store);
      }
      this.syncHud();
    }
    if (this.world.mode === 'rise') {
      if (this.world.gameOver && !this.world.sugarRushUsed) {
        this.world.sugarRushOffered = true;
        this.sugarRushPending = true;
        this.syncHud();
        return;
      }
    }
    if (this.world.gameOver) {
      this.endRun();
    }
    void caught;
  }

  endRun(): void {
    if (!this.world) return;
    if (this.world.mode === 'rise' && this.world.score > this.store.bestRise) {
      this.store.bestRise = this.world.score;
    }
    if (this.world.mode === 'daily' && this.world.score > this.store.bestDaily) {
      this.store.bestDaily = this.world.score;
    }
    saveStore(this.store);
    this.screen = 'results';
    this.audio.playMusic('title');
    this.syncHud();
  }

  route(action: string): void {
    this.audio.unlock();
    this.audio.playUiClick();
    switch (action) {
      case 'play':
        this.startMode('rise', `rise-${Date.now()}`);
        this.screen = 'play';
        break;
      case 'daily':
        this.startMode('daily', dailySeed());
        this.screen = 'play';
        break;
      case 'trail':
        this.screen = 'trail';
        break;
      case 'trail-start':
        this.startMode('trail', 'trail-1');
        this.screen = 'play';
        break;
      case 'title':
        this.screen = 'title';
        this.world = null;
        this.audio.playMusic('title');
        break;
      case 'pause':
        this.screen = this.screen === 'pause' ? 'play' : 'pause';
        break;
      case 'mute':
        this.store.settings.music = this.store.settings.music > 0.01 ? 0 : 0.85;
        this.store.settings.sfx = this.store.settings.sfx > 0.01 ? 0 : 1;
        this.audio.applySettings(this.store.settings);
        saveStore(this.store);
        break;
      case 'settings':
        this.screen = 'settings';
        break;
      case 'credits':
        this.screen = 'credits';
        break;
      case 'book':
        this.screen = 'book';
        break;
      case 'gallery':
        this.screen = 'gallery';
        break;
      case 'swap':
        this.world?.swapPips();
        break;
      case 'sugar-yes':
        this.world?.sugarRushPop();
        this.sugarRushPending = false;
        this.world!.gameOver = false;
        this.screen = 'play';
        break;
      case 'sugar-no':
        this.sugarRushPending = false;
        this.endRun();
        break;
      case 'share':
        this.shareDaily();
        break;
      default:
        break;
    }
    this.syncHud();
  }

  shareDaily(): void {
    if (!this.world) return;
    const em = topFlavourEmoji(this.world);
    const text = `Bonbon Boing! Daily ${new Date().toISOString().slice(0, 10)} ${em} ${this.world.score.toLocaleString()} · best hug ×${this.world.bestHug} · ${this.world.catches} catches`;
    void navigator.share?.({ title: 'Bonbon Boing!', text, url: location.href });
  }

  syncHud(): void {
    this.uiRoot.innerHTML = '';
    if (this.screen === 'title') {
      renderTitleHud(this.uiRoot, this.store.bestRise);
    } else if (this.screen === 'play' || this.screen === 'pause') {
      if (this.world) {
        renderPlayHud(
          this.uiRoot,
          this.world.score,
          this.store.bestRise,
          this.world.popsThisShot > 1 ? this.world.popsThisShot : undefined,
          this.world.stage,
          this.world.shots,
          this.world.nextCoat,
          this.world,
        );
        const tipLayout = computeLayout(innerWidth, innerHeight);
        if (
          this.toastT > 0 &&
          this.world.shots === 0 &&
          !tipLayout.landscape &&
          this.toast.includes('Drag to aim')
        ) {
          renderTip(this.uiRoot, this.toast);
        }
      }
    } else if (this.screen === 'results' && this.world) {
      renderResultsHud(
        this.uiRoot,
        this.world.score,
        this.world.score > this.store.bestRise,
        this.world,
      );
    } else if (this.screen === 'gallery') renderGalleryHud(this.uiRoot);
    const layout = computeLayout(innerWidth, innerHeight);
    const preview = this.uiRoot.querySelector(
      '#next-preview',
    ) as HTMLCanvasElement | null;
    if (preview && this.world && layout.landscape) {
      paintBonbonPreview(preview, this.world.nextCoat, 52);
    }
    else if (this.screen === 'book') renderBookHud(this.uiRoot, this.store);
    else if (this.screen === 'credits') renderCreditsHud(this.uiRoot);
    else if (this.screen === 'trail') renderTrailHud(this.uiRoot, this.store);
    if (this.sugarRushPending) renderSugarRushHud(this.uiRoot);
  }

  bindInput(): void {
    const hudH = () => computeLayout(innerWidth, innerHeight).hudH;
    const toWorld = (sx: number, sy: number) => {
      const L = computeLayout(innerWidth, innerHeight);
      return { x: (sx - L.fx) / L.scale, y: (sy - L.fy) / L.scale, L };
    };
    const updateAim = (sx: number, sy: number) => {
      const { x, y } = toWorld(sx, sy);
      this.pointer = { x: sx, y: sy };
      const spawn = pipSpawnU(this.puffScale);
      let a = Math.atan2(x - spawn.x, y - spawn.y);
      const down = Math.PI / 2;
      a = Math.max(down - MAX_AIM, Math.min(down + MAX_AIM, a));
      this.aimAngle = a;
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.screen !== 'play' && this.screen !== 'pause') return;
      if (e.clientY < hudH()) return;
      if (!this.shot.canAim()) return;
      this.aiming = true;
      this.fx.particles = this.fx.particles.filter((p) => p.kind !== 'score');
      updateAim(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.aiming) return;
      updateAim(e.clientX, e.clientY);
    });
    const endAim = (e: PointerEvent) => {
      if (!this.aiming) return;
      this.aiming = false;
      if (e.clientY < hudH() + 10) return;
      this.puffScale = { x: 0.9, y: 1.1 };
      this.pipSquash = { x: 0.72, y: 1.39 };
      this.audio.playLaunch();
      this.shot.launch(this.aimAngle);
      if (
        this.store.tipsSeen.includes('aim') &&
        !this.store.tipsSeen.includes('colour')
      ) {
        this.store.tipsSeen.push('colour');
        this.toast = 'Bump friends to borrow colour!';
        this.toastT = 5;
        saveStore(this.store);
      }
    };
    this.canvas.addEventListener('pointerup', endAim);
    this.canvas.addEventListener('pointercancel', () => {
      this.aiming = false;
    });
    window.addEventListener('keydown', (e) => {
      if (this.screen !== 'play') return;
      if (e.key === 'ArrowLeft') this.aimAngle += 0.02;
      if (e.key === 'ArrowRight') this.aimAngle -= 0.02;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.shot.launch(this.aimAngle);
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'Tab') {
        e.preventDefault();
        this.world?.swapPips();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.route('pause');
    });
    this.uiRoot.addEventListener('click', (ev) => {
      const lvBtn = (ev.target as HTMLElement).closest('[data-level]') as HTMLElement | null;
      if (lvBtn?.dataset.level) {
        const lv = Number(lvBtn.dataset.level);
        this.startMode('trail', `trail-${lv}`);
        this.screen = 'play';
        this.syncHud();
        return;
      }
      const t = (ev.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (t?.dataset.action) this.route(t.dataset.action);
    });
    this.uiRoot.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement;
      const key = t.dataset.setting;
      if (!key) return;
      if (t.type === 'checkbox')
        (this.store.settings as unknown as Record<string, boolean>)[key] =
          t.checked;
      else
        (this.store.settings as unknown as Record<string, number>)[key] =
          Number(t.value);
      this.audio.applySettings(this.store.settings);
      saveStore(this.store);
    });
  }

  resize(): void {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(innerWidth * this.dpr);
    this.canvas.height = Math.floor(innerHeight * this.dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw();
  }

  loop(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.time) / 1000 || 0.016);
    this.time = now;
    if (!this.freeze || this.qaAutoplay > 0) this.tick(dt);
    this.draw();
    if (!this.freeze) requestAnimationFrame(() => this.loop());
  }

  tick(dt: number): void {
    this.toastT = Math.max(0, this.toastT - dt);
    if (this.world) {
      const splashes = tickFalling(this.world.bonbons, dt);
      for (const b of splashes) {
        this.fx.emitPop(b.x, b.y, b.flavour, 1);
        this.audio.playTickle();
      }
      if (this.world.rising) {
        const over = this.world.tickRise(dt);
        if (over && this.world.gameOver) this.onShotDone(false);
        this.world.checkWarn();
      }
      this.shot.tick(dt);
      const trauma = this.clocks.tickTrauma(dt);
      this.fx.tick(dt, trauma, this.store.settings.shake, this.store.settings.reducedMotion);
      this.tickIdle(dt);
      for (const b of this.world.living()) {
        if (!this.rings.has(b.id)) {
          this.rings.set(b.id, new SoftRing(b.x, b.y, bonbonRadius(b.size)));
        }
        const ring = this.rings.get(b.id)!;
        ring.cx = b.x;
        ring.cy = b.y;
        ring.tick(dt, this.clocks.simScale(dt) > 0);
      }
    }
    this.puffScale.x += (1 - this.puffScale.x) * dt * 8;
    this.puffScale.y += (1 - this.puffScale.y) * dt * 8;
    this.pipSquash.x += (1 - this.pipSquash.x) * dt * 10;
    this.pipSquash.y += (1 - this.pipSquash.y) * dt * 10;
  }

  tickIdle(dt: number): void {
    if (!this.world) return;
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.nextBlink = 2.4 + Math.random() * 2.8;
      const live = this.world.living();
      if (live.length) {
        const b = live[Math.floor(Math.random() * live.length)];
        b.expr = 'happy';
        setTimeout(() => {
          if (!b.popped) b.expr = 'idle';
        }, 180);
      }
    }
    for (const b of this.world.living()) {
      const breath = 1 + Math.sin(performance.now() * 0.002 + b.id) * 0.015;
      if (!b.sx) b.sx = breath;
      else b.sx = breath;
      if (!b.sy) b.sy = 1 / breath;
    }
  }

  draw(): void {
    const ctx = this.ctx;
    if (this.screen === 'title') {
      this.drawTitle();
      return;
    }
    if (this.screen === 'gallery') {
      this.drawGallery();
      return;
    }
    if (!this.world) {
      drawSky(ctx, innerWidth, innerHeight);
      return;
    }
    const L = computeLayout(innerWidth, innerHeight);
    const milkScreen =
      (L.fieldY ?? L.fy) +
      (tokens.layout.seaSurfaceY - L.viewTop) * L.scale;
    drawSky(ctx, innerWidth, innerHeight, milkScreen);
    const cupX = cupXAtTime(
      this.world.seed,
      this.world.shots + performance.now() * 0.001,
    );
    let aimDots: Array<{ x: number; y: number; a: number }> | undefined;
    if (this.shot.canAim()) {
      this.shot.angle = this.aimAngle;
      aimDots = this.shot.buildPreview();
      const prev = aimDots[aimDots.length - 1];
      if (prev) {
        for (const b of this.world.living()) {
          const d = Math.hypot(b.x - prev.x, b.y - prev.y);
          if (d < bonbonRadius(b.size) + 20) b.expr = 'wow';
        }
      }
    }
    const fieldY = L.fieldY ?? L.fy;
    drawField(ctx, L.scale, L.fx, fieldY, {
      bonbons: this.world.living(),
      pipCoat: this.world.currentCoat,
      nextCoat: this.world.nextCoat,
      cupX,
      aimDots,
      warn: this.world.warned,
      pipInCloud: this.shot.phase === 'idle',
      puffMouthO: this.aiming || this.shot.phase === 'idle',
      puffScale: this.puffScale,
      aiming: this.aiming,
      hideNextBubble: L.landscape,
      landscape: L.landscape,
    });
    for (const id of [...this.rings.keys()]) {
      if (!this.world.living().some((b) => b.id === id)) this.rings.delete(id);
    }
  if (this.shot.pip && this.shot.phase === 'flying') {
      const p = this.shot.pip;
      drawBonbon(ctx, L.fx + p.x * L.scale, fieldY + p.y * L.scale, {
        pip: true,
        coat: p.coat,
        w: tokens.physics.pipRadiusU * 2.3 * L.scale,
        expr: 'happy',
        sx: this.pipSquash.x,
        sy: this.pipSquash.y,
        shadow: true,
      });
    }
    this.fx.draw(ctx, L.fx, fieldY, L.scale);
    if (this.screen === 'play') this.refreshHudScore();
  }

  drawTitle(): void {
    const ctx = this.ctx;
    drawSky(ctx, innerWidth, innerHeight);
    const heap: Array<[Flavour, number, number]> = [
      ['berry', -2, 0],
      ['mint', -1, 0],
      ['lemon', 0, 0],
      ['blueberry', 1, 0],
      ['peach', 2, 0],
      ['grape', -1.5, 1],
    ];
    const L = computeLayout(innerWidth, innerHeight);
    const cx = L.landscape ? innerWidth * 0.3 : innerWidth / 2;
    const baseY = L.landscape ? innerHeight * 0.72 : innerHeight * 0.52;
    const unit = Math.min(innerWidth / 390, innerHeight / 844);
    const bw = 66 * unit;
    heap.forEach(([fl, col, row], i) => {
      const breathe = Math.sin(performance.now() * 0.002 + i) * 4;
      drawBonbon(ctx, cx + col * bw * 0.86, baseY - row * bw * 0.72 + breathe, {
        flavour: fl,
        w: bw,
        expr: 'happy',
      });
    });
    drawBonbon(ctx, cx, baseY - 2.2 * bw - Math.abs(Math.sin(performance.now() * 0.004)) * 18, {
      pip: true,
      coat: 'lemon',
      w: 46 * unit,
      expr: 'happy',
      sx: 1.25,
    });
  }

  drawGallery(): void {
    const ctx = this.ctx;
    drawSky(ctx, innerWidth, innerHeight);
    const flavours: Flavour[] = [
      'berry',
      'mint',
      'lemon',
      'blueberry',
      'peach',
      'grape',
    ];
    const pad = 24;
    const cols = 3;
    const cellW = (innerWidth - pad * 2) / cols;
    flavours.forEach((fl, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      drawBonbon(ctx, pad + (col + 0.5) * cellW, 120 + row * cellW, {
        flavour: fl,
        w: cellW * 0.55,
        expr: 'idle',
      });
    });
  }
}

function popPts(e: import('../sim/shot').ContactEvent): number {
  if (!e.bonbon) return 0;
  return Math.round(
    100 * (e.bonbon.size === 's3' ? 3 : e.bonbon.size === 's2' ? 2 : 1),
  );
}

function topFlavourEmoji(world: GameWorld): string {
  const map = { berry: '🍓', mint: '🌿', lemon: '🍋', blueberry: '🫐', peach: '🍑', grape: '🍇' };
  const entries = Object.entries(world.popCounts).sort((a, b) => b[1] - a[1]);
  return entries
    .slice(0, 4)
    .map(([k]) => map[k as Flavour] ?? '✨')
    .join('');
}

declare global {
  interface Window {
    __ready?: boolean;
    __bbApp?: GameApp;
    __checkPlayGeometry?: () => { violations: string[] };
  }
}
