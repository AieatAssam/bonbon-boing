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
  home: () => void
  draw: () => void
  closeMeta: () => void
  prepPromoSave: () => void
  buySkin: (id: string) => void
  pump: (ms: number) => void
  findChain: (m: number) => { x: number; y: number }[] | null
}

async function ready(page: import('@playwright/test').Page) {
  await page.goto('?qa&freeze=1&screen=title', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  await page.evaluate(() => document.fonts.ready)
}

async function tapTitleMeta(page: import('@playwright/test').Page, label: string) {
  const btn = page.locator('#title .meta-row button').filter({ hasText: label })
  await btn.tap()
}

async function closeMetaTouch(page: import('@playwright/test').Page) {
  const back = page.locator('#meta button', { hasText: 'Back' })
  if (await back.count()) {
    await back.tap()
    await expect(page.locator('.meta-scrim')).toHaveCount(0, { timeout: 5000 })
  } else {
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.closeMeta())
  }
}

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}`, animations: 'disabled' })
  await page.screenshot({ path: `qa/shots/${name}`, animations: 'disabled' })
}

test.use({ hasTouch: true })

test('title dock opens all meta panels by touch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page)
  const panels: [string, RegExp][] = [
    ['Adventure', /Adventure/],
    ['Shop', /Sugar Shop/],
    ['Stickers', /Stickers/],
    ['Collection', /My Bonbons/],
  ]
  for (const [label, title] of panels) {
    await tapTitleMeta(page, label)
    await expect(page.locator('.meta-panel .meta-title').filter({ hasText: title })).toBeVisible({ timeout: 10_000 })
    await closeMetaTouch(page)
    await expect(page.locator('.meta-scrim')).toHaveCount(0)
  }
})

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`
  test(`round3 title nav ${tag}`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: w, height: h })
    await ready(page)
    await tapTitleMeta(page, 'Adventure')
    await expect(page.locator('.meta-map-scroll')).toBeVisible()
    await page.locator('.meta-map-scroll').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
    await snap(page, `round3-map-scroll_${tag}.png`)
    await closeMetaTouch(page)

    await tapTitleMeta(page, 'Shop')
    await expect(page.locator('.meta-title', { hasText: 'Sugar Shop' })).toBeVisible()
    await page.locator('.meta-panel').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await snap(page, `round3-shop-scroll_${tag}.png`)
    await closeMetaTouch(page)

    await snap(page, `round3-title_${tag}.png`)
  })
}

test('coin skin buy equip in Score Rush', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page)
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    q.prepPromoSave()
    q.buySkin('macaron')
  })
  await tapTitleMeta(page, 'Shop')
  await expect(page.locator('.meta-buy-btn, .meta-equipped-tick, .meta-equip-btn').first()).toBeVisible()
  const equip = page.locator('.meta-equip-btn').first()
  if (await equip.count()) await equip.tap()
  await closeMetaTouch(page)
  await expect(page.locator('.meta-scrim')).toHaveCount(0)

  await page.locator('#title button', { hasText: 'Score Rush' }).tap()
  await expect(page.locator('#hud')).toBeVisible()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 120; t += 40) q.pump(40)
    q.draw()
  })
  await snap(page, 'round3-macaron-equipped_390x844.png')
})
