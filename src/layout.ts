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
  const pad = landscape ? 10 : 8
  const availW = Math.max(120, w - pad * 2)
  const availH = Math.max(120, h - hud - pad * 2)

  let cols: number
  let rows: number
  let D: number
  let padTop: number
  let ox: number
  let oy: number

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
    padTop = Math.round(D * 0.18)
    const gridW = cols * D
    const gridH = rows * D + padTop
    ox = Math.round((w - gridW) / 2)
    oy = Math.round(hud + Math.max(0, (h - hud - gridH - pad) / 2))
  } else {
    D = Math.min(60, Math.max(52, Math.floor(availW / 7)))
    cols = Math.min(7, Math.max(5, Math.floor(availW / D)))
    while (cols * D > availW && cols > 5) {
      cols -= 1
      D = Math.min(60, Math.max(52, Math.floor(availW / cols)))
    }
    const maxRows = h >= 900 ? 13 : 12
    padTop = Math.round(D * 0.12)
    rows = Math.min(maxRows, Math.max(7, Math.floor((availH - padTop) / D)))
    for (let grow = 0; grow < 8; grow++) {
      padTop = Math.round(D * 0.14)
      rows = Math.min(maxRows, Math.max(7, Math.floor((availH - padTop) / D)))
      const fill = (rows * D + padTop) / availH
      if ((fill >= 0.895 || D >= 59) && cols * D <= availW) break
      D += 1
      if (cols * D > availW && cols > 5) cols -= 1
    }
    while (rows * D + padTop > availH && rows > 7) rows -= 1
    padTop = Math.round(D * 0.14)
    const gridW = cols * D
    ox = Math.round((w - gridW) / 2)
    oy = Math.round(hud + pad)
  }

  return { cols, rows, D, padTop, ox, oy, hud }
}

/** Board area as fraction of space below HUD (for QA layout checks). */
export function boardFillMetrics(w: number, h: number, insetTop = 0): { fillHeight: number; fillWidth: number; D: number; cols: number; rows: number } {
  const L = boardLayout(w, h, insetTop)
  const pad = w > h ? 10 : 12
  const availW = w - pad * 2
  const availH = h - L.hud - pad * 2
  const gridW = L.cols * L.D
  const gridH = L.padTop + L.rows * L.D
  return {
    fillHeight: gridH / Math.max(1, availH),
    fillWidth: gridW / Math.max(1, availW),
    D: L.D,
    cols: L.cols,
    rows: L.rows,
  }
}

/** Scale factor for title-screen hero pile (larger on desktop). */
export function titleHeroScale(w: number, h: number, D: number): number {
  const landscape = w > h
  if (landscape && w >= 1100) return Math.min(1.45, 0.95 + D / 90)
  if (!landscape && h >= 900) return Math.min(1.12, 0.92 + D / 120)
  return 1
}
