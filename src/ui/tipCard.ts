import type { Kind } from '../sim'
import { PLUSH_ICONS } from './plushIcons'

const TIPS: Record<string, { title: string; body: string; icon: string }> = {
  ice: {
    title: 'Ice Bonbon',
    body: 'Pop twice! First squish cracks the ice.',
    icon: PLUSH_ICONS.ice,
  },
  choco: {
    title: 'Choco Block',
    body: 'Pop bonbons next to it to crumble chocolate.',
    icon: PLUSH_ICONS.choco,
  },
  jelly: {
    title: 'Jelly Lock',
    body: 'Pop a neighbour to unlock, then chain.',
    icon: PLUSH_ICONS.jelly,
  },
  sleepy: {
    title: 'Sleepy Giant',
    body: 'Wake it with pops nearby — needs 3 nudges.',
    icon: PLUSH_ICONS.sleepy,
  },
  starburst: {
    title: 'Starburst',
    body: 'Chain through it for a sparkly 3×3 blast!',
    icon: PLUSH_ICONS.starburst,
  },
}

export function tipIdForKind(kind: Kind): string | null {
  if (kind === 'ice' || kind === 'choco' || kind === 'jelly' || kind === 'sleepy' || kind === 'starburst') return kind
  return null
}

export function showTipCard(tipId: string, onDone: () => void): HTMLElement {
  const tip = TIPS[tipId]
  if (!tip) {
    onDone()
    return document.createElement('div')
  }
  const scrim = document.createElement('div')
  scrim.className = 'tip-scrim'
  scrim.style.pointerEvents = 'auto'
  const card = document.createElement('div')
  card.className = 'tip-card ui'
  card.innerHTML = `
    <div class="tip-illo">${tip.icon}</div>
    <h3 class="tip-title">${tip.title}</h3>
    <p class="tip-body">${tip.body}</p>
    <button type="button" class="ui pill primary tip-ok">Got it!</button>
  `
  const btn = card.querySelector('.tip-ok') as HTMLButtonElement
  btn.addEventListener('click', () => {
    scrim.remove()
    onDone()
  })
  scrim.append(card)
  document.getElementById('app')?.append(scrim)
  return scrim
}
