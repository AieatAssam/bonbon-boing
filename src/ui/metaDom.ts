/**
 * Suggested styles.css snippets (append when wiring meta overlays):
 *
 * .meta-scrim { position: fixed; inset: 0; z-index: 10; pointer-events: auto;
 *   background: rgba(58,21,48,.35); display: flex; align-items: stretch; justify-content: center; }
 * .meta-panel { margin: auto; max-width: min(420px, 100% - 24px); max-height: min(92vh, 720px);
 *   overflow: auto; background: var(--card); border: 3px solid var(--line); border-radius: 24px;
 *   padding: 16px 14px 20px; box-shadow: 0 8px 0 #f3b6d4; pointer-events: auto; }
 * .meta-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
 * .meta-title { font: 800 22px/1.1 'Fredoka Variable', system-ui, sans-serif; margin: 0; color: var(--ink); }
 * .meta-grid { display: grid; gap: 10px; }
 * .meta-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 * .meta-card { border: 2px solid var(--line); border-radius: 16px; padding: 10px; background: #fff;
 *   min-height: 44px; display: flex; gap: 10px; align-items: center; }
 * .meta-card.tap { cursor: pointer; min-height: 52px; }
 * .meta-emoji { font-size: 28px; width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; }
 * .meta-label { font: 700 15px/1.2 system-ui, sans-serif; }
 * .meta-sub { font: 600 12px/1.3 system-ui, sans-serif; opacity: .75; }
 * .meta-chip { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px;
 *   background: #ffe9f4; font: 700 13px/1 system-ui, sans-serif; min-height: 32px; }
 * .meta-toast { position: fixed; left: 50%; bottom: calc(16px + var(--sab)); transform: translateX(-50%);
 *   z-index: 20; pointer-events: none; padding: 12px 18px; border-radius: 999px; background: #fff;
 *   border: 3px solid var(--line); box-shadow: 0 6px 0 #f3b6d4; font: 700 15px/1.2 system-ui, sans-serif;
 *   max-width: min(360px, 100% - 24px); text-align: center; animation: meta-toast-in .35s ease; }
 * @keyframes meta-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(12px); }
 *   to { opacity: 1; transform: translateX(-50%) translateY(0); } }
 * .meta-map-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
 * .meta-map-node { min-width: 52px; min-height: 52px; border-radius: 14px; border: 2px solid var(--line);
 *   display: grid; place-items: center; font-weight: 800; background: #fff; }
 * .meta-map-node.locked { opacity: .45; }
 * .meta-map-node.done { background: #e8fff4; border-color: #2fdb8e; }
 */

import { ADVENTURE_LEVELS, chapterLevelRange, type AdventureLevelDef } from '../adventure/levels'
import { CHAPTER_STAR_GATES, chapterUnlocked, starsNeededForChapter } from '../adventure/chapters'
import { PLUSH_ICONS } from './plushIcons'
import { ACHIEVEMENTS, countUnlocked } from '../meta/achievements'
import { CATALOGUE, getCatalogItem, isOwned, meetsGates, type CatalogItem } from '../meta/catalogue'
import { MISSION_POOL, ensureDailyMissions, missionDef } from '../meta/missions'
import { xpToNextLevel } from '../meta/progression'
import type { SaveV3 } from '../meta/save'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function iconBtn(label: string, iconHtml: string, action?: string): HTMLButtonElement {
  const b = el('button', 'ui pill meta-card tap')
  b.type = 'button'
  b.style.minHeight = '48px'
  if (action) b.dataset.action = action
  const ico = el('span', 'meta-ico')
  ico.innerHTML = iconHtml
  ico.setAttribute('aria-hidden', 'true')
  const wrap = el('div')
  wrap.append(el('div', 'meta-label', label))
  b.append(ico, wrap)
  return b
}

export type MapRenderOpts = {
  chapter?: 1 | 2 | 3 | 4
  onPickLevel?: (level: AdventureLevelDef) => void
}

