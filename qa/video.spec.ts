import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

test.use({ video: 'on', viewport: { width: 390, height: 844 } })

test('gameplay video', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('?qa&screen=play&seed=feel', { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
  for (let n = 0; n < 3; n++) {
    await page.evaluate(() => {
      const q = (
        window as unknown as {
          __qa: {
            findChain: (min: number) => { x: number; y: number }[] | null
            pointer: (phase: 'down' | 'move' | 'up', x: number, y: number) => void
          }
        }
      ).__qa
      const path = q.findChain(4)
      if (!path) return
      q.pointer('down', path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) q.pointer('move', path[i].x, path[i].y)
      q.pointer('up', path[path.length - 1].x, path[path.length - 1].y)
    })
    await page.waitForTimeout(700)
  }
  const video = page.video()
  await page.close()
  const src = await video?.path()
  expect(src).toBeTruthy()
  if (src && existsSync(src)) copyFileSync(src, '/opt/cursor/artifacts/gameplay-390x844.webm')
})
