import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

type Qa = {
  findChain: (min: number) => { x: number; y: number }[] | null
  pump: (ms: number) => void
  draw: () => void
}

test.use({ video: 'on' })

async function playChain(page: import('@playwright/test').Page, min: number) {
  const path = await page.evaluate((m) => {
    const q = (window as unknown as { __qa: Qa }).__qa
    return q.findChain(m)
  }, min)
  if (!path?.length) return false
  await page.mouse.move(path[0]!.x, path[0]!.y)
  await page.mouse.down()
  for (const pt of path) {
    await page.mouse.move(pt.x, pt.y, { steps: 4 })
    await page.evaluate(() => (window as unknown as { __qa: Qa }).__qa.draw())
  }
  const tip = path[path.length - 1]!
  await page.mouse.move(tip.x + 8, tip.y + 8, { steps: 2 })
  await page.mouse.up()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa }).__qa
    for (let t = 0; t < 950; t += 50) q.pump(50)
    q.draw()
  })
  return true
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('30s gameplay touch clip', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  await page.waitForTimeout(300)
  const end = Date.now() + 30_000
  const mins = [4, 5, 6, 5, 4, 6, 5, 4]
  let i = 0
  while (Date.now() < end) {
    await playChain(page, mins[i % mins.length]!)
    i += 1
    await page.waitForTimeout(650)
  }
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-30s-390x844.webm')
})

test('60s round wall-clock touch', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  await page.evaluate(() => {
    const q = (window as unknown as { __qa: Qa & { pointer: (p: string, x: number, y: number) => void } }).__qa
    q.pointer('down', innerWidth / 2, innerHeight * 0.65)
    q.pointer('up', innerWidth / 2, innerHeight * 0.65)
  })
  const end = Date.now() + 62_000
  const mins = [3, 4, 5, 6, 5, 4, 6, 5, 4, 5, 6, 8]
  let i = 0
  while (Date.now() < end) {
    await playChain(page, mins[i % mins.length]!)
    i += 1
    await page.waitForTimeout(520)
  }
  await page.waitForTimeout(2000)
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-60s-390x844.webm')
})

test('gameplay video portrait', async ({ page }) => {
  test.setTimeout(120_000)
  test.slow()
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  const seq = [3, 4, 4, 5, 5, 6, 6, 8, 4, 5, 6, 4, 5, 8, 4, 5, 6, 8, 4, 5, 6, 5, 8]
  await page.waitForTimeout(400)
  for (const min of seq) {
    await playChain(page, min)
    await page.waitForTimeout(720)
  }
  await page.waitForTimeout(4500)
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-390x844.webm')
})

test('gameplay video landscape', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  await page.waitForTimeout(400)
  for (let n = 0; n < 10; n++) {
    await playChain(page, 4)
    await page.waitForTimeout(520)
  }
  await page.waitForTimeout(2200)
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-844x390.webm')
})
