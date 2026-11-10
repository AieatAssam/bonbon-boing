export type Flavour =
  | 'berry'
  | 'mint'
  | 'lemon'
  | 'blueberry'
  | 'peach'
  | 'grape';
export type BonbonType =
  | 'plush'
  | 'jelly'
  | 'marshmallow'
  | 'chonk'
  | 'bubble';
export type Size = 's1' | 's2' | 's3';
export type Expression =
  | 'idle'
  | 'happy'
  | 'tickled'
  | 'wow'
  | 'love'
  | 'worried'
  | 'sleepy';

export interface Bonbon {
  id: number;
  flavour: Flavour;
  type: BonbonType;
  size: Size;
  row: number;
  col: number;
  x: number;
  y: number;
  puffs: number;
  heart: boolean;
  popped: boolean;
  asleep: boolean;
}

export interface PipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  coat: Flavour;
  active: boolean;
  radius: number;
}

export type GameMode = 'rise' | 'daily' | 'trail';
