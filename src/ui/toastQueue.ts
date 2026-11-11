import { playUnlock } from '../audio'

type ToastItem = { message: string; emoji: string }
let queue: ToastItem[] = []
let showing = false
let timer: ReturnType<typeof setTimeout> | null = null
let pendingSummary = 0

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function removeToasts() {
  document.querySelectorAll('.meta-toast').forEach((n) => n.remove())
}

function showOne(item: ToastItem, extra: number) {
  removeToasts()
  const toast = document.createElement('div')
  toast.className = 'meta-toast ui'
  toast.setAttribute('role', 'status')
  const extraLine = extra > 0 ? ` (+${extra} more)` : ''
  toast.textContent = `${item.emoji} ${item.message}${extraLine}`
  document.body.append(toast)
}

function drain() {
  if (!queue.length) {
    showing = false
    pendingSummary = 0
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
    removeToasts()
    drain()
  }, 1600)
}

export function queueToast(message: string, emoji = '✨'): void {
  queue.push({ message, emoji })
  if (!showing) drain()
}

export function queueToasts(items: { toast: string; emoji: string }[]): void {
  for (const it of items) queue.push({ message: it.toast, emoji: it.emoji })
  if (!showing) drain()
}

export function peekPendingAchievementCount(): number {
  return queue.length + (showing ? 1 : 0) + pendingSummary
}

export function resetToastQueue(): void {
  clearTimer()
  queue = []
  showing = false
  pendingSummary = 0
  removeToasts()
}
