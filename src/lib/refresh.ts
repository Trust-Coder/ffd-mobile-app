import { APP_REFRESH_EVENT } from '@/lib/events'

/**
 * Refresh coordinator: lets the pull-to-refresh UI await the REAL completion of
 * the reloads it triggers, instead of a blind timer (a flood app must never
 * signal "up to date" while data is still loading).
 */
let inFlight = 0
const settleListeners = new Set<() => void>()

/** Wrap a resource load so a refresh can await it. Safe to use for all loads. */
export function trackLoad<T>(promise: Promise<T>): Promise<T> {
  inFlight++
  return promise.finally(() => {
    inFlight = Math.max(0, inFlight - 1)
    if (inFlight === 0) {
      const callbacks = [...settleListeners]
      settleListeners.clear()
      callbacks.forEach((cb) => cb())
    }
  })
}

/** Dispatch a refresh and resolve once the triggered loads settle (safety-capped). */
export function dispatchRefresh(maxMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      settleListeners.delete(finish)
      resolve()
    }
    settleListeners.add(finish)
    window.dispatchEvent(new Event(APP_REFRESH_EVENT))
    // If nothing started loading within a tick, we're already settled.
    window.setTimeout(() => {
      if (inFlight === 0) finish()
    }, 60)
    // Safety net so the spinner can't hang forever.
    window.setTimeout(finish, maxMs)
  })
}
