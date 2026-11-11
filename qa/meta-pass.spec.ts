import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

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
  openMeta: (w: 'map' | 'shop' | 'achievements' | 'collection') => void
  closeMeta: () => void
  prepPromoSave: () => void
  startAdventure: (id: number) => void
  home: () => void
  draw: () => void
}

async function ready(page: import('@playwright/test').Page, extra = '') {
  await page.goto(`?qa&freeze=1&screen=title${extra}`, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${name}`, animations: 'disabled' })
}

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`
  test(`promo pack ${tag}`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: w, height: h })
    await ready(page)
    await snap(page, `meta-title_${tag}.png`)

    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.prepPromoSave())

    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.openMeta('map'))
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    await snap(page, `meta-map_${tag}.png`)

    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.openMeta('shop'))
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    await snap(page, `meta-shop_${tag}.png`)

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.closeMeta()
      q.openMeta('achievements')
      q.draw()
    })
    await snap(page, `meta-achievements_${tag}.png`)

    await page.evaluate(() => {
      const q = (window as unknown as { __qa: Qa }).__qa
      q.closeMeta()
      q.openMeta('collection')
      q.draw()
    })
    await snap(page, `meta-collection_${tag}.png`)

  })
}

test('achievement toast 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page)
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.className = 'meta-toast ui'
    el.textContent = '✨ Rainbow blast!'
    document.body.append(el)
  })
  await snap(page, 'meta-toast-390x844.png')
})

test('adventure blockers 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?qa&freeze=1&screen=title', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({
    content: '.map-path-node.current { animation: none !important; transform: none !important; }',
  })
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { prepAdventureLevel: (n: number) => void; markTipsSeen: () => void } }).__qa
    q.prepPromoSave()
    q.prepAdventureLevel(4)
    q.markTipsSeen()
  })
  await page.locator('#title .meta-row button').filter({ hasText: 'Adventure' }).click()
  await page.locator('button.map-path-node .map-node-num', { hasText: '4' }).click()
  await page.waitForFunction(() => (window as unknown as { __qa: { screen: string } }).__qa.screen === 'play')
  await page.evaluate(() => {
    document.querySelector('.tip-scrim')?.remove()
    ;(window as unknown as { __qa: Qa }).__qa.draw()
  })
  await snap(page, 'meta-adventure-play-390x844.png')
})

test('results coins 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?qa&freeze=1&screen=results&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await snap(page, 'meta-results-390x844.png')
})
