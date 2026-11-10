import { tokens } from '../tokens';
import type { Bonbon, Flavour, Size, BonbonType } from './types';
import { makeRng } from './rng';

const L = tokens.layout.lattice;
const PITCH = L.rowPitch;

export function slotX(row: number, col: number): number {
  const odd = row % 2 === 1;
  const slots = odd ? L.oddRowSlots : L.evenRowSlots;
  if (col < 0 || col >= slots) return NaN;
  return L.x0 + col * L.colPitch + (odd ? L.oddRowOffset : 0);
}

export function rowY(row: number, baseY: number): number {
  return baseY - row * L.rowPitch;
}

export function neighbours(row: number, col: number): Array<[number, number]> {
  const odd = row % 2 === 1;
  const slots = odd ? L.oddRowSlots : L.evenRowSlots;
  const out: Array<[number, number]> = [];
  const dirs = odd
    ? [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
      ]
    : [
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ];
  for (const [dc, dr] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    const nOdd = nr % 2 === 1;
    const max = nOdd ? L.oddRowSlots : L.evenRowSlots;
    if (nc >= 0 && nc < max) out.push([nr, nc]);
  }
  if (col > 0) out.push([row, col - 1]);
  if (col < slots - 1) out.push([row, col + 1]);
  return out;
}

let nextId = 1;

function clampX(x: number, r: number): number {
  const margin = 12;
  const left = tokens.layout.walls.leftX + r + margin;
  const right = tokens.layout.walls.rightX - r - margin;
  const x1 = Math.max(left, Math.min(right, x));
  return x1;
}

export function createBonbon(
  row: number,
  col: number,
  flavour: Flavour,
  size: Size,
  type: BonbonType,
  baseY: number,
  jitterRng: () => number,
  heart = false,
): Bonbon {
  const jx = (jitterRng() - 0.5) * L.jitterX * 2;
  const jy = (jitterRng() - 0.5) * L.jitterY * 2;
  const r = tokens.physics.bonbonRadiusU[size];
  const x = clampX(slotX(row, col) + jx, r);
  const y = rowY(row, baseY) + jy;
  const puffs = size === 's1' ? 1 : size === 's2' ? 2 : 3;
  return {
    id: nextId++,
    flavour,
    type,
    size,
    row,
    col,
    x,
    y,
    puffs,
    heart,
    popped: false,
    asleep: false,
  };
}

export function resetBonbonIds(): void {
  nextId = 1;
}

const START_FLAVOURS: Flavour[] = ['berry', 'mint', 'lemon', 'blueberry'];

export function pickSize(rng: () => number, stage: number): Size {
  const r = rng();
  if (stage < 4) {
    if (r < 0.18) return 's1';
    if (r < 0.9) return 's2';
    return 's3';
  }
  if (r < 0.22) return 's1';
  if (r < 0.92) return 's2';
  return 's3';
}

export function generateRow(
  row: number,
  above: Map<string, Bonbon>,
  activeFlavours: Flavour[],
  stage: number,
  emptyShare: number,
  rng: () => number,
  baseY: number,
): Bonbon[] {
  const odd = row % 2 === 1;
  const cols = odd ? L.oddRowSlots : L.evenRowSlots;
  const out: Bonbon[] = [];
  const colours: Flavour[] = [];
  for (let c = 0; c < cols; c++) {
    if (rng() < emptyShare) continue;
    const ul = above.get(`${row + 1},${c}`);
    const ur = above.get(`${row + 1},${c + (odd ? 0 : 1)}`);
    let flavour: Flavour;
    if ((ul || ur) && rng() < 0.58) {
      const pick = ul && ur ? (rng() < 0.5 ? ul : ur) : ul || ur!;
      flavour = pick.flavour;
    } else {
      flavour = activeFlavours[Math.floor(rng() * activeFlavours.length)];
    }
    let size = pickSize(rng, stage);
    if (size === 's3') {
      const hasS3 = out.some((b) => b.size === 's3');
      if (hasS3) size = 's2';
      const left = out[out.length - 1];
      if (left?.size === 's3') size = 's2';
    }
    let type: BonbonType = 'plush';
    if (stage >= 2 && rng() < 0.08) type = 'jelly';
    if (stage >= 3 && rng() < 0.06) type = 'marshmallow';
    if (stage >= 4 && size === 's3' && rng() < 0.4) type = 'chonk';
    if (stage >= 5 && rng() < 0.05) type = 'bubble';
    colours.push(flavour);
    out.push(createBonbon(row, c, flavour, size, type, baseY, rng, false));
  }
  const uniq = new Set(colours);
  if (colours.length > 1 && uniq.size === 1) {
    out[0].flavour =
      activeFlavours[(activeFlavours.indexOf(out[0].flavour) + 1) % activeFlavours.length];
  }
  return out;
}

const CAST_ROW: Flavour[][] = [
  ['berry', 'mint', 'lemon', 'blueberry', 'peach', 'grape'],
  ['grape', 'berry', 'mint', 'lemon', 'blueberry', 'peach'],
  ['blueberry', 'peach', 'berry', 'mint', 'lemon', 'grape'],
  ['mint', 'lemon', 'grape', 'berry', 'peach', 'blueberry'],
  ['lemon', 'blueberry', 'peach', 'grape', 'berry', 'mint'],
];

/** Stack height at new game — keep bottom row above the milk band (sea ~1480u). */
const START_ROWS = 6;
/** First row sits below icing + bounce room under Puff/Pip. */
const FIELD_CEILING_Y = tokens.layout.frostingY + PITCH * 4.15;
const FIELD_FLOOR_Y = tokens.layout.seaSurfaceY - PITCH * 0.32;

export function initialRiseField(
  seed: string,
): { bonbons: Bonbon[]; baseY: number } {
  const rows = START_ROWS;
  const targetTopY = FIELD_CEILING_Y;
  const baseY = Math.min(
    targetTopY + (rows - 1) * PITCH,
    FIELD_FLOOR_Y,
  );
  resetBonbonIds();
  const rng = makeRng(seed);
  const bonbons: Bonbon[] = [];
  const map = new Map<string, Bonbon>();
  const all: Flavour[] = [
    'berry',
    'mint',
    'lemon',
    'blueberry',
    'peach',
    'grape',
  ];
  for (let r = 0; r < rows; r++) {
    const row = generateRow(
      r,
      map,
      all,
      2,
      r < 2 ? 0.1 : 0.14,
      rng,
      baseY,
    );
    const pattern = CAST_ROW[r % CAST_ROW.length];
    row.forEach((b, i) => {
      b.flavour = pattern[i % pattern.length] ?? b.flavour;
      if (r === 0 && i === 2) b.asleep = true;
      bonbons.push(b);
      map.set(`${b.row},${b.col}`, b);
    });
  }
  return { bonbons, baseY };
}

export function initialField(
  seed: string,
  rows = 5,
): { bonbons: Bonbon[]; baseY: number } {
  resetBonbonIds();
  const rng = makeRng(seed);
  const targetTopY = 400;
  const baseY = targetTopY + (rows - 1) * PITCH;
  const bonbons: Bonbon[] = [];
  const map = new Map<string, Bonbon>();
  for (let r = 0; r < rows; r++) {
    const row = generateRow(
      r,
      map,
      START_FLAVOURS,
      1,
      0.2,
      rng,
      baseY,
    );
    for (const b of row) {
      bonbons.push(b);
      map.set(`${b.row},${b.col}`, b);
    }
  }
  return { bonbons, baseY };
}

export function bonbonRadius(size: import('./types').Size): number {
  return tokens.physics.bonbonRadiusU[size];
}
