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
    if (Date.parse(advisory.valid_until) < now) return 'expired'
  } else if (advisory.issue_time && now - Date.parse(advisory.issue_time) > DAY_MS) {
    return 'expired'
  }
  return 'active'
}
