import { tokens } from '../tokens';
import type { Flavour } from '../sim/types';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  kind: 'sparkle' | 'drop' | 'confetti' | 'ring' | 'score';
  text?: string;
  rot?: number;
};

export class FxLayer {
  particles: Particle[] = [];
  bigWord: { text: string; t: number; color: string } | null = null;
  traumaX = 0;
  traumaY = 0;

  emitPop(x: number, y: number, fl: Flavour, n: number): void {
    const c = tokens.color.flavour[fl].base;
    const lc = tokens.color.flavour[fl].light;
    for (let i = 0; i < 6 + (n % 4); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 300 + Math.random() * 500;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.3,
        max: 0.8,
        r: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? c : lc,
        kind: 'drop',
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * (400 + Math.random() * 400),
        vy: Math.sin(a) * (400 + Math.random() * 400),
        life: 0.4,
        max: 0.6,
        r: 5 + Math.random() * 5,
        color: '#fff',
        kind: 'sparkle',
      });
    }
  }

  emitConfetti(x: number, y: number, count = 24): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 600 + Math.random() * 800;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1.4 + Math.random() * 0.6,
        max: 2,
        r: 6,
        color: tokens.color.fx.rainbow[i % 6],
        kind: 'confetti',
        rot: Math.random() * Math.PI,
      });
    }
  }

  scorePop(x: number, y: number, text: string): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -120,
      life: 0.65,
      max: 0.65,
      r: 0,
      color: tokens.color.fx.scorePopFill,
      kind: 'score',
      text,
    });
  }

  showBigWord(text: string, rainbow = false): void {
    this.bigWord = {
      text,
      t: 0,
      color: rainbow ? 'rainbow' : tokens.color.fx.comboTiers[3],
    };
  }

  tick(dt: number, trauma: number, shakeOn: boolean, reduced: boolean): void {
    const cap = reduced ? 0 : tokens.motion.shake.maxAmplitudeFracOfH;
    const amp = shakeOn ? trauma * cap * innerHeight : 0;
    this.traumaX = (Math.random() - 0.5) * amp * 2;
    this.traumaY = (Math.random() - 0.5) * amp * 2;
    if (this.bigWord) this.bigWord.t += dt;
    const live: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += (p.kind === 'drop' ? 2400 : 600) * dt * 0.001;
      p.x += p.vx * dt * 0.001;
      p.y += p.vy * dt * 0.001;
      if (p.kind === 'ring') p.r += 180 * dt;
      if (p.rot !== undefined) p.rot += dt * 9;
      live.push(p);
    }
    const maxP = reduced ? 120 : 260;
    this.particles =
      live.length > maxP ? live.slice(-maxP) : live;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    scale: number,
  ): void {
    ctx.save();
    ctx.translate(ox + this.traumaX, oy + this.traumaY);
    ctx.scale(scale, scale);
    for (const p of this.particles) {
      const a = Math.min(1, p.life / (p.max * 0.4));
      ctx.globalAlpha = a;
      if (p.kind === 'score' && p.text) {
        ctx.font = '800 20px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = tokens.color.fx.scorePopStroke;
        ctx.lineWidth = 5;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = tokens.color.fx.puffRing;
        ctx.lineWidth = Math.max(1, 8 * (p.life / p.max));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.r;
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.3, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.3, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-6, -3, 12, 6);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.bigWord && this.bigWord.t < 0.9) {
      const t = this.bigWord.t / 0.9;
      const sc = 0.3 + t * 0.85;
      ctx.save();
      ctx.translate(500, 900);
      ctx.rotate(-0.1);
      ctx.scale(sc, sc);
      ctx.font = '700 72px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 14;
      ctx.strokeStyle = tokens.color.ui.ink;
      ctx.lineJoin = 'round';
      ctx.strokeText(this.bigWord.text, 0, 0);
      if (this.bigWord.color === 'rainbow') {
        const g = ctx.createLinearGradient(-160, 0, 160, 0);
        tokens.color.fx.rainbow.forEach((col, i) =>
          g.addColorStop(i / 5, col),
        );
        ctx.fillStyle = g;
      } else ctx.fillStyle = this.bigWord.color;
      ctx.fillText(this.bigWord.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
