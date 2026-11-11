import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

const screens = ['title', 'play', 'chain', 'pop', 'pause', 'results'] as const

mkdirSync('qa/shots', { recursive: true })

type Qa = {
  ready: boolean
  screen: string
  pose: string
  seed: string
  score: number
  timeLeft: number
  paused: boolean
  inputLocked: boolean
  chain: number[]
  D: number
  frame: number
  highlightFrame: number
  popStartedAt: number[]
  popWallMs: number
  settled: boolean
  settleMs: number
  hitstopMs: number
  hitstopActive: boolean
  particleCount: number
  particleSig: number
  ghost: boolean
  ghostX: number
  ghostY: number
  spriteMisses: number
  audioCreates: number
  filterOps: number
  muteSfx: boolean
  muteMusic: boolean
  maxCluster: number
  ribbonThickness: number
  board: { id: number; x: number; y: number; d: number; popping: boolean; kind: string }[]
  pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
  traceChain: (cells: { id: number; x: number; y: number }[]) => void
  appendPiece: (id: number) => void
  appendPieces: (ids: number[]) => void
  beginChain: (id: number) => void
  findChain: (min: number, avoid?: number[], prefer?: 'top' | 'bottom') => { id: number; x: number; y: number }[] | null
  center: (id: number) => { x: number; y: number } | null
  pump: (ms: number) => void
  draw: () => void
  pause: () => void
  start: (mode: string, seed?: string) => void
  setMute: (sfx: boolean, music: boolean) => void
}

async function qa(page: import('@playwright/test').Page): Promise<Qa> {
  return page.evaluate(() => (window as unknown as { __qa: Qa }).__qa)
}

