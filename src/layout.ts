/** One board size. Every bonbon uses this D; cells are D by D. */
export type Layout = {
  cols: number
  rows: number
  D: number
  padTop: number
  ox: number
  oy: number
  hud: number
}

export function boardLayout(w: number, h: number, insetTop = 0): Layout {
  const landscape = w > h
  const hud = Math.round(Math.min(landscape ? 72 : 84, Math.max(64, h * (landscape ? 0.07 : 0.09)))) + insetTop
  const pad = landscape ? 10 : 12
  const availW = Math.max(120, w - pad * 2)
  const availH = Math.max(120, h - hud - pad * 2)

  let cols: number
  let rows: number
  let D: number

  if (landscape) {
    const tall = h >= 700
    cols = Math.min(tall ? 11 : 10, Math.max(7, Math.round(availW / 72)))
    rows = Math.min(9, Math.max(5, Math.round(availH / 72)))
    D = Math.floor(Math.min(availW / cols, availH / rows))
    D = Math.min(96, Math.max(52, D))
    while (cols * D > availW + 2 && cols > 6) cols -= 1
    while (rows * D > availH + 2 && rows > 5) rows -= 1
    D = Math.floor(Math.min(availW / cols, availH / rows))
    D = Math.min(96, Math.max(52, D))
  } else {
    cols = Math.min(7, Math.max(5, Math.round(availW / 54)))
    const tallPhone = h >= 900
    rows = tallPhone ? Math.min(9, Math.max(7, Math.round(availH / 54))) : Math.min(10, Math.max(7, Math.round(availH / 54)))
    D = Math.floor(Math.min(availW / cols, availH / rows))
    while (D < 50 && rows > 6) {
      rows -= 1
      D = Math.floor(Math.min(availW / cols, availH / rows))
    }
    D = Math.min(88, Math.max(50, D))
    if (cols * D > availW) cols = Math.max(5, cols - 1)
    rows = Math.min(10, rows)
    cols = Math.min(7, cols)
    D = Math.floor(Math.min(availW / cols, availH / (rows + 0.18)))
    D = Math.min(88, Math.max(50, D))
  }

  const padTop = Math.round(D * 0.18)
  const gridW = cols * D
  const gridH = rows * D + padTop
  const ox = Math.round((w - gridW) / 2)
  const oy = Math.round(hud + Math.max(0, (h - hud - gridH - pad) / 2))
  return { cols, rows, D, padTop, ox, oy, hud }
}

/** Scale factor for title-screen hero pile (larger on desktop). */
export function titleHeroScale(w: number, h: number, D: number): number {
  const landscape = w > h
  if (landscape && w >= 1100) return Math.min(1.45, 0.95 + D / 90)
  if (!landscape && h >= 900) return Math.min(1.12, 0.92 + D / 120)
  return 1
}
