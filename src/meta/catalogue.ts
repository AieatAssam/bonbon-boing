import type { SaveV3 } from './save'

export type CatalogKind = 'skin' | 'theme' | 'pop'

export type CatalogItem = {
  id: string
  kind: CatalogKind
  name: string
  emoji: string
  blurb: string
  priceStars: number
  minLevel?: number
  needsAchievement?: string
}

export const CATALOGUE: CatalogItem[] = [
  { id: 'classic', kind: 'skin', name: 'Classic Pip', emoji: '🍡', blurb: 'The original squish!', priceStars: 0 },
  { id: 'macaron', kind: 'skin', name: 'Macaron', emoji: '🥐', blurb: 'Crispy shell, soft heart.', priceStars: 8, minLevel: 2 },
  { id: 'gummy', kind: 'skin', name: 'Gummy', emoji: '🐻', blurb: 'Wobble hero.', priceStars: 12, minLevel: 4 },
  { id: 'mochi', kind: 'skin', name: 'Mochi', emoji: '🍥', blurb: 'Extra stretchy.', priceStars: 15, minLevel: 6 },
  { id: 'jelly', kind: 'skin', name: 'Jelly', emoji: '🫧', blurb: 'Sparkle bounce.', priceStars: 18, minLevel: 8 },
  {
    id: 'starcookie',
    kind: 'skin',
    name: 'Star Cookie',
    emoji: '⭐',
    blurb: 'For sweet legends.',
    priceStars: 25,
    minLevel: 12,
    needsAchievement: 'chain_10',
  },
  { id: 'candy', kind: 'theme', name: 'Candy Sky', emoji: '🌈', blurb: 'Pink clouds & sprinkles.', priceStars: 0 },
  { id: 'night', kind: 'theme', name: 'Night Sprinkle', emoji: '🌙', blurb: 'Moonlit bonbons.', priceStars: 10, minLevel: 3 },
  { id: 'beach', kind: 'theme', name: 'Beach Day', emoji: '🏖️', blurb: 'Sunny soda sea.', priceStars: 14, minLevel: 5 },
  { id: 'winter', kind: 'theme', name: 'Winter Frost', emoji: '❄️', blurb: 'Icy cute.', priceStars: 16, minLevel: 7 },
  {
    id: 'space',
    kind: 'theme',
    name: 'Space Jelly',
    emoji: '🚀',
    blurb: 'Zero-g boings.',
    priceStars: 22,
    minLevel: 10,
    needsAchievement: 'adventure_15',
  },
  { id: 'sparkle', kind: 'pop', name: 'Sparkle', emoji: '✨', blurb: 'Tiny stars.', priceStars: 0 },
  { id: 'hearts', kind: 'pop', name: 'Heart Puffs', emoji: '💕', blurb: 'Love burst.', priceStars: 9, minLevel: 2 },
  { id: 'bubbles', kind: 'pop', name: 'Bubbles', emoji: '🫧', blurb: 'Soap fizz.', priceStars: 11, minLevel: 4 },
  {
    id: 'confetti',
    kind: 'pop',
    name: 'Confetti',
    emoji: '🎉',
    blurb: 'Party trail.',
    priceStars: 20,
    minLevel: 9,
    needsAchievement: 'combo_5',
  },
]

const byId = new Map(CATALOGUE.map((c) => [c.id, c]))

export function getCatalogItem(id: string): CatalogItem | undefined {
  return byId.get(id)
}

export function itemsOfKind(kind: CatalogKind): CatalogItem[] {
  return CATALOGUE.filter((c) => c.kind === kind)
}

export function ownedList(save: SaveV3, kind: CatalogKind): string[] {
  return kind === 'skin' ? save.owned.skins : kind === 'theme' ? save.owned.themes : save.owned.pops
}

export function isOwned(save: SaveV3, id: string): boolean {
  const item = getCatalogItem(id)
  if (!item) return false
  return ownedList(save, item.kind).includes(id)
}

export function meetsGates(save: SaveV3, item: CatalogItem): boolean {
  if (item.minLevel != null && save.profile.level < item.minLevel) return false
  if (item.needsAchievement != null && save.achievements[item.needsAchievement] !== 1) return false
  return true
}

export function canPurchase(save: SaveV3, id: string): { ok: boolean; reason?: string } {
  const item = getCatalogItem(id)
  if (!item) return { ok: false, reason: 'missing' }
  if (isOwned(save, id)) return { ok: false, reason: 'owned' }
  if (!meetsGates(save, item)) return { ok: false, reason: 'locked' }
  if (save.profile.stars < item.priceStars) return { ok: false, reason: 'stars' }
  return { ok: true }
}

export function purchase(save: SaveV3, id: string): boolean {
  const check = canPurchase(save, id)
  if (!check.ok) return false
  const item = getCatalogItem(id)!
  save.profile.stars -= item.priceStars
  const list = ownedList(save, item.kind)
  if (!list.includes(id)) list.push(id)
  save.stats.shopPurchases += 1
  return true
}

export function equip(save: SaveV3, id: string): boolean {
  const item = getCatalogItem(id)
  if (!item || !isOwned(save, id)) return false
  if (item.kind === 'skin') save.equipped.skin = id
  else if (item.kind === 'theme') save.equipped.theme = id
  else save.equipped.pop = id
  return true
}
