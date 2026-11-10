import { drawBonbon } from './bonbon';
import type { Flavour } from '../sim/types';

export function paintBonbonPreview(
  canvas: HTMLCanvasElement,
  flavour: Flavour,
  cssPx = 52,
): void {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const px = Math.round(cssPx * dpr);
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${cssPx}px`;
  canvas.style.height = `${cssPx}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, px, px);
  const w = px * 0.72;
  drawBonbon(ctx, px / 2, px * 0.84, {
    flavour,
    w,
    expr: 'idle',
    shadow: false,
  });
}
