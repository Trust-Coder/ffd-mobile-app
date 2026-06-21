import { useCallback, useEffect, useState } from 'react'
import type { CachedResult } from '@/lib/api'
import { ApiException } from '@/lib/api'
import { APP_REFRESH_EVENT } from '@/lib/events'

export interface ResourceState<T> {
  data: T | null
  error: string | null
  /** true when the data was served from cache after a failed network call */
  stale: boolean
  cachedAt?: string
  loading: boolean
  reload: () => void
}

/**
 * Loads a `CachedResult` (see lib/api.cachedGet) into render state with
 * loading / error / stale flags and a `reload()`. The `loader` is re-run when
 * any value in `deps` changes (pass the same things you'd pass to useEffect).
 */
export function useResource<T>(
  loader: () => Promise<CachedResult<T>>,
  deps: unknown[],
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // Reload on app resume / pull-to-refresh.
  useEffect(() => {
    window.addEventListener(APP_REFRESH_EVENT, reload)
    return () => window.removeEventListener(APP_REFRESH_EVENT, reload)
  }, [reload])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then((res) => {
        if (!active) return
        setData(res.data)
        setStale(res.stale)
        setCachedAt(res.cachedAt)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiException ? err.message : 'Something went wrong.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // loader is intentionally excluded; callers control re-runs via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, error, stale, cachedAt, loading, reload }
}
