import { playUnlock } from '../audio'

type ToastItem = { message: string; emoji: string }
let queue: ToastItem[] = []
let showing = false
let timer: ReturnType<typeof setTimeout> | null = null
let pendingSummary = 0
let blocked = false
let toastEl: HTMLDivElement | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function ensureToastEl(): HTMLDivElement {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'meta-toast ui'
    toastEl.setAttribute('role', 'status')
    toastEl.style.display = 'none'
    document.body.append(toastEl)
  }
  return toastEl
}

function hideToastEl() {
  if (toastEl) toastEl.style.display = 'none'
}

function showOne(item: ToastItem, _extra: number) {
  if (blocked) return
  const toast = ensureToastEl()
  toast.textContent = `${item.emoji} ${item.message}`
  toast.style.display = 'block'
}

function drain() {
  if (blocked) {
    showing = false
    hideToastEl()
    return
  }
  if (!queue.length) {
    showing = false
    pendingSummary = 0
    hideToastEl()
    return
  }
  showing = true
  const item = queue.shift()!
  const extra = queue.length
  playUnlock()
  showOne(item, extra > 2 ? extra : extra > 0 && queue.length === 0 ? 0 : extra > 0 ? extra : 0)
  if (extra > 2) pendingSummary = extra
  else pendingSummary = 0
  timer = setTimeout(() => {
    hideToastEl()
    drain()
  }, 1600)
}

export function setToastBlocked(on: boolean): void {
  blocked = on
  if (on) {
    clearTimer()
    hideToastEl()
    showing = false
  } else if (queue.length && !showing) {
    drain()
  }
}

export function queueToast(message: string, emoji = '✨'): void {
  queue.push({ message, emoji })
  if (!showing && !blocked) drain()
}

export function queueToasts(items: { toast: string; emoji: string }[]): void {
  for (const it of items) queue.push({ message: it.toast, emoji: it.emoji })
  if (!showing && !blocked) drain()
}

export function peekPendingAchievementCount(): number {
  return queue.length + (showing ? 1 : 0) + pendingSummary
}

export function resetToastQueue(): void {
  clearTimer()
  queue = []
  showing = false
  pendingSummary = 0
  hideToastEl()
}
