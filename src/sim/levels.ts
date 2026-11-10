import { initialField } from './lattice';
import { makeRng } from './rng';
import type { Bonbon } from './types';

export interface LevelDef {
  id: number;
  seed: string;
  template: string;
  hearts: number;
}

export const LEVELS: LevelDef[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  seed: `trail-${i + 1}`,
  template: [
    'heart',
    'smile',
    'ring',
    'spiral',
    'zigzag',
    'towers',
    'arch',
    'cat',
    'scatter',
  ][i % 9],
  hearts: 8 + (i % 12),
}));

export function generateLevelBoard(seed: string, heartCount: number): Bonbon[] {
  const { bonbons } = initialField(seed, 6);
  const rng = makeRng(seed + '-hearts');
  const candidates = [...bonbons].sort((a, b) => a.id - b.id);
  const picks = new Set<number>();
  while (picks.size < heartCount && picks.size < candidates.length) {
    picks.add(candidates[Math.floor(rng() * candidates.length)].id);
  }
  for (const b of bonbons) {
    b.heart = picks.has(b.id);
  }
  return bonbons;
}

export function dailySeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `bonbon-${y}-${m}-${d}`;
}

/** Deterministic level generator smoke */
export function levelBoardHash(seed: string): number {
  const b = generateLevelBoard(seed, 10);
  let h = 0;
  for (const x of b) {
    h = (h * 31 + x.id + x.flavour.charCodeAt(0) * 17) | 0;
  }
  return h;
}
