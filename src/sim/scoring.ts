import type { Size } from './types';

export function sizeMult(size: Size): number {
  return size === 's1' ? 1 : size === 's2' ? 2 : 3;
}

export function ticklePoints(size: Size): number {
  return 10 * sizeMult(size);
}

export function popPoints(size: Size, k: number): number {
  const mult = Math.min(4, 1 + 0.25 * (k - 1));
  return 100 * sizeMult(size) * mult;
}

export function hugChainBonus(n: number): number {
  if (n < 3) return 0;
  return 150 * n * (n - 2);
}

export const CATCH_POINTS = 500;
export const CLEAN_SWEEP = 10_000;
export const BANK_BOING = 250;
