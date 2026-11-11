import { ladderHz } from './sim'

let ctx: AudioContext | null = null
let sfx: GainNode | null = null
let music: GainNode | null = null
let timer = 0
let step = 0
let wantMusic = true
let wantSfx = true
let paused = false
export let audioCreates = 0

const BED = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23]

export function audioState(): { sfx: boolean; music: boolean } {
  return { sfx: wantSfx, music: wantMusic }
}

export function setAudioPrefs(next: { sfx?: boolean; music?: boolean }): void {
  if (next.sfx !== undefined) wantSfx = next.sfx
  if (next.music !== undefined) wantMusic = next.music
  if (music) music.gain.value = wantMusic && !paused ? 0.9 : 0
}

export function setAudioPaused(on: boolean): void {
  paused = on
  if (music) music.gain.value = wantMusic && !paused ? 0.9 : 0
}

export function unlockAudio(qa: boolean): void {
  if (qa || ctx) return
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  try {
    ctx = new AC()
    audioCreates += 1
    sfx = ctx.createGain()
    music = ctx.createGain()
    sfx.gain.value = 0.9
    music.gain.value = wantMusic ? 0.9 : 0
    sfx.connect(ctx.destination)
    music.connect(ctx.destination)
    if (ctx.state === 'suspended') void ctx.resume()
    schedule()
  } catch {
    ctx = null
  }
}

function schedule() {
  if (!ctx || !music) return
  const drone = ctx.createOscillator()
  const dg = ctx.createGain()
  drone.type = 'sine'
  drone.frequency.value = 130.81
  dg.gain.value = 0.08
  drone.connect(dg)
  dg.connect(music)
  drone.start()
  const tick = () => {
    if (!ctx || !music) return
    const t = ctx.currentTime + 0.05
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = BED[step % BED.length]
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    o.connect(g)
    g.connect(music)
    o.start(t)
    o.stop(t + 0.75)
    step += 1
  }
  tick()
  timer = window.setInterval(tick, 560)
}

export function playLink(index: number): void {
  if (!ctx || !sfx || !wantSfx || paused) return
  const t = ctx.currentTime
  const f = ladderHz(index)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(f * 0.92, t)
  o.frequency.exponentialRampToValueAtTime(f * 1.04, t + 0.03)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  o.connect(g)
  g.connect(sfx)
  o.start(t)
  o.stop(t + 0.1)
}

export function playPop(index: number, big: boolean): void {
  if (!ctx || !sfx || !wantSfx || paused) return
  const t = ctx.currentTime
  const f = ladderHz(index)
  const o = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'triangle'
  o2.type = 'sine'
  o.frequency.setValueAtTime(f * 0.82, t)
  o.frequency.exponentialRampToValueAtTime(f, t + 0.045)
  o2.frequency.value = f * 2
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(big ? 0.34 : 0.22, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.28 : 0.16))
  o.connect(g)
  o2.connect(g)
  g.connect(sfx)
  o.start(t)
  o2.start(t)
  o.stop(t + 0.3)
  o2.stop(t + 0.3)
}

/** Sticker / shop unlock (procedural; similar to Kenney Interface bright blip). */
export function playUnlock(): void {
  if (!ctx || !sfx || !wantSfx || paused) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o2.type = 'triangle'
  o.frequency.setValueAtTime(523.25, t)
  o.frequency.exponentialRampToValueAtTime(987.77, t + 0.12)
  o2.frequency.setValueAtTime(784, t + 0.05)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.2, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o.connect(g)
  o2.connect(g)
  g.connect(sfx)
  o.start(t)
  o2.start(t + 0.04)
  o.stop(t + 0.4)
  o2.stop(t + 0.4)
}

export function stopAudio(): void {
  if (timer) window.clearInterval(timer)
  timer = 0
  ctx?.close().catch(() => undefined)
  ctx = null
  sfx = null
  music = null
}
