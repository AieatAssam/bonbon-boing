/** Inline SVG icons in the game's plush rounded style (no OS emoji). */
const stroke = '#3A1530'

export const PLUSH_ICONS = {
  map: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="#FFE9F4" stroke="${stroke}" stroke-width="2" d="M6 22c4-8 8-12 10-12s6 4 10 12"/><path fill="#FF8CB8" stroke="${stroke}" stroke-width="1.5" d="M10 10h12v14H10z"/><circle fill="#fff" stroke="${stroke}" stroke-width="1.2" cx="16" cy="15" r="3"/></svg>`,
  rush: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle fill="#FF8CB8" stroke="${stroke}" stroke-width="2" cx="16" cy="17" r="11"/><path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M16 10v7l5 3"/></svg>`,
  daily: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle fill="#FFD02A" stroke="${stroke}" stroke-width="2" cx="16" cy="16" r="9"/><g stroke="#FF8C28" stroke-width="2" stroke-linecap="round"><path d="M16 4v4M16 24v4M4 16h4M24 16h4"/></g></svg>`,
  cuddle: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="#FF4F93" stroke="${stroke}" stroke-width="2" d="M16 26 C8 20 8 12 12 9 c2-1 4 1 4 2 0 0 2-2 4-2 4 0 8 8 0 17z"/></svg>`,
  shop: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="#fff" stroke="${stroke}" stroke-width="2" d="M6 12h20l-2 14H8L6 12z"/><path fill="#FFE9F4" stroke="${stroke}" stroke-width="1.5" d="M10 12V8c0-2 2-4 6-4s6 2 6 4v4"/></svg>`,
  stickers: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="#FFD02A" stroke="${stroke}" stroke-width="2" d="M16 4l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`,
  bag: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect fill="#E8FFF4" stroke="${stroke}" stroke-width="2" x="7" y="11" width="18" height="16" rx="4"/><path fill="none" stroke="${stroke}" stroke-width="2" d="M11 11V9a5 5 0 0 1 10 0v2"/></svg>`,
  collection: `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect fill="#FFF6FB" stroke="${stroke}" stroke-width="2" x="5" y="12" width="22" height="16" rx="4"/><path fill="#FF8CB8" stroke="${stroke}" stroke-width="1.5" d="M5 18h22"/><path fill="none" stroke="${stroke}" stroke-width="2" d="M16 12V8"/><path fill="#FFD02A" stroke="${stroke}" stroke-width="1.2" d="M16 5l2 3h-4z"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle fill="#FFD02A" stroke="${stroke}" stroke-width="1.5" cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="${stroke}">¢</text></svg>`,
  ice: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#C8F4FF" stroke="#5088FF" stroke-width="1.5" d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>`,
  choco: `<svg viewBox="0 0 24 24" width="22" height="22"><rect fill="#5B371E" stroke="#3E2412" stroke-width="1.5" x="4" y="6" width="16" height="12" rx="3"/></svg>`,
  jelly: `<svg viewBox="0 0 24 24" width="22" height="22"><circle fill="#FF8CB8" stroke="#3A1530" stroke-width="1.5" cx="12" cy="12" r="8" stroke-dasharray="3 2"/></svg>`,
  sleepy: `<svg viewBox="0 0 24 24" width="22" height="22"><circle fill="#C070FF" stroke="#3A1530" stroke-width="1.5" cx="12" cy="11" r="7"/><text x="12" y="20" text-anchor="middle" font-size="8" font-weight="700">Zz</text></svg>`,
  starburst: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#FFD02A" stroke="#3A1530" stroke-width="1" d="M12 2l2 5 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z"/></svg>`,
} as const

export const COLOR_NAMES = ['Pink', 'Mint', 'Lemon', 'Sky', 'Peach', 'Grape']
