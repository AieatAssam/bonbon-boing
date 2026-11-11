import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.(ts|css)$/.test(name)) out.push(p)
  }
  return out
}

describe('static render rules', () => {
  it('never assigns a canvas filter or blur', () => {
    const root = join(here, '..', 'src')
    const bad: string[] = []
    for (const file of files(root)) {
      const text = readFileSync(file, 'utf8')
      if (/\.filter\s*=/.test(text) || /shadowBlur/.test(text) || /blur\(/.test(text) || /ctx\.filter/.test(text)) {
        bad.push(file)
      }
    }
    expect(bad).toEqual([])
  })

  it('keeps the no-affiliation note in the readme', () => {
    const readme = readFileSync(join(here, '..', 'README.md'), 'utf8')
    expect(readme).toContain(
      'Bonbon Boing! is an independent fan-made game. It is not affiliated with, endorsed by or sponsored by PopCap/EA, Taito, Aladdin X, Disney, SEGA, Sony, Nintendo/HAL Laboratory, Jazwares or Mediatonic. All names are trademarks of their owners.',
    )
  })
})
