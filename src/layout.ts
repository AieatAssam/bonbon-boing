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

/** Minimum top padding so row-0 ears/squash stay inside the mat (>= 0.25D ear rise + margin). */
export function boardPadTop(D: number): number {
  return Math.max(Math.round(D * 0.34), Math.ceil(D * 0.25) + Math.round(D * 0.1))
}

/** Ear tip offset above piece center in layout units (matches Canvas sprites). */
export function earRiseAboveCenter(D: number, squashSy = 1): number {
  const pieceD = D * 0.88
  const r = pieceD * 0.5
  const rise = r * 1.28 * squashSy
  return rise + D * 0.02
}

export type EarBounds = {
  gridTopY: number
  spawnLineY: number
  matTopY: number
  matBottomY: number
  row0CenterY: number
  earTipY: number
}

export function earBoundsAtRest(L: Layout, piece: { r: number; c: number }, squashSy = 1): EarBounds {
  const gridTopY = L.oy
  const spawnLineY = L.oy + L.padTop
  const matTopY = L.oy - L.D * 0.06
  const matBottomY = L.oy + L.padTop + L.rows * L.D + L.D * 0.14
  const row0CenterY = L.oy + L.padTop + (piece.r + 0.5) * L.D
  const earTipY = row0CenterY - earRiseAboveCenter(L.D, squashSy)
  return { gridTopY, spawnLineY, matTopY, matBottomY, row0CenterY, earTipY }
}

export function earsInsideMatAtRest(L: Layout, squashSy = 1): boolean {
  const b = earBoundsAtRest(L, { r: 0, c: 0 }, squashSy)
  return b.earTipY >= b.matTopY + 1 && b.row0CenterY <= b.matBottomY
}

function baseHudPx(h: number, landscape: boolean): number {
  return Math.round(Math.min(landscape ? 72 : 84, Math.max(64, h * (landscape ? 0.07 : 0.09))))
}

/** Left dock width reserved in landscape adventure (must match CSS). */
export const ADVENTURE_LANDSCAPE_DOCK_W = 140

/** Vertical margin above/below board in landscape adventure. */
export const ADVENTURE_LANDSCAPE_VPAD = 8

/** Fit a fixed cols×rows adventure grid; only D and position change with viewport. */
export function boardLayoutFixedGrid(
  w: number,
  h: number,
  cols: number,
  rows: number,
  insetTop = 0,
  insetSide = 0,
): Layout {
  const landscape = w > h
  const pad = landscape ? 10 : 8
  const side = Math.max(0, insetSide)
  const gridH = (d: number) => rows * d + boardPadTop(d)
  const gridW = (d: number) => cols * d

  /** Landscape adventure: board uses full viewport height; HUD is only horizontal inset. */
  if (landscape && side > 0) {
    const top = Math.max(insetTop, ADVENTURE_LANDSCAPE_VPAD)
    const bottom = ADVENTURE_LANDSCAPE_VPAD
    const availH = Math.max(80, h - top - bottom)
    const availW = Math.max(80, w - side - pad * 2)
    const minD = w < 960 ? 34 : 40
    const maxD = 96
    let D = Math.floor(Math.min(availW / cols, (availH - boardPadTop(40)) / rows))
    D = Math.min(maxD, Math.max(minD, D))
    let padTop = boardPadTop(D)
    while (gridH(D) > availH + 1 && D > minD) {
      D -= 1
      padTop = boardPadTop(D)
    }
    while (gridW(D) > availW + 1 && D > minD) D -= 1
    padTop = boardPadTop(D)
    const gW = gridW(D)
    const gH = gridH(D)
    const ox = Math.round(side + pad + Math.max(0, (w - side - pad * 2 - gW) / 2))
    const oy = Math.round(top + Math.max(0, (availH - gH) / 2))
    return { cols, rows, D, padTop, ox, oy, hud: top }
  }

  const hud = baseHudPx(h, landscape) + insetTop
  const availW = Math.max(80, w - pad * 2 - side)
  const availH = Math.max(80, h - hud - pad * 2)

  const minD = landscape ? 28 : 44
  const maxD = landscape ? 96 : 60
  let padTop = boardPadTop(52)
  let D = Math.floor(Math.min(availW / cols, (availH - padTop) / rows))
  D = Math.min(maxD, Math.max(minD, D))
  padTop = boardPadTop(D)

  while (gridH(D) > availH + 1 && D > minD) {
    D -= 1
    padTop = boardPadTop(D)
  }
  while (gridW(D) > availW + 1 && D > minD) D -= 1
  padTop = boardPadTop(D)
  while (gridH(D) > availH + 1 && D > minD) {
    D -= 1
    padTop = boardPadTop(D)
  }
  if (gridH(D) > availH + 1 || gridW(D) > availW + 1) {
    D = Math.max(
      minD,
      Math.floor(Math.min(availW / cols, (availH - boardPadTop(minD)) / rows)),
    )
    padTop = boardPadTop(D)
    while (gridH(D) > availH + 1 && D > 24) {
      D -= 1
      padTop = boardPadTop(D)
    }
  }

  const bottomMargin = landscape ? 8 : 4
  let gW = gridW(D)
  let gH = gridH(D)
  while (gH > h - hud - pad * 2 + 1 && D > 23) {
    D -= 1
    padTop = boardPadTop(D)
    gW = gridW(D)
    gH = gridH(D)
  }
  while ((gH > h - pad - bottomMargin || hud + pad + gH > h - pad - bottomMargin) && D > 23) {
    D -= 1
    padTop = boardPadTop(D)
    gW = gridW(D)
    gH = gridH(D)
  }
  let ox = Math.round(pad + side + Math.max(0, (w - pad * 2 - side - gW) / 2))
  let oy = landscape
    ? Math.round(hud + pad + Math.max(0, (h - hud - gH - pad * 2) / 2))
    : Math.round(hud + pad)
  const bottomLimit = h - pad - bottomMargin
  if (oy + gH > bottomLimit) oy = Math.round(bottomLimit - gH)
  if (oy + gH > bottomLimit && D > 23) {
    D -= 1
    padTop = boardPadTop(D)
    gW = gridW(D)
    gH = gridH(D)
    ox = Math.round(pad + side + Math.max(0, (w - pad * 2 - side - gW) / 2))
    oy = Math.round(hud + pad + Math.max(0, (h - hud - gH - pad * 2) / 2))
    if (oy + gH > bottomLimit) oy = Math.round(bottomLimit - gH)
  }

  return { cols, rows, D, padTop, ox, oy, hud }
}

