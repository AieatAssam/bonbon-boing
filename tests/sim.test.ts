import { describe, it, expect } from 'vitest';
import { makeRng, seedFromString } from '../src/sim/rng';
import { hugChainBfs } from '../src/sim/chain';
import { createBonbon, initialField, neighbours } from '../src/sim/lattice';
import { previewShot, simulateShot } from '../src/sim/shot';
import {
  hugChainBonus,
  popPoints,
  ticklePoints,
} from '../src/sim/scoring';
import { dailySeed, generateLevelBoard, levelBoardHash } from '../src/sim/levels';
import type { Bonbon, Flavour } from '../src/sim/types';

describe('rng', () => {
  it('is deterministic for same seed string', () => {
    const a = makeRng('test-seed');
    const b = makeRng('test-seed');
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });
});

describe('simulateShot', () => {
  it('mutates bonbon array in place (for balance harness)', () => {
    const { bonbons } = initialField('mut-1', 5);
    const field = bonbons.map((b) => ({ ...b }));
    const coat = field[0].flavour;
    simulateShot(
      {
        angleRad: (-15 * Math.PI) / 180,
        coat,
        spawnX: 500,
        spawnY: 235,
      },
      field,
      400,
    );
    expect(field.some((b) => b.popped)).toBe(true);
  });
});

describe('preview equals shot until first contact', () => {
  it('matches first bonbon contact', () => {
    const { bonbons } = initialField('prev-1', 5);
    const input = {
      angleRad: (-40 * Math.PI) / 180,
      coat: 'berry' as Flavour,
      spawnX: 500,
      spawnY: 235,
    };
    const cupX = 500;
    const prev = previewShot(input, bonbons.map((b) => ({ ...b })), cupX);
    const full = simulateShot(input, bonbons.map((b) => ({ ...b })), cupX);
    expect(prev.contacts[0]?.kind).toBe(full.contacts[0]?.kind);
    if (prev.contacts[0]?.bonbon && full.contacts[0]?.bonbon) {
      expect(prev.contacts[0].bonbon.id).toBe(full.contacts[0].bonbon.id);
    }
    expect(prev.path.length).toBeGreaterThanOrEqual(2);
  });
});

describe('chain BFS', () => {
  it('finds hex neighbours same colour', () => {
    const baseY = 1000;
    const rng = () => 0.5;
    const a = createBonbon(0, 0, 'berry', 's2', 'plush', baseY, rng);
    const b = createBonbon(0, 1, 'berry', 's2', 'plush', baseY, rng);
    const c = createBonbon(1, 0, 'berry', 's2', 'plush', baseY, rng);
    const d = createBonbon(2, 0, 'mint', 's2', 'plush', baseY, rng);
    const map = new Map<string, Bonbon>();
    for (const x of [a, b, c, d]) map.set(`${x.row},${x.col}`, x);
    const chain = hugChainBfs(a, map, 'berry');
    expect(chain.map((x) => x.id).sort()).toEqual([a.id, b.id, c.id].sort());
    expect(neighbours(0, 0).length).toBeGreaterThan(2);
  });
});

describe('scoring table', () => {
  it('tickle and pop', () => {
    expect(ticklePoints('s2')).toBe(20);
    expect(popPoints('s3', 1)).toBe(300);
    expect(hugChainBonus(4)).toBe(1200);
    expect(hugChainBonus(2)).toBe(0);
  });
});

describe('row constraints', () => {
  it('never single-colour-only row from generator', () => {
    const { bonbons } = initialField('rows-1', 8);
    const byRow = new Map<number, Bonbon[]>();
    for (const b of bonbons) {
      if (!byRow.has(b.row)) byRow.set(b.row, []);
      byRow.get(b.row)!.push(b);
    }
    for (const row of byRow.values()) {
      if (row.length < 2) continue;
      const flavours = new Set(row.map((b) => b.flavour));
      expect(flavours.size).toBeGreaterThan(1);
    }
  });
});

describe('daily seed', () => {
  it('is stable', () => {
    expect(dailySeed(new Date('2026-11-10'))).toBe('bonbon-2026-11-10');
    expect(seedFromString(dailySeed())).toHaveLength(4);
  });
});

describe('level generator', () => {
  it('is deterministic', () => {
    expect(levelBoardHash('trail-7')).toBe(levelBoardHash('trail-7'));
    const b = generateLevelBoard('trail-1', 12);
    expect(b.filter((x) => x.heart).length).toBe(12);
  });
});
