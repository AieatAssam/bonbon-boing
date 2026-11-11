import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

type Qa = {
  D: number
  chain: number[]
  findChain: (min: number) => { id: number; x: number; y: number; c: number; r: number }[] | null
  center: (id: number) => { x: number; y: number } | null
  pump: (ms: number) => void
  draw: () => void
  cols: number
  rows: number
}

async function dragPath(page: import('@playwright/test').Page, path: { x: number; y: number }[]) {
  await page.mouse.move(path[0]!.x, path[0]!.y)
  await page.mouse.down()
  for (const pt of path) {
    await page.mouse.move(pt.x, pt.y, { steps: 4 })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  }
  const tip = path[path.length - 1]!
  await page.mouse.move(tip.x + 8, tip.y + 8, { steps: 2 })
}

async function releasePath(page: import('@playwright/test').Page, path: { x: number; y: number }[]) {
  const tip = path[path.length - 1]!
  await page.mouse.up()
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  await page.mouse.move(tip.x + 8, tip.y + 8)
}

async function chainBounds(page: import('@playwright/test').Page, ids: number[]) {
  return page.evaluate((chainIds) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    const pts = chainIds.map((id) => q.center(id)).filter(Boolean) as { x: number; y: number }[]
    const D = q.D
    const pad = D * 0.9
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return {
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      width: Math.min(innerWidth, maxX - minX + pad * 2),
      height: Math.min(innerHeight, maxY - minY + pad * 2),
    }
  }, ids)
}

async function stitchStrip(page: import('@playwright/test').Page, frames: string[], out: string, clipW: number, clipH: number) {
  const dataUrl = await page.evaluate(
    async ({ shots, w, h }) => {
      const canvas = document.createElement('canvas')
      canvas.width = w * 4
      canvas.height = h * 2
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#E8F4FF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < shots.length; i++) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const col = i % 4
            const row = Math.floor(i / 4)
            ctx.drawImage(img, col * w, row * h, w, h)
            resolve()
          }
          img.src = `data:image/png;base64,${shots[i]}`
        })
      }
      return canvas.toDataURL('image/png')
    },
    { shots: frames, w: Math.round(clipW), h: Math.round(clipH) },
  )
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  writeFileSync(`/opt/cursor/artifacts/${out}`, Buffer.from(b64, 'base64'))
  writeFileSync(`qa/shots/${out}`, Buffer.from(b64, 'base64'))
}

async function grabFrames(
  page: import('@playwright/test').Page,
  times: number[],
  clip: { x: number; y: number; width: number; height: number },
) {
  const frames: string[] = []
  let at = 0
  for (const t of times) {
    const d = t - at
    if (d > 0) {
      await page.evaluate((ms) => (window as unknown as { __qa: Qa }).__qa.pump(ms), d)
      await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    }
    at = t
    const buf = await page.screenshot({ clip, type: 'png' })
    frames.push(buf.toString('base64'))
  }
  return frames
}

