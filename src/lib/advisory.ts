import type { Advisory, AdvisoryLifecycle } from '@/types/api'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Resolves an advisory's effective state for fail-safe rendering (0006).
 *
 * The server's `lifecycle` is authoritative when the data is fresh — FFD
 * advisories can stay in force for days without an explicit `valid_until`, so we
 * must NOT second-guess an explicit `lifecycle:"active"` online. The 24h-from-
 * issue heuristic is only a fail-safe for stale (offline-cached) data or when
 * the server didn't supply a lifecycle. An explicit `valid_until` is always
 * honoured (so a window that has demonstrably passed expires even offline).
 */
export function advisoryState(advisory: Advisory, opts: { stale?: boolean } = {}): AdvisoryLifecycle {
  if (advisory.lifecycle === 'withdrawn') return 'withdrawn'
  if (advisory.lifecycle === 'expired') return 'expired'

  if (advisory.valid_until) {
    const until = Date.parse(advisory.valid_until)
    return !Number.isNaN(until) && until < Date.now() ? 'expired' : 'active'
  }

  // Fresh data + server says active → trust it (no client-side expiry guess).
  if (advisory.lifecycle === 'active' && !opts.stale) return 'active'

  // Fallback: lifecycle unknown, or data is stale/offline → 24h-from-issue. Fail
  // safe to expired if we can't even parse issue_time.
  const issued = Date.parse(advisory.issue_time)
  if (Number.isNaN(issued) || Date.now() - issued > DAY_MS) return 'expired'
  return 'active'
}
