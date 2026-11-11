import type { AdventureLevelDef } from './adventure/levels'
import { evaluateStars, type AdventureGoalState } from './adventure/goals'
import { equip, getCatalogItem, purchase } from './meta/catalogue'
import { grantAchievements, type AchievementFacts } from './meta/achievements'
import { applyMissionProgress, claimMission, ensureDailyMissions, missionDef } from './meta/missions'
import { addXp, type RunSummary } from './meta/progression'
import { loadSave, storeSave, type SaveV3 } from './meta/save'
import {
  renderAchievements,
  renderCollection,
  renderMap,
  renderShop,
  showToast,
} from './ui/metaDom'
import { setCosmetics } from './draw'
import { playUnlock } from './audio'

export type MetaLayer = {
  save: SaveV3
  persist: () => void
  open: (which: 'map' | 'shop' | 'achievements' | 'collection', opts?: { mapChapter?: 1 | 2 | 3 | 4 }) => void
  close: () => void
  onRunEnd: (summary: RunSummary, extra?: AchievementFacts) => void
  onAdventureEnd: (level: AdventureLevelDef, goal: AdventureGoalState) => void
  applyCosmetics: () => void
  touchStreak: () => void
}

function yesterday(d = new Date()): string {
  const x = new Date(d)
  x.setDate(x.getDate() - 1)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `bonbon-${y}-${m}-${day}`
}

export function createMetaLayer(
  host: HTMLElement,
  onAdventureStart: (level: AdventureLevelDef) => void,
): MetaLayer {
  const save = loadSave()
  ensureDailyMissions(save)
  const slot = document.createElement('div')
  slot.id = 'meta'
  slot.style.pointerEvents = 'none'
  host.append(slot)

  const persist = () => storeSave(save)

  const applyCosmetics = () => {
    setCosmetics(save.equipped.theme, save.equipped.skin, save.equipped.pop)
  }
  applyCosmetics()

  let openEl: HTMLElement | null = null

  const close = () => {
    if (openEl) {
      openEl.remove()
      openEl = null
    }
    slot.innerHTML = ''
    slot.style.pointerEvents = 'none'
  }

  const open = (which: 'map' | 'shop' | 'achievements' | 'collection', opts?: { mapChapter?: 1 | 2 | 3 | 4 }) => {
    close()
    let panel: HTMLElement
    if (which === 'map') {
      panel = renderMap(save, {
        chapter: opts?.mapChapter,
        onPickLevel: (level) => {
          close()
          onAdventureStart(level)
        },
      })
    } else if (which === 'shop') {
      panel = renderShop(save, {
        onBuy: (item) => {
          if (purchase(save, item.id)) {
            showToast(`Got ${item.name}!`, item.emoji)
            persist()
            open('shop')
          } else {
            const cat = getCatalogItem(item.id)
            showToast(cat?.priceCoins != null ? 'Need more coins!' : 'Need more Sugar Stars!', cat?.priceCoins != null ? '🪙' : '⭐')
          }
        },
        onEquip: (item) => {
          equip(save, item.id)
          applyCosmetics()
          showToast(`${item.name} on!`, item.emoji)
          persist()
          open('shop')
        },
      })
    } else if (which === 'achievements') {
      panel = renderAchievements(save)
    } else {
      panel = renderCollection(save)
    }
    panel.style.pointerEvents = 'auto'
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'ui pill meta-card tap'
    back.style.position = 'absolute'
    back.style.top = 'calc(12px + var(--sat))'
    back.style.right = '12px'
    back.style.minHeight = '48px'
    back.style.pointerEvents = 'auto'
    back.textContent = 'Back'
    back.addEventListener('click', () => close())
    panel.append(back)
    openEl = panel
    slot.append(panel)
    slot.style.pointerEvents = 'auto'
  }

  const onRunEnd = (summary: RunSummary, extra: AchievementFacts = {}) => {
    save.stats.runs += 1
    if (summary.mode === 'timed') save.stats.timedRuns += 1
    if (summary.mode === 'cuddle') save.stats.cuddleRuns += 1
    if (summary.mode === 'daily') save.stats.dailyRuns += 1
    save.stats.maxChain = Math.max(save.stats.maxChain, summary.chainLen)
    save.stats.maxCombo = Math.max(save.stats.maxCombo, summary.combo)
    save.stats.bombs += summary.bombs
    save.stats.rainbows += summary.rainbows
    save.stats.pops += summary.pops
    const lvl = addXp(save, summary)
    applyMissionProgress(save, {
      score: summary.score,
      chainLen: summary.chainLen,
      bombs: summary.bombs,
      rainbows: summary.rainbows,
      combo: summary.combo,
      pops: summary.pops,
      adventureWin: summary.won && summary.mode === 'adventure',
    })
    for (const slot of save.missions.slots) {
      const def = missionDef(slot.id)
      if (!def || slot.claimed) continue
      if (slot.progress >= def.target) {
        const res = claimMission(save, slot.id)
        if (res.ok) showToast('Mission done!', def.emoji)
      }
    }
    const facts: AchievementFacts = {
      ...extra,
      score: summary.score,
      chainLen: summary.chainLen,
      combo: summary.combo,
      bombs: summary.bombs,
      rainbows: summary.rainbows,
      mode: summary.mode === 'adventure' ? 'adventure' : summary.mode,
      runs: save.stats.runs,
    }
    const unlocked = grantAchievements(save, facts)
    for (const a of unlocked) {
      playUnlock()
      showToast(a.toast, a.emoji)
    }
    if (lvl.leveled) showToast(`Level ${lvl.to}!`, '🎂')
    persist()
  }

  const onAdventureEnd = (level: AdventureLevelDef, goal: AdventureGoalState) => {
    const ev = evaluateStars(goal, level)
    const key = String(level.id)
    const prior = save.adventure.levels[key]
    const best = Math.max(prior?.bestScore ?? 0, goal.score)
    const stars = Math.max(prior?.stars ?? 0, ev.stars) as 0 | 1 | 2 | 3
    save.adventure.levels[key] = { stars, bestScore: best }
    if (ev.goalMet) {
      save.stats.adventureWins += 1
      if (level.id >= save.adventure.frontier) save.adventure.frontier = level.id + 1
      save.profile.stars += stars
    }
    save.adventure.chapterStars[String(level.chapter)] =
      (save.adventure.chapterStars[String(level.chapter)] ?? 0) + stars
    onRunEnd(
      {
        mode: 'adventure',
        score: goal.score,
        chainLen: save.stats.maxChain,
        combo: 1,
        bombs: goal.bombsPopped,
        rainbows: 0,
        pops: Object.values(goal.clearedByColor).reduce((a, b) => a + b, 0),
        won: ev.goalMet,
        starsEarned: stars,
      },
      { adventureLevel: level.id, stars, won: ev.goalMet },
    )
  }

  const touchStreak = () => {
    const day = new Date()
    const key = `bonbon-${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    if (save.streak.lastDay === key) return
    if (save.streak.lastDay === yesterday(day)) save.streak.current += 1
    else save.streak.current = 1
    save.streak.best = Math.max(save.streak.best, save.streak.current)
    save.streak.lastDay = key
    if (save.streak.current === 7) showToast('7-day streak!', '🔥')
    persist()
  }

  return { save, persist, open, close, onRunEnd, onAdventureEnd, applyCosmetics, touchStreak }
}
