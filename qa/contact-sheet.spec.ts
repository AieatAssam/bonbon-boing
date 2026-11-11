import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

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

test('six-viewport contact sheet', async ({ browser }) => {
  test.setTimeout(180_000)
  const shots: string[] = []
  for (const [w, h] of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
    await page.goto('?qa&freeze=1&screen=play&seed=feel', { timeout: 30_000 })
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
    await page.evaluate(() => document.fonts.ready)
    const buf = await page.screenshot({ type: 'png', animations: 'disabled' })
    shots.push(buf.toString('base64'))
    await page.close()
  }
  const page = await browser.newPage()
  const dataUrl = await page.evaluate(
    async ({ imgs, cols, cellW, cellH }) => {
      const canvas = document.createElement('canvas')
      canvas.width = cols * cellW
      canvas.height = Math.ceil(imgs.length / cols) * cellH
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#C8E8FF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < imgs.length; i++) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const scale = Math.min(cellW / img.width, cellH / img.height)
            const dw = img.width * scale
            const dh = img.height * scale
            const dx = col * cellW + (cellW - dw) / 2
            const dy = row * cellH + (cellH - dh) / 2
            ctx.drawImage(img, dx, dy, dw, dh)
            resolve()
          }
          img.src = `data:image/png;base64,${imgs[i]}`
        })
      }
      return canvas.toDataURL('image/png')
    },
    { imgs: shots, cols: 3, cellW: 390, cellH: 844 },
  )
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  writeFileSync('/opt/cursor/artifacts/viewport-contact-sheet.png', Buffer.from(b64, 'base64'))
  writeFileSync('qa/shots/viewport-contact-sheet.png', Buffer.from(b64, 'base64'))
  expect(shots.length).toBe(6)
  await page.close()
})
