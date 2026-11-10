/** Mockup play_390x844.png vertical anchors (fractions of viewport height). */
export const PORTRAIT_MOCKUP = {
  hudEnd: 95 / 844,
  puffCy: 180 / 844,
  icing: 265 / 844,
  fieldTop: 290 / 844,
  milkTop: 800 / 844,
  milkHeight: 44 / 844,
} as const;

export function milkBandMaxPx(vh: number): number {
  return Math.min(vh * 0.1, vh * PORTRAIT_MOCKUP.milkHeight);
}

export function hudEndPx(vh: number): number {
  return vh * PORTRAIT_MOCKUP.hudEnd;
}

export function mockupPuffCyPx(vh: number): number {
  return vh * PORTRAIT_MOCKUP.puffCy;
}
