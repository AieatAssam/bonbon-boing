import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ video: 'on' })

test('gameplay video portrait', async ({ page }) => {
  test.setTimeout(120_000)
  test.slow()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  const video = await page.video()
  const playChain = async (min: number) => {
    await page.evaluate((m) => {
      const q = (
        window as unknown as {
          __qa: {
            findChain: (n: number) => { x: number; y: number }[] | null
            pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
            pump: (ms: number) => void
          }
        }
      ).__qa
      const path = q.findChain(m)
      if (!path) return
      q.pointer('down', path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) q.pointer('move', path[i].x, path[i].y)
      q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
      q.pump(900)
    }, min)
    await page.waitForTimeout(550)
  }
  const seq = [3, 4, 4, 5, 5, 6, 6, 8, 4, 5, 6, 4, 5, 8, 4, 5, 6, 8, 4, 5]
  await page.waitForTimeout(500)
  for (const min of seq) {
    await playChain(min)
    await page.waitForTimeout(900)
  }
  await page.waitForTimeout(5000)
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
    await page.evaluate(() => {
      const q = (
        window as unknown as {
          __qa: {
            findChain: (n: number) => { x: number; y: number }[] | null
            pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
            pump: (ms: number) => void
          }
        }
      ).__qa
      const path = q.findChain(4)
      if (!path) return
      q.pointer('down', path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) q.pointer('move', path[i].x, path[i].y)
      q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
      q.pump(700)
    })
    await page.waitForTimeout(520)
  }
  await page.waitForTimeout(2200)
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-844x390.webm')
})
