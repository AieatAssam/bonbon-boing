import { tokens } from '../tokens';
import type { BonbonType, Expression, Flavour } from '../sim/types';

const T = tokens;
const BODY =
  'M50,6 C80,6 98,28 98,56 C98,80 78,94 50,94 C22,94 2,80 2,56 C2,28 20,6 50,6 Z';

type ColourSet = {
  accent: string;
  base: string;
  light: string;
  dark: string;
  outline: string;
  blush: string;
  inner: string;
};

function flavourColors(fl: Flavour): ColourSet {
  return T.color.flavour[fl] as ColourSet;
}

export function bodyPath(ctx: CanvasRenderingContext2D): void {
  const p = new Path2D(BODY);
  ctx.fill(p);
}

function drawAccent(
  ctx: CanvasRenderingContext2D,
  kind: string,
  c: ColourSet,
  behind: boolean,
): void {
  const o = c.outline;
  const b = c.base;
  const inner = c.inner;
  const sw = 4.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = o;
  switch (kind) {
    case 'catEars':
      if (!behind) return;
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.moveTo(14, 34);
      ctx.lineTo(18, 4);
      ctx.quadraticCurveTo(20, -1, 25, 2);
      ctx.lineTo(44, 16);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = sw;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(86, 34);
      ctx.lineTo(82, 4);
      ctx.quadraticCurveTo(80, -1, 75, 2);
      ctx.lineTo(56, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'bearEars':
      if (!behind) return;
      for (const [cx, cy] of [
        [20, 18],
        [80, 18],
      ]) {
        ctx.fillStyle = b;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = sw;
        ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.arc(cx + (cx === 20 ? 1 : -1), cy + 1, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'bunnyEars':
      if (!behind) return;
      ctx.save();
      ctx.translate(34, 20);
      ctx.rotate(-0.21);
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = sw;
      ctx.stroke();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.ellipse(0, 2, 4.5, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(66, 20);
      ctx.rotate(0.24);
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = sw;
      ctx.stroke();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.ellipse(0, 2, 4.5, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    case 'tuft':
      if (!behind) return;
      ctx.fillStyle = c.dark;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(50, 10);
      ctx.bezierCurveTo(44, -2, 52, -8, 56, -3);
      ctx.bezierCurveTo(52, -1, 52, 4, 54, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'floppyEars':
      ctx.fillStyle = c.dark;
      ctx.lineWidth = sw;
      if (behind) {
        ctx.beginPath();
        ctx.moveTo(22, 16);
        ctx.bezierCurveTo(6, 14, -4, 36, 2, 56);
        ctx.bezierCurveTo(5, 66, 16, 64, 18, 54);
        ctx.bezierCurveTo(20, 42, 22, 30, 30, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(78, 16);
        ctx.bezierCurveTo(94, 14, 104, 36, 98, 56);
        ctx.bezierCurveTo(95, 66, 84, 64, 82, 54);
        ctx.bezierCurveTo(80, 42, 78, 30, 70, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'gills':
      if (!behind) return;
      for (const [d, x] of [
        [-1, 8],
        [1, 92],
      ]) {
        for (const [dy, y, i] of [
          [-8, 26, 0],
          [0, 40, 1],
          [8, 54, 2],
        ]) {
          const ex = x + d * (12 + (i === 1 ? 5 : 0));
          ctx.save();
          ctx.translate(ex, y - 6);
          ctx.rotate((d * dy * 2.5 * Math.PI) / 180);
          ctx.fillStyle = inner;
          ctx.strokeStyle = o;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, i === 1 ? 10 : 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      break;
    case 'sprout':
      if (!behind) return;
      ctx.strokeStyle = T.color.pip.sproutDark;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50, 8);
      ctx.quadraticCurveTo(50, -2, 53, -6);
      ctx.stroke();
      ctx.fillStyle = T.color.pip.sprout;
      ctx.strokeStyle = T.color.pip.sproutDark;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(53, -5);
      ctx.bezierCurveTo(58, -14, 70, -12, 70, -6);
      ctx.bezierCurveTo(64, -2, 57, -2, 53, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    default:
      break;
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  expr: Expression,
  c: ColourSet,
  big: boolean,
  accent: string,
): void {
  const ink = T.color.face.ink;
  const ex = big ? 16 : 18;
  const ey = 57;
  const rx = big ? 8 : 7;
  const ry = big ? 10 : 9;
  const drawEye = (x: number) => {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(x, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - rx * 0.3, ey - ry * 0.38, rx * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rx * 0.34, ey + ry * 0.34, rx * 0.2, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.fillStyle = c.blush;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(50 - 29, 68, 8, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(50 + 29, 68, 8, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const mouthIdle = accent === 'catEars';
  if (expr === 'idle' || expr === 'sleepy') {
    drawEye(50 - ex);
    drawEye(50 + ex);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (expr === 'sleepy') {
      ctx.beginPath();
      ctx.arc(50 - ex, ey, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(50 + ex, ey, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    ctx.beginPath();
    if (mouthIdle) {
      ctx.moveTo(43.5, 65.5);
      ctx.quadraticCurveTo(46.75, 70, 50, 66);
      ctx.quadraticCurveTo(53.25, 70, 56.5, 65.5);
    } else {
      ctx.moveTo(45.5, 66);
      ctx.quadraticCurveTo(50, 71, 54.5, 66);
    }
    ctx.stroke();
  } else if (expr === 'happy' || expr === 'love' || expr === 'wow') {
    if (expr === 'love') {
      for (const x of [50 - ex, 50 + ex]) {
        ctx.fillStyle = T.color.face.heartEye;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        ctx.save();
        ctx.translate(x, ey);
        ctx.scale(0.62, 0.62);
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.bezierCurveTo(-14, -2, -9, -14, 0, -7);
        ctx.bezierCurveTo(9, -14, 14, -2, 0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (expr === 'wow') {
      drawEye(50 - ex);
      drawEye(50 + ex);
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      for (const x of [50 - ex, 50 + ex]) {
        ctx.beginPath();
        ctx.moveTo(x - 6, ey + 2);
        ctx.quadraticCurveTo(x, ey - 7, x + 6, ey + 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = T.color.face.mouthInside;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    if (expr === 'wow') {
      ctx.beginPath();
      ctx.ellipse(50, 69, 4.2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(44, 65);
      ctx.quadraticCurveTo(50, 64, 56, 65);
      ctx.quadraticCurveTo(55, 75, 50, 75);
      ctx.quadraticCurveTo(45, 75, 44, 65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = T.color.face.tongue;
      ctx.beginPath();
      ctx.ellipse(50, 72, 3.4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (expr === 'tickled' || expr === 'worried') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(50 - ex - 5, ey - 5);
    ctx.lineTo(50 - ex + 4, ey);
    ctx.lineTo(50 - ex - 5, ey + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50 + ex + 5, ey - 5);
    ctx.lineTo(50 + ex - 4, ey);
    ctx.lineTo(50 + ex + 5, ey + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(44, 69);
    ctx.quadraticCurveTo(47, 66, 50, 69);
    ctx.quadraticCurveTo(53, 72, 56, 69);
    ctx.stroke();
    if (expr === 'tickled' || expr === 'worried') {
      ctx.fillStyle = T.color.face.sweat;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(84, 36);
      ctx.bezierCurveTo(80, 43, 82, 48, 86, 48);
      ctx.bezierCurveTo(90, 48, 91, 43, 84, 36);
      ctx.fill();
      ctx.stroke();
    }
  }
}

export interface DrawBonbonOpts {
  flavour?: Flavour;
  pip?: boolean;
  coat?: Flavour;
  w: number;
  expr?: Expression;
  sx?: number;
  sy?: number;
  rot?: number;
  shadow?: boolean;
  type?: BonbonType;
}

export function drawBonbon(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  o: DrawBonbonOpts,
): void {
  let c: ColourSet;
  let acc: string;
  let big = false;
  if (o.pip) {
    if (o.coat) {
      c = { ...flavourColors(o.coat), blush: T.color.pip.blush };
    } else {
      c = {
        accent: 'sprout',
        base: T.color.pip.base,
        light: T.color.pip.light,
        dark: T.color.pip.dark,
        outline: T.color.pip.outline,
        blush: T.color.pip.blush,
        inner: '#FFFFFF',
      };
    }
    acc = 'sprout';
    big = true;
  } else {
    c = flavourColors(o.flavour!);
    acc = c.accent;
  }
  const w = o.w;
  const s = w / 100;
  const sx = o.sx ?? 1;
  const sy = o.sy ?? 1 / sx;
  const rot = o.rot ?? 0;
  ctx.save();
  ctx.filter = 'saturate(1.16) contrast(1.05)';
  ctx.translate(ox, oy);
  ctx.translate(w / 2, w * 0.94);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.translate(-w / 2, -w * 0.94);

  const unit = (fn: (c: CanvasRenderingContext2D) => void) => {
    ctx.save();
    ctx.translate(50, 94);
    ctx.scale(sx, sy);
    ctx.translate(-50, -94);
    fn(ctx);
    ctx.restore();
  };

  if (o.shadow !== false) {
    ctx.save();
    ctx.globalAlpha = T.color.light.shadowAlpha;
    ctx.fillStyle = T.color.light.shadow;
    ctx.beginPath();
    ctx.ellipse(50, 95, 38 * Math.min(1.5, sx), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  unit((g) => {
    drawAccent(g, acc, c, acc !== 'floppyEars');
    const grad = g.createLinearGradient(0, 0, 0, 100);
    grad.addColorStop(0, c.light);
    grad.addColorStop(0.45, c.base);
    grad.addColorStop(1, c.dark);
    g.fillStyle = grad;
    const p = new Path2D(BODY);
    g.fill(p);
    g.save();
    g.clip(p);
    const ig = g.createRadialGradient(46, 38, 0, 46, 38, 50);
    ig.addColorStop(0, c.light);
    ig.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = T.color.light.innerGlowAlpha;
    g.fillStyle = ig;
    g.fillRect(0, 0, 100, 100);
    g.globalAlpha = 1;
    const bg = g.createRadialGradient(50, 115, 0, 50, 115, 62);
    bg.addColorStop(0.55, c.dark);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = T.color.light.bottomShadeAlpha;
    g.fillStyle = bg;
    g.fillRect(0, 0, 100, 100);
    g.globalAlpha = 1;
    g.strokeStyle = c.light;
    g.globalAlpha = T.color.light.rimAlpha;
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(92, 58);
    g.bezierCurveTo(90, 80, 74, 90, 54, 91);
    g.stroke();
    g.globalAlpha = 1;
    g.restore();
    if (o.pip && o.coat) {
      g.save();
      g.clip(p);
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(100, 0);
      g.lineTo(100, 36);
      g.bezierCurveTo(92, 36, 90, 50, 82, 48);
      g.bezierCurveTo(74, 46, 76, 34, 66, 36);
      g.bezierCurveTo(58, 38, 60, 54, 50, 52);
      g.bezierCurveTo(40, 50, 44, 36, 34, 38);
      g.bezierCurveTo(24, 40, 26, 50, 16, 48);
      g.bezierCurveTo(8, 46, 8, 36, 0, 36);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.strokeStyle = c.outline;
    g.lineWidth = 4.5;
    g.lineJoin = 'round';
    g.stroke(p);
    g.save();
    g.globalAlpha = Math.min(1, T.color.light.specularAlpha * 1.35);
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(29, 25, 16, 7.5, -0.49, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(51, 15, 3.6, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.7;
    g.beginPath();
    g.arc(16, 42, 2.2, 0, Math.PI * 2);
    g.fill();
    g.restore();
    drawAccent(g, acc, c, false);
    if (o.type === 'marshmallow') {
      g.globalAlpha = 0.9;
      for (const [x, y] of [
        [30, 40],
        [70, 38],
        [55, 55],
        [38, 62],
        [62, 65],
      ]) {
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x, y, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    if (o.type === 'jelly') {
      g.strokeStyle = '#fff';
      g.lineWidth = 4;
      g.setLineDash([4, 10]);
      g.beginPath();
      g.arc(50, 50, 42, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  });

  const faceScale = Math.max(
    0.92,
    Math.min(1.08, Math.sqrt(sx * sy) * (sx > 1 ? 1.03 : 0.98)),
  );
  const faceDy = (94 - 60) * (1 - sy);
  ctx.save();
  ctx.translate(50, 60 + faceDy);
  ctx.scale(faceScale, faceScale);
  ctx.translate(-50, -60);
  drawFace(ctx, o.expr ?? 'idle', c, big, acc);
  ctx.restore();

  ctx.restore();
}
