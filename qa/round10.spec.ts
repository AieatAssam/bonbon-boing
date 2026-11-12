import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ hasTouch: true })

type Qa = {
  screen: string
  score: number
  movesLeft: number
  settled: boolean
  pump: (n: number) => void
  draw: () => void
  findGoalChain: (m?: number) => { x: number; y: number }[] | null
  prepAdventureLevel: (n: number) => void
  startAdventure: (n: number) => void
  adventureMovesTable: (max: number) => { level: number; moves: number; cols: number; rows: number; goals: string[] }[]
  showTestToast: () => void
}

const viewports = [
  [360, 640, '360x640'],
  [390, 844, '390x844'],
  [430, 932, '430x932'],
  [844, 390, '844x390'],
  [932, 430, '932x430'],
  [1280, 800, '1280x800'],
] as const

async function ready(page: import('@playwright/test').Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(`?qa&screen=title`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
}

async function openLevel(page: import('@playwright/test').Page, id: number) {
  await page.evaluate((lvl) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.prepAdventureLevel(lvl)
    q.startAdventure(lvl)
  }, id)
  await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
  await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())
  await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
}

for (const [w, h, tag] of viewports) {
  for (const lvl of [1, 8, 24] as const) {
    test(`playfield in viewport ${tag} L${lvl}`, async ({ page }) => {
      await ready(page, w, h)
      await openLevel(page, lvl)
      const check = await page.evaluate(() =>
        (window as unknown as { __checkPlayfieldInViewport: () => { violations: string[] } }).__checkPlayfieldInViewport(),
      )
      console.log(`ROUND10_VIEWPORT ${tag} L${lvl}`, JSON.stringify(check))
      expect(check.violations, `${tag} L${lvl}`).toEqual([])
      if (w >= h && (lvl === 1 || lvl === 24)) {
        await page.screenshot({ path: `/opt/cursor/artifacts/round10-landscape-L${lvl}_${tag}.png` })
      }
    })
  }
}

for (const lvl of [20, 24] as const) {
  test(`no state reset after 20 moves L${lvl} @390x844`, async ({ page }) => {
    test.setTimeout(120_000)
    await ready(page, 390, 844)
    await openLevel(page, lvl)
    const samples: { move: number; score: number; movesLeft: number }[] = []
    let lastScore = -1
    let lastMoves = -1
    for (let i = 0; i < 20; i++) {
      const snap = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        return { score: q.score, movesLeft: q.movesLeft }
      })
      if (lastScore >= 0 && snap.score < lastScore) {
        throw new Error(`score reset at move ${i}: ${lastScore} -> ${snap.score}`)
      }
      if (lastMoves >= 0 && snap.movesLeft > lastMoves) {
        throw new Error(`moves jumped at move ${i}: ${lastMoves} -> ${snap.movesLeft}`)
      }
      samples.push({ move: i, ...snap })
      lastScore = snap.score
      lastMoves = snap.movesLeft
      const path = await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        return q.findGoalChain(3) ?? q.findGoalChain(2)
      })
      if (path?.length) {
        const box = await page.locator('canvas').first().boundingBox()
        if (box) {
          await page.mouse.move(box.x + path[0]!.x, box.y + path[0]!.y)
          await page.mouse.down()
          for (const pt of path) await page.mouse.move(box.x + pt.x, box.y + pt.y, { steps: 2 })
          await page.mouse.up()
        }
      }
      await page.evaluate(() => {
        const q = (window as unknown as { __qa: Qa }).__qa
        for (let t = 0; t < 700; t += 35) q.pump(35)
        q.draw()
      })
      await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.settled).catch(() => {})
    }
    console.log(`ROUND10_NO_RESET_L${lvl}`, JSON.stringify(samples))
    expect(samples.length).toBe(20)
  })
}

for (const [w, h, tag] of [
  [844, 390, '844x390'],
  [932, 430, '932x430'],
] as const) {
  test(`landscape toast readable ${tag}`, async ({ page }) => {
    await ready(page, w, h)
    await page.locator('#title button', { hasText: 'Score Rush' }).tap()
    await page.waitForFunction(() => (window as unknown as { __qa: Qa }).__qa.screen === 'play')
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.showTestToast())
    await page.waitForSelector('.meta-toast', { state: 'visible' })
    const text = await page.locator('.meta-toast').innerText()
    expect(text).toContain('Combo')
    expect(text).not.toMatch(/…|\.\.\.$/)
    await page.screenshot({ path: `/opt/cursor/artifacts/round10-rush-toast_${tag}.png` })
  })
}

test('L1–24 grid moves goals table', async ({ page }) => {
  await ready(page, 390, 844)
  const rows = await page.evaluate(() =>
    (window as unknown as { __qa: Qa }).__qa.adventureMovesTable(24),
  )
  console.log('ROUND10_LEVEL_TABLE', JSON.stringify(rows))
  await page.goto('about:blank')
  await page.evaluate((data) => {
    const el = document.createElement('pre')
    el.style.font = '11px monospace'
    el.textContent = data
      .map((r) => `L${r.level}\t${r.cols}x${r.rows}\tmoves=${r.moves}\t${r.goals.join(' ')}`)
      .join('\n')
    document.body.append(el)
  }, rows)
  await page.screenshot({ path: '/opt/cursor/artifacts/round10-level-table-l1-24.png', fullPage: true })
  expect(rows.every((r) => r.cols === (r.level <= 15 ? 7 : 8))).toBe(true)
})
