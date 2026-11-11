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
  const hud = Math.round(Math.min(84, Math.max(64, h * 0.08))) + insetTop
  const pad = 12
  const availW = Math.max(120, w - pad * 2)
  const availH = Math.max(120, h - hud - pad * 2)
  const target = w > h ? 66 : 62
  let cols = Math.max(5, Math.min(14, Math.round(availW / target)))
  let rows = Math.max(4, Math.min(16, Math.round(availH / target)))
  const fit = () => Math.floor(Math.min(availW / cols, availH / rows))
  let D = fit()
  while (D > 78 && (cols < 14 || rows < 16)) {
    if (cols < 14 && availW / (cols + 1) >= availH / (rows + 1)) cols += 1
    else if (rows < 16) rows += 1
    else break
    const next = fit()
    if (next === D) break
    D = next
  }
  while (D < 46 && (cols > 5 || rows > 4)) {
    if (cols >= rows && cols > 5) cols -= 1
    else if (rows > 4) rows -= 1
    else break
    D = fit()
  }
  const padTop = Math.round(D * 0.18)
  const gridW = cols * D
  const gridH = rows * D + padTop
  const ox = Math.round((w - gridW) / 2)
  const oy = Math.round(hud + Math.max(0, (h - hud - gridH - pad) / 2))
  return { cols, rows, D, padTop, ox, oy, hud }
}