test.describe('pop juice', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

  test('150ms after 6-chain pop cells are empty and particles travel', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    const meta = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      const path = q.findChain(6)
      if (!path) return null
      return { path, chainColor: path[0]!.id, ids: path.map((p) => p.id), cells: path.map((p) => ({ x: p.x, y: p.y, c: p.c, r: p.r })) }
    })
    expect(meta).toBeTruthy()
    await dragPath(page, meta!.path)
    const chainBefore = meta!.ids
    await releasePath(page, meta!.path)
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.pump(150))
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    const check = await page.evaluate(
      async ({ cells, chainIds }) => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const c = document.getElementById('field') as HTMLCanvasElement
        const ctx = c.getContext('2d')
        if (!ctx) return { okBody: false, okPart: false }
        const sx = c.width / innerWidth
        const sy = c.height / innerHeight
        const pal = ['#FF3D8E', '#2FDB8E', '#FFD02A', '#5088FF', '#FF7A28', '#C070FF']
        const match = (r: number, g: number, b: number, hex: string) => {
          const R = parseInt(hex.slice(1, 3), 16)
          const G = parseInt(hex.slice(3, 5), 16)
          const B = parseInt(hex.slice(5, 7), 16)
          return Math.abs(r - R) + Math.abs(g - G) + Math.abs(b - B) < 90
        }
        let cleared = 0
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i]!
          const d = ctx.getImageData(Math.floor(cell.x * sx), Math.floor(cell.y * sy), 1, 1).data
          const body = pal.some((h) => match(d[0]!, d[1]!, d[2]!, h))
          if (!body || d[3]! < 180) cleared += 1
        }
        let leadClear = false
        for (const cell of cells) {
          const px = ctx.getImageData(Math.floor(cell.x * sx), Math.floor(cell.y * sy), 1, 1).data
          const solidBody = px[3]! > 210 && pal.some((h) => match(px[0]!, px[1]!, px[2]!, h))
          if (!solidBody) leadClear = true
        }
        let far = 0
        const D = q.D
        const ref = cells[Math.floor(cells.length / 2)]!
        const dirs = [
          [D * 1.4, 0],
          [-D * 1.4, 0],
          [0, -D * 1.2],
          [D, D],
        ]
        for (const [dx, dy] of dirs) {
          const px = Math.floor((ref.x + dx) * sx)
          const py = Math.floor((ref.y + dy) * sy)
          const d = ctx.getImageData(px, py, 1, 1).data
          const bright = d[0]! + d[1]! + d[2]!
          if (d[3]! > 120 && (bright > 450 || d[0]! > 200)) far += 1
        }
        return { okBody: leadClear, okPart: far >= 2, cleared, far, leadClear }
      },
      { cells: meta!.path, chainIds: chainBefore },
    )
    expect(check.okBody, `lead cell clear at 150ms (${check.cleared}/${chainBefore.length} faded)`).toBe(true)
    expect(check.okPart, `far particles ${check.far}`).toBe(true)
  })

  test('pop-strip contact sheet', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    const path = await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      return q.findChain(6)
    })
    expect(path?.length ?? 0).toBeGreaterThanOrEqual(6)
    const ids = path!.map((p) => p.id)
    await dragPath(page, path!)
    const clip = await chainBounds(page, ids)
    await releasePath(page, path!)
    const times = [0, 30, 60, 90, 130, 200, 300, 450]
    const frames = await grabFrames(page, times, clip)
    await stitchStrip(page, frames, 'pop-strip-390x844.png', clip.width, clip.height)
  })

  test('bomb-strip contact sheet', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    const five = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.findChain(5))
    expect(five?.length ?? 0).toBeGreaterThanOrEqual(5)
    await dragPath(page, five!)
    await releasePath(page, five!)
    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      for (let t = 0; t < 1400; t += 40) q.pump(40)
      q.draw()
    })
    const bombPath = await page.evaluate(() => {
      const q = (window as unknown as {
        __qa: Qa & { board: { kind: string; c: number; r: number; x: number; y: number; color: number }[] }
      }).__qa
      const bomb = q.board.find((p) => p.kind === 'bomb')
      if (!bomb) return null
      const pals = q.board
        .filter((p) => p.kind === 'bonbon' && Math.abs(p.c - bomb!.c) + Math.abs(p.r - bomb!.r) === 1)
        .sort((a, b) => (a.c === bomb!.c ? -1 : b.c === bomb!.c ? 1 : a.r - b.r))
      const same = pals.filter((p) => p.color === (pals[0]?.color ?? bomb!.color))
      const start = same[0] ?? pals[0]
      if (!start) return [{ x: bomb!.x, y: bomb!.y }]
      return [{ x: start.x, y: start.y }, { x: bomb.x, y: bomb.y }, ...(same[1] ? [{ x: same[1].x, y: same[1].y }] : [])]
    })
    expect(bombPath?.length ?? 0).toBeGreaterThanOrEqual(2)
    await dragPath(page, bombPath!)
    const clip = await page.evaluate((pts) => {
      const D = (window as unknown as { __qa: Qa }).__qa.D
      const pad = D * 1.15
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const p of pts) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      return {
        x: Math.max(0, minX - pad),
        y: Math.max(0, minY - pad),
        width: Math.min(innerWidth, maxX - minX + pad * 2),
        height: Math.min(innerHeight, maxY - minY + pad * 2),
      }
    }, bombPath!)
    await releasePath(page, bombPath!)
    const frames = await grabFrames(page, [0, 30, 60, 90, 130, 200, 300, 450], clip)
    await stitchStrip(page, frames, 'bomb-strip-390x844.png', clip.width, clip.height)
  })
})