for (const [w, h] of viewports) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })

    test('layout', async ({ page }) => {
      test.setTimeout(90_000)
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      for (const screen of screens) {
        errors.length = 0
        const seed = screen === 'play' ? 'pretty' : 'feel'
        if (screen === 'chain') {
          await page.goto(`?qa&freeze=1&screen=play&seed=feel`, { timeout: 30_000 })
          await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
          await page.evaluate(() => document.fonts.ready)
          const upper = await page.evaluate(() => {
            const q = (window as unknown as { __qa: Qa }).__qa
            return q.findChain(6) ?? q.findChain(5) ?? q.findChain(4) ?? q.findChain(3) ?? q.findChain(2)
          })
          expect(upper?.length ?? 0).toBeGreaterThanOrEqual(2)
          await page.evaluate((path) => {
            const q = (window as unknown as { __qa: Qa }).__qa
            q.traceChain(path!)
          }, upper)
          const tip = upper![upper!.length - 1]!
          await page.mouse.move(tip.x + 8, tip.y + 8)
          await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
        } else {
          await page.goto(`?qa&freeze=1&screen=${screen}&seed=${seed}`, { timeout: 30_000 })
          await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
          await page.evaluate(() => document.fonts.ready)
        }
        const check = await page.evaluate(() =>
          (window as unknown as { __checkOverlaps: () => { overlaps: unknown[]; offscreen: string[] } }).__checkOverlaps(),
        )
        const geo = await page.evaluate(() =>
          (window as unknown as { __checkPlayGeometry: () => { violations: string[] } }).__checkPlayGeometry(),
        )
        expect(check.overlaps, `${screen} ${JSON.stringify(check)}`).toEqual([])
        expect(check.offscreen, screen).toEqual([])
        expect(geo.violations, `${screen} ${JSON.stringify(geo)}`).toEqual([])
        const text = (await page.locator('#app').innerText()).replace(/\s+/g, ' ').trim()
        if (screen === 'title') expect(text).toContain('Bonbon Boing!')
        else if (screen === 'pause') expect(text).toContain('Paused')
        else expect(text).toMatch(/^[\d A-Za-z!]+$/)
        const blank = await page.evaluate(() => {
          const c = document.getElementById('field') as HTMLCanvasElement
          const ctx = c.getContext('2d')
          if (!ctx) return true
          const d = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data
          return d[3] === 0
        })
        expect(blank, screen).toBe(false)
        expect(errors, `${screen} ${errors.join('\n')}`).toEqual([])
        const state = await qa(page)
        if (screen !== 'title') {
          const ds = new Set(state.board.map((p) => p.d))
          expect(ds.size).toBe(1)
          expect([...ds][0]).toBe(state.D)
        }
        if (screen === 'chain') {
          expect(state.chain.length).toBeGreaterThanOrEqual(2)
          expect(state.ribbonThickness).toBeGreaterThanOrEqual(8)
        }
        if (screen === 'play' || screen === 'chain') {
          expect(state.maxCluster).toBeLessThanOrEqual(7)
          if (screen === 'play') {
            const hud = await page.evaluate(() =>
              (window as unknown as { __checkHudBoard: () => { violations: string[] } }).__checkHudBoard(),
            )
            expect(hud.violations, `${screen} hud-board`).toEqual([])
          }
        }
        if (screen === 'chain' && state.chain.length >= 5 && w >= 844) {
          expect(state.chain.length).toBeGreaterThanOrEqual(2)
          await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
          const sample = await page.evaluate(() => {
            const q = (window as unknown as { __qa: Qa }).__qa
            const ids = q.chain
            if (ids.length < 2) return { ok: false }
            const p0 = q.center(ids[0]!)
            const p1 = q.center(ids[1]!)
            if (!p0 || !p1) return { ok: false }
            const c = document.getElementById('field') as HTMLCanvasElement
            const ctx = c.getContext('2d')
            if (!ctx) return { ok: false }
            const sx = c.width / innerWidth
            const sy = c.height / innerHeight
            const ribbonPx = (r: number, g: number, b: number, a: number) => {
              if (a < 190) return false
              if (r > 215 && g > 215 && b > 215) return true
              if (r > 195 && g > 140 && b < 150) return true
              if (g > 195 && r > 90 && r < 170) return true
              if (r > 210 && g > 90 && b > 150) return true
              return r + g + b > 450
            }
            let hits = 0
            for (const t of [0.38, 0.5, 0.62]) {
              const mx = p0.x + (p1.x - p0.x) * t
              const my = p0.y + (p1.y - p0.y) * t
              for (const [dx, dy] of [
                [0, 0],
                [-4, 0],
                [4, 0],
              ]) {
                const d = ctx.getImageData(Math.floor((mx + dx) * sx), Math.floor((my + dy) * sy), 1, 1).data
                if (ribbonPx(d[0]!, d[1]!, d[2]!, d[3]!)) hits += 1
              }
            }
            return { ok: hits >= 2 }
          })
          expect(sample.ok, 'ribbon pixel between chain centres').toBe(true)
        }
        if (screen === 'pop' && state.hitstopMs > 0) {
          expect(state.hitstopMs).toBeGreaterThanOrEqual(65)
          expect(state.hitstopMs).toBeLessThanOrEqual(75)
          expect(state.particleCount).toBeGreaterThan(4)
        }
        await page.screenshot({ path: `qa/shots/${screen}_${w}x${h}.png`, animations: 'disabled' })
      }
    })

    test('play-feel', async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      const driven = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const upper =
          q.findChain(6) ?? q.findChain(5) ?? q.findChain(4) ?? q.findChain(3) ?? q.findChain(2)
        const lower = upper ? q.findChain(2, upper.map((p) => p.id), 'bottom') : null
        if (!upper || !lower) return { ok: false as const }
        const before = q.frame
        q.beginChain(upper[0].id)
        const highlighted = q.chain.length === 1
        q.appendPieces(upper.slice(1).map((p) => p.id))
        const chain = q.chain.length
        q.pointer('up', upper[upper.length - 1].x, upper[upper.length - 1].y)
        const held = q.board.find((p) => p.id === lower[0].id && !p.popping)
        q.pump(90)
        const heldAfter = q.board.find((p) => p.id === lower[0].id)
        const mid = {
          highlighted,
          chain,
          path: upper.length,
          pop0: q.popStartedAt[0] ?? 999,
          wall: q.popWallMs,
          locked: q.inputLocked,
          hitstop: q.hitstopMs,
          active: q.hitstopActive || q.hitstopMs > 0,
          particles: q.particleCount,
          moved: held && heldAfter ? heldAfter.c !== held.c || heldAfter.r !== held.r : true,
          audio: q.audioCreates,
          misses: q.spriteMisses,
        }
        let guard = 0
        while (!q.settled && guard++ < 120) q.pump(50)
        const spot = q.center(lower[0].id)
        q.pointer('down', spot!.x, spot!.y)
        const next = { chain: q.chain.slice(), locked: q.inputLocked, settled: q.settled }
        q.pointer('up', spot!.x, spot!.y)
        q.draw()
        const misses = q.spriteMisses
        return { ok: true as const, mid, next, id: lower[0].id, misses }
      })
      expect(driven.ok).toBe(true)
      if (!driven.ok) return
      expect(driven.mid.highlighted).toBe(true)
      expect(driven.mid.chain).toBe(driven.mid.path)
      expect(driven.mid.pop0).toBeLessThan(50)
      expect(driven.mid.wall).toBeLessThan(50)
      expect(driven.mid.locked).toBe(false)
      if (driven.mid.path >= 6) {
        expect(driven.mid.hitstop).toBeGreaterThanOrEqual(65)
        expect(driven.mid.hitstop).toBeLessThanOrEqual(75)
        expect(driven.mid.active).toBe(true)
      }
      expect(driven.mid.particles).toBeGreaterThan(4)
      expect(driven.mid.moved).toBe(false)
      expect(driven.mid.audio).toBe(0)
      expect(driven.next.locked).toBe(false)
      expect(driven.next.settled).toBe(true)
      expect(driven.next.chain).toEqual([driven.id])
      expect(driven.misses).toBeLessThan(40)

      await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      const started = Date.now()
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const path =
          q.findChain(6) ?? q.findChain(5) ?? q.findChain(4) ?? q.findChain(3) ?? q.findChain(2)
        if (!path) return
        q.traceChain(path)
        q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
      })
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled, undefined, { timeout: 1500 })
      const settle = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        return { ms: q.settleMs, locked: q.inputLocked, bomb: q.board.some((p) => p.kind === 'bomb') }
      })
      expect(Date.now() - started).toBeLessThan(1000)
      expect(settle.ms).toBeLessThan(1000)
      expect(settle.locked).toBe(false)
      if (w >= 390) expect(settle.bomb).toBe(true)
      const perf = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const before = q.spriteMisses
        const t = performance.now()
        for (let i = 0; i < 120; i++) q.draw()
        return { ms: performance.now() - t, before, after: q.spriteMisses, filters: q.filterOps }
      })
      expect(perf.after).toBe(perf.before)
      expect(perf.filters).toBe(0)
      expect(perf.ms / 120).toBeLessThan(12)
    })

    test('navigation', async ({ page }) => {
      test.setTimeout(60_000)
      const navSeed = w <= 360 ? 'feel' : 'qa-nav'
      await page.goto(`?qa&screen=play&seed=${navSeed}`, { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      const pause = await page.getByRole('button', { name: 'Pause' }).boundingBox()
      const home = await page.getByRole('button', { name: 'Home' }).boundingBox()
      expect(pause && pause.width >= 44 && pause.y >= 0 && pause.y + pause.height <= h + 1).toBe(true)
      expect(home && home.width >= 44 && home.x >= 0 && home.x + home.width <= w + 1).toBe(true)
      await page.getByRole('button', { name: 'Pause' }).click()
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
      const frozen = await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.timeLeft)
      await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.pump(700))
      await page.waitForTimeout(180)
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.timeLeft)).toBe(frozen)
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.paused)).toBe(true)
      await page.getByRole('button', { name: 'Resume' }).click()
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('play')
      const scored = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const path = q.findChain(2) ?? q.findChain(3)
        if (!path || path.length < 2) return false
        q.traceChain(path)
        q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
        q.pump(1000)
        return q.score > 0
      })
      expect(scored).toBe(true)
      await page.getByRole('button', { name: 'Pause' }).click()
      await page.getByRole('button', { name: 'Restart' }).click()
      const reset = await qa(page)
      expect(reset.score).toBe(0)
      expect(reset.timeLeft).toBeGreaterThan(59_000)
      expect(Math.ceil(reset.timeLeft / 1000)).toBe(60)
      expect(reset.screen).toBe('play')
      await page.keyboard.press('Escape')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('pause')
      await page.keyboard.press('Escape')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('play')
      await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.setMute(true, false))
      await page.reload()
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.muteSfx)).toBe(true)
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        q.setMute(false, false)
        q.start('daily')
      })
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.seed)).toMatch(/^bonbon-\d{4}-\d{2}-\d{2}$/)
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        q.start('cuddle', 'pretty')
        q.pump(2000)
      })
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.timeLeft)).toBe(60_000)
      await page.goto('?qa&screen=play&seed=qa-nav', { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
      await page.goBack()
      expect(page.url()).toContain('/bonbon-boing/')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('pause')
      await page.goBack()
      expect(page.url()).toContain('/bonbon-boing/')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('play')
      await page.goBack()
      expect(page.url()).toContain('/bonbon-boing/')
      expect(page.url()).not.toContain('github.com')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.screen)).toBe('pause')
    })

    test('ghost hand onboarding', async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto('./', { timeout: 30_000 })
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
      await page.getByRole('button', { name: 'Play' }).click()
      await page.waitForFunction(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        return q.ghost === true && q.ghostX > 0 && q.ghostY > 0
      })
      const pose = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const text = document.querySelector('#app')?.textContent ?? ''
        return { x: q.ghostX, y: q.ghostY, D: q.D, w: innerWidth, h: innerHeight, text }
      })
      expect(pose.text.toLowerCase()).not.toMatch(/drag|swipe|tap to|match|chain|aim/)
      expect(pose.x).toBeGreaterThan(0)
      expect(pose.y).toBeGreaterThan(0)
      expect(pose.x).toBeLessThan(pose.w)
      expect(pose.y).toBeLessThan(pose.h)
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        const path = q.findChain(2)!
        q.traceChain(path)
        q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
      })
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.ghost === false)
      await page.reload()
      await page.getByRole('button', { name: 'Play' }).click()
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
      expect(await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.ghost)).toBe(false)
    })
  })
}
