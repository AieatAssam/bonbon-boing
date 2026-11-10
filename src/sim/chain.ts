import { neighbours } from './lattice';
import type { Bonbon, Flavour } from './types';

export function hugChainBfs(
  start: Bonbon,
  byKey: Map<string, Bonbon>,
  colour: Flavour,
): Bonbon[] {
  const queue: Bonbon[] = [];
  const seen = new Set<number>();
  const out: Bonbon[] = [];
  queue.push(start);
  seen.add(start.id);
  while (queue.length) {
    const b = queue.shift()!;
    if (b.flavour !== colour || b.popped) continue;
    out.push(b);
    for (const [nr, nc] of neighbours(b.row, b.col)) {
      const n = byKey.get(`${nr},${nc}`);
      if (!n || seen.has(n.id) || n.popped) continue;
      if (n.flavour !== colour) continue;
      seen.add(n.id);
      queue.push(n);
    }
  }
  return out;
}