export function boardLayout(w: number, h: number, insetTop = 0, insetSide = 0): Layout {
  const landscape = w > h
  const hud = baseHudPx(h, landscape) + insetTop
  const pad = landscape ? 10 : 8
  const side = Math.max(0, insetSide)
  const availW = Math.max(120, w - pad * 2 - side)
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
    padTop = boardPadTop(D)
    while (rows * D + padTop > availH + 1 && rows > 5) rows -= 1
    D = Math.floor(Math.min(availW / cols, (availH - padTop) / Math.max(1, rows)))
    D = Math.min(96, Math.max(52, D))
    padTop = boardPadTop(D)
    while (rows * D + padTop > availH + 1 && rows > 5) rows -= 1
    const gridW = cols * D
    const gridH = rows * D + padTop
    ox = Math.round(pad + side + Math.max(0, (w - pad * 2 - side - gridW) / 2))
    oy = Math.round(hud + Math.max(0, (h - hud - gridH - pad) / 2))
  } else {
    D = Math.min(60, Math.max(52, Math.floor(availW / 7)))
    cols = Math.min(7, Math.max(5, Math.floor(availW / D)))
    while (cols * D > availW && cols > 5) {
      cols -= 1
      D = Math.min(60, Math.max(52, Math.floor(availW / cols)))
    }
    const maxRows = h >= 900 ? 13 : 12
    padTop = boardPadTop(D)
    rows = Math.min(maxRows, Math.max(7, Math.floor((availH - padTop) / D)))
    for (let grow = 0; grow < 8; grow++) {
      padTop = boardPadTop(D)
      rows = Math.min(maxRows, Math.max(7, Math.floor((availH - padTop) / D)))
      const fill = (rows * D + padTop) / availH
      if ((fill >= 0.895 || D >= 59) && cols * D <= availW) break
      D += 1
      if (cols * D > availW && cols > 5) cols -= 1
    }
    while (rows * D + padTop > availH && rows > 7) rows -= 1
    padTop = boardPadTop(D)
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

/** Title-screen hero pile center — kept above the dock. */
export function titleHeapCenter(w: number, h: number): { x: number; y: number } {
  const landscape = w > h
  return {
    x: landscape ? w * 0.38 : w * 0.5,
    y: landscape ? h * 0.52 : h * 0.33,
  }
}

/** Reserved vertical chrome for adventure HUD (portrait: 8px top + 112px two-row stack + ear clearance). */
/** Top row + star + 2×2 goal chips (4 goals), fixed for the whole level. */
export const ADVENTURE_PORTRAIT_HUD_RESERVE = 158

/** Top bar height when adventure uses landscape left dock. */
export const ADVENTURE_LANDSCAPE_TOP_RESERVE = 64
