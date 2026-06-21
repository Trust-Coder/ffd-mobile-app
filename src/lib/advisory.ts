import type { Advisory, AdvisoryLifecycle } from '@/types/api'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Resolves an advisory's effective state for fail-safe rendering (0006).
 * Server `lifecycle` is authoritative; the client also independently checks
 * `valid_until` (so a cached/offline advisory expires on time) and falls back to
 * a 24h-from-issue heuristic when no window was set (backend's recommendation).
 */
export function advisoryState(advisory: Advisory): AdvisoryLifecycle {
  if (advisory.lifecycle === 'withdrawn') return 'withdrawn'
  if (advisory.lifecycle === 'expired') return 'expired'

  const now = Date.now()
  if (advisory.valid_until) {
    const until = Date.parse(advisory.valid_until)
    if (Number.isNaN(until) || until < now) return 'expired'
    return 'active'
  }

  // No explicit window: fall back to a 24h-from-issue heuristic. If we can't even
  // parse issue_time, fail safe to expired rather than show a stale "Active" card.
  const issued = Date.parse(advisory.issue_time)
  if (Number.isNaN(issued) || now - issued > DAY_MS) return 'expired'
  return 'active'
}
