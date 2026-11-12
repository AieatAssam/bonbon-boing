import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })
mkdirSync('qa/shots', { recursive: true })

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [932, 430],
  [1280, 800],
] as const

type Qa = {
  home: () => void
  draw: () => void
  openMeta: (w: 'map' | 'shop' | 'achievements' | 'collection', mapChapter?: number) => void
  closeMeta: () => void
  prepPromoSave: () => void
  prepMapLock: () => void
  markTipsSeen: () => void
  playRealRound: () => void
  buySkin: (id: string) => void
  equipItem: (id: string) => void
  showBlockerTip: (tipId: string) => void
  startAdventure: (id: number) => void
  pump: (ms: number) => void
  findChain: (m: number) => { x: number; y: number }[] | null
  capturePopBurst: () => void
  start: (mode: string, seed?: string) => void
}

async function ready(page: import('@playwright/test').Page) {
  await page.goto('?qa&freeze=1&screen=title', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${name}`, animations: 'disabled' })
}

async function playChain(page: import('@playwright/test').Page, min: number) {
  const path = await page.evaluate((m) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return q.findChain(m)
  }, min)
  if (!path?.length) return false
  await page.mouse.move(path[0]!.x, path[0]!.y)
  await page.mouse.down()
  for (const pt of path) await page.mouse.move(pt.x, pt.y, { steps: 3 })
  const tip = path[path.length - 1]!
  await page.mouse.move(tip.x + 6, tip.y + 6, { steps: 2 })
  await page.mouse.up()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 700; t += 40) q.pump(40)
    q.draw()
  })
  return true
}

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`
  test(`round2 pack ${tag}`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize({ width: w, height: h })
    await ready(page)
    await snap(page, `round2-title_${tag}.png`)

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.prepMapLock()
      q.openMeta('map', 2)
      q.draw()
    })
    await snap(page, `round2-map-locked-ch2_${tag}.png`)
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.home()
      q.draw()
      const saveKey = 'bonbon-boing-save-v3'
      const raw = localStorage.getItem(saveKey)
      if (raw) {
        const s = JSON.parse(raw) as { seenTips?: string[] }
        s.seenTips = (s.seenTips ?? []).filter((t) => t !== 'ice')
        localStorage.setItem(saveKey, JSON.stringify(s))
      }
      q.startAdventure(5)
      q.draw()
    })
    const tip = page.locator('.tip-card')
    if (await tip.count()) await snap(page, `round2-level-intro_${tag}.png`)
    await page.evaluate(() => {
      document.querySelector('.tip-scrim')?.remove()
      const q = (window as unknown as { __qa: Qa }).__qa
      q.markTipsSeen()
      q.draw()
    })

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.showBlockerTip('jelly')
      q.draw()
    })
    await snap(page, `round2-tutorial-card_${tag}.png`)
    await page.evaluate(() => document.querySelector('.tip-scrim')?.remove())

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.home()
      q.prepPromoSave()
      q.buySkin('macaron')
      q.openMeta('shop')
      q.draw()
    })
    await snap(page, `round2-shop-skin-owned_${tag}.png`)
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.equipItem('mochi')
      q.equipItem('night')
      q.start('timed', 'round2-skin')
      q.draw()
    })
    await playChain(page, 5)
    await snap(page, `round2-skin-in-play_${tag}.png`)

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.equipItem('beach')
      q.equipItem('confetti')
      q.start('timed', 'round2-theme')
      q.draw()
    })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.capturePopBurst())
    await snap(page, `round2-theme-in-play_${tag}.png`)

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.home()
      q.openMeta('achievements')
      const el = document.createElement('div')
      el.className = 'meta-toast ui'
      el.textContent = 'Sticker unlocked: Macaron!'
      document.getElementById('app')?.append(el)
      q.draw()
    })
    await snap(page, `round2-sticker-toast_${tag}.png`)
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.home()
      q.playRealRound()
      q.draw()
    })
    await page.waitForTimeout(400)
    await snap(page, `round2-results-real_${tag}.png`)

    const coinsText = await page.locator('.coin-roll').textContent()
    expect(coinsText).toMatch(/\+\d+ coins/)
    const coinNum = Number(coinsText?.match(/\+(\d+)/)?.[1] ?? 0)
    expect(coinNum).toBeGreaterThanOrEqual(10)
  })
}

for (const levelId of [1, 5, 12, 25, 45]) {
  test(`adventure L${levelId} mid-play 390x844`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ready(page)
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.markTipsSeen())
    await page.evaluate(
      (id) => {
        const q = (window as unknown as { __qa: Qa }).__qa
        q.startAdventure(id)
        for (let i = 0; i < 24; i++) q.pump(50)
        q.draw()
      },
      levelId,
    )
    await playChain(page, 4)
    await snap(page, `round2-adventure-L${levelId}_390x844.png`)
    const hud = await page.locator('.goal-strip').count()
    expect(hud).toBeGreaterThan(0)
  })
}
