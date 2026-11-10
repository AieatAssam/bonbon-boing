import type { Bonbon } from './types';

export function bonbonByKey(bonbons: Bonbon[]): Map<string, Bonbon> {
  const m = new Map<string, Bonbon>();
  for (const b of bonbons) {
    if (!b.popped) m.set(`${b.row},${b.col}`, b);
  }
  return m;
}
