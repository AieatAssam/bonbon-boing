import { tokens } from '../tokens';

const N = tokens.physics.softRing.nodes;
const IT = tokens.physics.softRing.iterations;

export class SoftRing {
  nodes: Array<{ x: number; y: number; px: number; py: number }> = [];
  awakeMs = 0;
  readonly radius: number;
  cx: number;
  cy: number;

  constructor(cx: number, cy: number, radius: number) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      this.nodes.push({ x, y, px: x, py: y });
    }
  }

  wake(durMs: number): void {
    this.awakeMs = Math.max(this.awakeMs, durMs);
  }

  dent(px: number, py: number, pr: number, amount: number): void {
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - px, n.y - py);
      if (d < pr + this.radius * 0.5) {
        const nx = (n.x - px) / (d || 1);
        const ny = (n.y - py) / (d || 1);
        n.x += nx * amount * this.radius;
        n.y += ny * amount * this.radius;
        this.wake(1200);
      }
    }
  }

  tick(dt: number, simOn: boolean): void {
    if (this.awakeMs <= 0) return;
    this.awakeMs = Math.max(0, this.awakeMs - dt * 1000);
    if (!simOn) return;
    const ω = tokens.physics.softRing.anchorOmega;
    const ζ = tokens.physics.softRing.anchorZeta;
    const k = tokens.physics.softRing.pressureK;
    for (let it = 0; it < IT; it++) {
      for (let i = 0; i < N; i++) {
        const a = this.nodes[i];
        const b = this.nodes[(i + 1) % N];
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const target = (Math.PI * 2 * this.radius) / N;
        const diff = (target - len) * 0.5 * tokens.physics.softRing.edgeStiffness;
        const nx = dx / len;
        const ny = dy / len;
        a.x -= nx * diff * 0.5;
        a.y -= ny * diff * 0.5;
        b.x += nx * diff * 0.5;
        b.y += ny * diff * 0.5;
        void mx;
        void my;
      }
      let area = 0;
      for (let i = 0; i < N; i++) {
        const a = this.nodes[i];
        const b = this.nodes[(i + 1) % N];
        area += a.x * b.y - b.x * a.y;
      }
      const rest = Math.PI * this.radius * this.radius;
      const pressure = (rest - Math.abs(area) * 0.5) * 0.00008 * k;
      for (const n of this.nodes) {
        const dx = n.x - this.cx;
        const dy = n.y - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        n.x += (dx / d) * pressure;
        n.y += (dy / d) * pressure;
        const ang = Math.atan2(dy, dx);
        const tx = this.cx + Math.cos(ang) * this.radius;
        const ty = this.cy + Math.sin(ang) * this.radius;
        n.x += (tx - n.x) * tokens.physics.softRing.shapeMatch;
        n.y += (ty - n.y) * tokens.physics.softRing.shapeMatch;
        const accX = -ω * ω * (n.x - tx) - 2 * ζ * ω * (n.x - n.px) / Math.max(dt, 0.001);
        const accY = -ω * ω * (n.y - ty) - 2 * ζ * ω * (n.y - n.py) / Math.max(dt, 0.001);
        n.px = n.x;
        n.py = n.y;
        n.x += accX * dt * dt;
        n.y += accY * dt * dt;
      }
    }
  }

  path(ctx: CanvasRenderingContext2D): void {
    const ns = this.nodes;
    ctx.beginPath();
    ctx.moveTo((ns[0].x + ns[1].x) * 0.5, (ns[0].y + ns[1].y) * 0.5);
    for (let i = 1; i < N; i++) {
      const c = ns[i];
      const n = ns[(i + 1) % N];
      ctx.quadraticCurveTo(c.x, c.y, (c.x + n.x) * 0.5, (c.y + n.y) * 0.5);
    }
    ctx.closePath();
  }
}
