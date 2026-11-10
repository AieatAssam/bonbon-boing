import { tokens } from '../tokens';
import { drawBonbon } from './bonbon';
import { bonbonRadius } from '../sim/lattice';
import type { Bonbon, Flavour, Expression } from '../sim/types';

const W = tokens.layout;
const C = tokens.color.world;
const PITCH = W.lattice.rowPitch;

export interface SceneDrawOpts {
  bonbons: Bonbon[];
  pipInCloud?: boolean;
  pipCoat?: Flavour;
  nextCoat?: Flavour;
  cupX: number;
  aimDots?: Array<{ x: number; y: number; a: number }>;
  comboFx?: boolean;
  hideNextBubble?: boolean;
  warn?: boolean;
  puffMouthO?: boolean;
  puffScale?: { x: number; y: number };
  aiming?: boolean;
}

export function drawSky(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  milkLineY?: number,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, C.skyTop);
  g.addColorStop(0.45, C.skyMid);
  const milkAt = milkLineY ?? vh * 0.9;
  const t = Math.max(0.62, Math.min(0.92, milkAt / vh - 0.02));
  g.addColorStop(t, C.skyMid);
  g.addColorStop(Math.min(0.98, t + 0.06), C.milkTop);
  g.addColorStop(1, C.milkBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  scale: number,
  ox: number,
  oy: number,
  o: SceneDrawOpts,
): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, 0, 230, W.worldW, 1370, 70);
  ctx.fill();

  drawWalls(ctx);
  const warn = o.warn;
  ctx.strokeStyle = warn ? C.frostingWarn : C.frosting;
  ctx.lineWidth = 9;
  ctx.globalAlpha = warn ? 1 : 0.55;
  ctx.setLineDash([2, 22]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const x = 30 + i * 47;
    const y = i % 2 === 0 ? 330 : 318;
    if (i === 0) ctx.moveTo(x, 330);
    else ctx.quadraticCurveTo(x - 23, y, x + 25, 330);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  drawMilk(ctx, o.cupX);

  const cupBandTop = W.seaSurfaceY - PITCH * 0.35;
  const playBonbons: Bonbon[] = [];
  const milkBonbons: Bonbon[] = [];
  for (const b of o.bonbons) {
    if (b.popped) continue;
  const r = bonbonRadius(b.size);
    if (b.falling || b.y <= cupBandTop + r * 0.35) playBonbons.push(b);
    else milkBonbons.push(b);
  }

  for (const b of playBonbons) {
    const r = bonbonRadius(b.size);
    const w = r * 2.02;
    const expr: Expression =
      b.expr ??
      (b.asleep ? 'sleepy' : b.size === 's3' && b.type === 'chonk' ? 'sleepy' : 'idle');
    const drawY = (b.falling ? b.y : b.y) + r * 0.94;
    drawBonbon(ctx, b.x, drawY, {
      flavour: b.flavour,
      w,
      expr,
      type: b.type,
      sx: b.sx,
      sy: b.sy,
    });
    if (b.heart) {
      ctx.save();
      ctx.translate(b.x + r * 0.62, b.y - r * 0.7);
      drawHeart(ctx, 0, 0, 14);
      ctx.restore();
    }
  }

  drawCup(ctx, o.cupX, W.cup.y);

  ctx.save();
  ctx.globalAlpha = 0.42;
  for (const b of milkBonbons) {
    const r = bonbonRadius(b.size);
    const w = r * 1.75;
    const drawY = (b.falling ? b.y : b.y) + r * 0.94;
    drawBonbon(ctx, b.x, drawY, {
      flavour: b.flavour,
      w,
      expr: 'sleepy',
      type: b.type,
    });
  }
  ctx.restore();

  const ps = o.puffScale ?? { x: 1, y: 1 };
  drawCloudBody(ctx, W.puffCloud.x, W.puffCloud.y, W.puffCloud.w, ps);
  if (o.pipInCloud !== false) {
    drawBonbon(ctx, W.pipSpawn.x, W.pipSpawn.y, {
      pip: true,
      coat: o.pipCoat ?? 'berry',
      w: tokens.physics.pipRadiusU * 2.45,
      expr: o.aiming ? 'wow' : 'happy',
      sx: 0.92,
      sy: 1.04,
    });
  }
  drawCloudFace(ctx, W.puffCloud.x, W.puffCloud.y, W.puffCloud.w, {
    mouthO: o.puffMouthO,
    sx: ps.x,
    sy: ps.y,
  });
  if (!o.hideNextBubble) drawNextBonbon(ctx, o.nextCoat ?? 'mint');

  if (o.aimDots?.length) {
    for (let i = 0; i < o.aimDots.length; i++) {
      const d = o.aimDots[i];
      ctx.globalAlpha = d.a;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.strokeStyle = 'rgba(255,255,255,0.96)';
      ctx.lineWidth = 4;
      ctx.setLineDash(i > 12 ? [6, 10] : []);
      ctx.beginPath();
      ctx.arc(d.x, d.y, i < 3 ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  if (o.comboFx) {
    ctx.save();
    ctx.translate(560, 1060);
    ctx.rotate(-0.1);
    ctx.font = '700 72px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = tokens.color.ui.ink;
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.strokeText('HUG ×4!', 0, 0);
    const rg = ctx.createLinearGradient(-120, 0, 120, 0);
    tokens.color.fx.rainbow.forEach((col, i) =>
      rg.addColorStop(i / 5, col),
    );
    ctx.fillStyle = rg;
    ctx.fillText('HUG ×4!', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWalls(ctx: CanvasRenderingContext2D): void {
  for (const x of [0, 1000]) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = C.wallOutline;
    ctx.lineWidth = 5;
    roundRect(ctx, x - 16, 180, 32, 1300, 16);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x - 16, 180, 32, 1300, 16);
    ctx.clip();
    for (let y = 150; y < 1500; y += 58) {
      ctx.fillStyle = C.wallStripeB;
      ctx.beginPath();
      ctx.moveTo(x - 20, y);
      ctx.lineTo(x + 20, y - 26);
      ctx.lineTo(x + 20, y - 6);
      ctx.lineTo(x - 20, y + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

const MILK_DEPTH_U = 105;

function drawMilk(ctx: CanvasRenderingContext2D, _cupX: number): void {
  const seaY = W.seaSurfaceY;
  const depth = MILK_DEPTH_U;
  const g = ctx.createLinearGradient(0, seaY, 0, seaY + depth);
  g.addColorStop(0, C.milkTop);
  g.addColorStop(0.55, C.milkBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-200, seaY);
  for (let i = 0; i < 14; i++) {
    const x = -100 + i * 100;
    const cy = seaY - (i % 2 ? 22 : -8);
    ctx.quadraticCurveTo(x - 50, cy, x, seaY);
  }
  ctx.lineTo(1200, seaY + depth);
  ctx.lineTo(-200, seaY + depth);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.milkFoam;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-200, seaY);
  for (let i = 0; i < 14; i++) {
    const x = -100 + i * 100;
    const cy = seaY - (i % 2 ? 26 : -10);
    ctx.quadraticCurveTo(x - 50, cy, x, seaY);
  }
  ctx.stroke();
}

function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(58,31,77,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 40, 120, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -40, 0, 58);
  g.addColorStop(0, '#B9F3FF');
  g.addColorStop(1, '#3FB8F5');
  ctx.fillStyle = g;
  ctx.strokeStyle = tokens.color.ui.ink;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-120, -40);
  ctx.lineTo(120, -40);
  ctx.bezierCurveTo(116, 30, 70, 58, 0, 58);
  ctx.bezierCurveTo(-70, 58, -116, 30, -120, -40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFF3FA';
  ctx.beginPath();
  ctx.ellipse(0, -40, 120, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawHeart(ctx, 0, 12, 20);
  ctx.restore();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 10, r / 10);
  ctx.fillStyle = tokens.color.ui.heart;
  ctx.strokeStyle = tokens.color.face.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.bezierCurveTo(-16, -2, -10, -15, 0, -7);
  ctx.bezierCurveTo(10, -15, 16, -2, 0, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCloudBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ps: { x: number; y: number },
): void {
  const s = w / 200;
  ctx.save();
  ctx.translate(x - w / 2, y - w * 0.3);
  ctx.scale(s * ps.x, s * ps.y);
  ctx.fillStyle = C.cloudShade;
  ctx.beginPath();
  ctx.moveTo(30, 116);
  ctx.bezierCurveTo(6, 116, 4, 84, 30, 80);
  ctx.bezierCurveTo(26, 52, 62, 42, 76, 62);
  ctx.bezierCurveTo(84, 32, 130, 30, 138, 62);
  ctx.bezierCurveTo(160, 46, 192, 64, 178, 90);
  ctx.bezierCurveTo(200, 98, 192, 122, 168, 120);
  ctx.lineTo(30, 120);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(30, 110);
  ctx.bezierCurveTo(6, 110, 4, 78, 30, 74);
  ctx.bezierCurveTo(26, 46, 62, 36, 76, 56);
  ctx.bezierCurveTo(84, 26, 130, 24, 138, 56);
  ctx.bezierCurveTo(160, 40, 192, 58, 178, 84);
  ctx.bezierCurveTo(200, 92, 192, 116, 168, 114);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCloudFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  o: { mouthO?: boolean; sx?: number; sy?: number },
): void {
  const s = w / 200;
  ctx.save();
  ctx.translate(x - w / 2, y - w * 0.3);
  ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
  ctx.strokeStyle = tokens.color.face.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(30, 110);
  ctx.bezierCurveTo(6, 110, 4, 78, 30, 74);
  ctx.bezierCurveTo(26, 46, 62, 36, 76, 56);
  ctx.bezierCurveTo(84, 26, 130, 24, 138, 56);
  ctx.bezierCurveTo(160, 40, 192, 58, 178, 84);
  ctx.bezierCurveTo(200, 92, 192, 116, 168, 114);
  ctx.closePath();
  ctx.stroke();
  {
    const ink = tokens.color.face.ink;
    for (const cx of [80, 120]) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(cx, 78, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx - 2, 74.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.mouthO) {
      ctx.fillStyle = tokens.color.face.mouthInside;
      ctx.beginPath();
      ctx.ellipse(100, 92, 11, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(93, 90);
      ctx.quadraticCurveTo(100, 97, 107, 90);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawNextBonbon(ctx: CanvasRenderingContext2D, coat: Flavour): void {
  const nb = W.nextBubblePortrait;
  const r = nb.r;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = tokens.color.ui.paperBorder;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(nb.x, nb.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const innerW = r * 1.4;
  drawBonbon(ctx, nb.x, nb.y + innerW * 0.42, {
    flavour: coat,
    w: innerW,
    expr: 'idle',
    shadow: false,
  });
  const bx = nb.x + r * 0.58;
  const by = nb.y - r * 0.62;
  ctx.fillStyle = tokens.color.ui.primaryTop;
  ctx.strokeStyle = tokens.color.ui.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0.4 * Math.PI, 1.45 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by, 7, 1.15 * Math.PI, 2.2 * Math.PI);
  ctx.stroke();
}

/** Visible play slice (u): Puff through thin milk band at bottom (~8–10% of height). */
const MILK_BAND_U = 105;
const VIEW_TOP = 260;
const VIEW_TOP_L = 200;
const VIEW_H_P =
  tokens.layout.seaSurfaceY + MILK_BAND_U - VIEW_TOP;
const VIEW_H_L =
  tokens.layout.seaSurfaceY + MILK_BAND_U - VIEW_TOP_L;

export function computeLayout(vw: number, vh: number) {
  const landscape = vw / vh > 1.15;
  const hudH = landscape ? 0 : Math.max(60, Math.min(76, vh * 0.08));
  const sideW = landscape
    ? Math.max(150, Math.min(300, (vw - vh * 0.625) / 2))
    : 0;
  const availW = vw - sideW * 2;
  const availH = vh - hudH - (landscape ? 0 : 6);
  const viewTop = landscape ? VIEW_TOP_L : VIEW_TOP;
  const viewH = landscape ? VIEW_H_L : VIEW_H_P;
  let scale = landscape
    ? Math.min(availW / W.worldW, availH / viewH)
    : availH / viewH;
  let fh = viewH * scale;
  if (landscape && fh > availH) {
    scale = availH / viewH;
    fh = availH;
  }
  const fw = W.worldW * scale;
  const fx = (vw - fw) / 2;
  const fy = landscape ? (vh - fh) / 2 : hudH;
  const uiScale = landscape
    ? Math.max(1, Math.min(1.6, vh / 430))
    : Math.max(1, Math.min(1.2, vw / 430));
  const fieldY = fy - viewTop * scale;
  return {
    landscape,
    hudH,
    sideW,
    scale,
    fx,
    fy,
    fieldY,
    viewTop,
    viewH,
    fw,
    fh,
    uiScale,
  };
}

export function puffScreenRect(
  vw: number,
  vh: number,
): { left: number; top: number; right: number; bottom: number } {
  const L = computeLayout(vw, vh);
  const fieldY = L.fieldY ?? L.fy;
  const puff = W.puffCloud;
  const sc = L.scale;
  const cx = L.fx + puff.x * sc;
  const cy = fieldY + (puff.y - puff.w * 0.28) * sc;
  const ww = puff.w * sc;
  const hh = puff.w * 0.52 * sc;
  return {
    left: cx - ww / 2,
    top: cy,
    right: cx + ww / 2,
    bottom: cy + hh,
  };
}