export function renderMap(save: SaveV3, opts: MapRenderOpts = {}): HTMLElement {
  const autoChapter = Math.min(4, Math.max(1, Math.ceil(save.adventure.frontier / 15) || 1)) as 1 | 2 | 3 | 4
  const chapter = opts.chapter ?? autoChapter
  const panel = el('div', 'meta-panel')
  const head = el('div', 'meta-head')
  const title = el('h2', 'meta-title', `Adventure · Ch ${chapter}`)
  const stars = el('span', 'meta-chip', `⭐ ${save.profile.stars}`)
  head.append(title, stars)

  const chapterUnlockedOk = chapterUnlocked(save.adventure.chapterStars, chapter)
  if (!chapterUnlockedOk) {
    const need = starsNeededForChapter(save.adventure.chapterStars, chapter)
    const lock = el('p', 'meta-sub chapter-lock', `Need ${need} more ★ from Ch ${chapter - 1} (have ${CHAPTER_STAR_GATES[chapter]} total)`)
    panel.append(head, lock)
    const scrim = el('div', 'meta-scrim')
    scrim.append(panel)
    return scrim
  }

  const row = el('div', 'meta-map-row')
  for (const level of chapterLevelRange(chapter)) {
    const prog = save.adventure.levels[String(level.id)]
    const locked = level.id > save.adventure.frontier
    const node = el('button', 'meta-map-node ui' + (locked ? ' locked' : prog?.stars ? ' done' : ''))
    node.type = 'button'
    node.style.minWidth = '52px'
    node.style.minHeight = '52px'
    const label = el('span', '', locked ? '🔒' : String(level.id))
    node.append(label)
    node.title = level.title
    node.disabled = locked
    node.dataset.levelId = String(level.id)
    if (!locked && opts.onPickLevel) {
      node.addEventListener('click', () => opts.onPickLevel!(level))
    }
    if (prog?.stars) {
      const cap = el('span', 'meta-sub', '★'.repeat(prog.stars))
      cap.style.display = 'block'
      cap.style.fontSize = '10px'
      node.append(cap)
    }
    row.append(node)
  }

  const hint = el('p', 'meta-sub', 'Tap a level to play!')
  panel.append(head, row, hint)
  const scrim = el('div', 'meta-scrim')
  scrim.append(panel)
  return scrim
}

export type ShopRenderOpts = {
  onBuy?: (item: CatalogItem) => void
  onEquip?: (item: CatalogItem) => void
}

export function renderShop(save: SaveV3, opts: ShopRenderOpts = {}): HTMLElement {
  const panel = el('div', 'meta-panel')
  const head = el('div', 'meta-head')
  head.append(el('h2', 'meta-title', 'Sugar Shop'), el('span', 'meta-chip', `⭐ ${save.profile.stars}`))
  const grid = el('div', 'meta-grid cols-2')

  for (const item of CATALOGUE) {
    if (item.priceStars === 0 && isOwned(save, item.id)) continue
    const owned = isOwned(save, item.id)
    const equipped =
      (item.kind === 'skin' && save.equipped.skin === item.id) ||
      (item.kind === 'theme' && save.equipped.theme === item.id) ||
      (item.kind === 'pop' && save.equipped.pop === item.id)
    const locked = !meetsGates(save, item)
    const card = el('button', 'meta-card tap ui')
    card.type = 'button'
    card.style.width = '100%'
    card.style.minHeight = '56px'
    card.disabled = locked && !owned
    const em = el('span', 'meta-emoji', item.emoji)
    const body = el('div')
    body.append(el('div', 'meta-label', item.name))
    const price = owned
      ? equipped
        ? 'Equipped'
        : 'Owned'
      : locked
        ? 'Locked'
        : item.priceCoins != null
          ? `🪙 ${item.priceCoins}`
          : `⭐ ${item.priceStars}`
    body.append(el('div', 'meta-sub', price))
    card.append(em, body)
    card.addEventListener('click', () => {
      if (owned) opts.onEquip?.(item)
      else if (!locked) opts.onBuy?.(item)
    })
    grid.append(card)
  }

  panel.append(head, grid)
  const scrim = el('div', 'meta-scrim')
  scrim.append(panel)
  return scrim
}

export function renderAchievements(save: SaveV3): HTMLElement {
  const panel = el('div', 'meta-panel')
  const unlocked = countUnlocked(save)
  const head = el('div', 'meta-head')
  head.append(
    el('h2', 'meta-title', 'Stickers'),
    el('span', 'meta-chip', `${unlocked}/${ACHIEVEMENTS.length}`),
  )
  const grid = el('div', 'meta-grid')
  for (const a of ACHIEVEMENTS) {
    const got = save.achievements[a.id] === 1
  if (a.hidden && !got) continue
    const card = el('div', 'meta-card')
    card.style.minHeight = '52px'
    const em = el('span', 'meta-emoji', got ? a.emoji : '❔')
    const body = el('div')
    body.append(el('div', 'meta-label', got ? a.title : '???'))
    body.append(el('div', 'meta-sub', got ? a.toast : 'Keep playing!'))
    card.append(em, body)
    grid.append(card)
  }
  panel.append(head, grid)
  const scrim = el('div', 'meta-scrim')
  scrim.append(panel)
  return scrim
}

export function renderCollection(save: SaveV3): HTMLElement {
  const panel = el('div', 'meta-panel')
  const head = el('div', 'meta-head')
  const lvl = save.profile.level
  const xpNeed = xpToNextLevel(save)
  head.append(
    el('h2', 'meta-title', 'My Bonbons'),
    el('span', 'meta-chip', `Lv ${lvl}`),
    el('span', 'meta-chip', `🪙 ${save.profile.coins}`),
  )
  const bar = el('p', 'meta-sub', `XP ${save.profile.xp} / ${xpNeed}`)
  const sections = el('div', 'meta-grid')

  const addSection = (title: string, ids: string[], kind: 'skin' | 'theme' | 'pop') => {
    const sec = el('div')
    sec.append(el('div', 'meta-label', title))
    const row = el('div', 'meta-grid cols-2')
    for (const id of ids) {
      const item = getCatalogItem(id)
      if (!item || item.kind !== kind) continue
      const equipped =
        (kind === 'skin' && save.equipped.skin === id) ||
        (kind === 'theme' && save.equipped.theme === id) ||
        (kind === 'pop' && save.equipped.pop === id)
      const card = el('div', 'meta-card')
      card.style.minHeight = '48px'
      const em = el('span', 'meta-emoji', item.emoji)
      const body = el('div')
      body.append(el('div', 'meta-label', item.name))
      body.append(el('div', 'meta-sub', equipped ? 'On' : 'Ready'))
      card.append(em, body)
      row.append(card)
    }
    sec.append(row)
    sections.append(sec)
  }

  addSection('Skins', save.owned.skins, 'skin')
  addSection('Skies', save.owned.themes, 'theme')
  addSection('Pop trails', save.owned.pops, 'pop')

  ensureDailyMissions(save)
  const missionWrap = el('div')
  missionWrap.append(el('div', 'meta-label', 'Today’s missions'))
  for (const slot of save.missions.slots) {
    const def = missionDef(slot.id) ?? MISSION_POOL[0]!
    const card = el('div', 'meta-card')
    card.style.minHeight = '48px'
    const em = el('span', 'meta-emoji', def.emoji)
    const body = el('div')
    body.append(el('div', 'meta-label', def.label))
    body.append(el('div', 'meta-sub', `${Math.min(slot.progress, def.target)}/${def.target}`))
    card.append(em, body)
    missionWrap.append(card)
  }

  panel.append(head, bar, sections, missionWrap)
  const scrim = el('div', 'meta-scrim')
  scrim.append(panel)
  return scrim
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, emoji = '✨'): HTMLElement {
  if (toastTimer) clearTimeout(toastTimer)
  document.querySelectorAll('.meta-toast').forEach((n) => n.remove())
  const toast = el('div', 'meta-toast ui')
  toast.setAttribute('role', 'status')
  toast.textContent = `${emoji} ${message}`
  document.body.append(toast)
  toastTimer = setTimeout(() => {
    toast.remove()
    toastTimer = null
  }, 2800)
  return toast
}

export function renderMetaDock(save: SaveV3): HTMLElement {
  const dock = el('div', 'meta-grid cols-2')
  dock.style.gap = '8px'
  dock.append(
    iconBtn('Adventure', PLUSH_ICONS.map, 'map'),
    iconBtn('Shop', PLUSH_ICONS.shop, 'shop'),
    iconBtn('Stickers', PLUSH_ICONS.stickers, 'achievements'),
    iconBtn('Collection', PLUSH_ICONS.bag, 'collection'),
  )
  dock.dataset.stars = String(save.profile.stars)
  dock.dataset.level = String(save.profile.level)
  return dock
}

export const ADVENTURE_LEVEL_COUNT = ADVENTURE_LEVELS.length
