import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiException } from '@/lib/api'
import type { CachedResult } from '@/lib/api'
import type { CursorMeta, Paginated } from '@/types/api'
import { APP_REFRESH_EVENT } from '@/lib/events'
import { trackLoad } from '@/lib/refresh'

type PageLoader<T> = (cursor: string | null) => Promise<CachedResult<Paginated<T>>>

export interface PaginatedState<T> {
  items: T[]
  meta: CursorMeta | null // latest page's meta (carries unread_count for the inbox)
  error: string | null
  loadMoreError: string | null
  loading: boolean // initial / reload
  loadingMore: boolean
  hasMore: boolean
  stale: boolean
  cachedAt?: string
  reload: () => void
  loadMore: () => void
}

/**
 * Keyset-cursor pagination over a `CachedResult<Paginated<T>>` loader. Page one is
 * offline-tolerant (loader should use cachedGet); subsequent pages append. The
 * loader re-runs (resetting to page one) when any value in `deps` changes; a
 * generation guard drops any in-flight load-more whose filter has since changed.
 */
export function usePaginated<T>(loader: PageLoader<T>, deps: unknown[]): PaginatedState<T> {
  const [items, setItems] = useState<T[]>([])
  const [meta, setMeta] = useState<CursorMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stale, setStale] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined)
  const [nonce, setNonce] = useState(0)
  const genRef = useRef(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // Reload on app resume / pull-to-refresh.
  useEffect(() => {
    window.addEventListener(APP_REFRESH_EVENT, reload)
    return () => window.removeEventListener(APP_REFRESH_EVENT, reload)
  }, [reload])

  useEffect(() => {
    genRef.current += 1
    let active = true
    setLoading(true)
    setError(null)
    setLoadMoreError(null)
    setLoadingMore(false)
    trackLoad(loader(null))
      .then((res) => {
        if (!active) return
        setItems(res.data.items)
        setMeta(res.data.meta)
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
    // loader excluded by design — callers control re-runs via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const loadMore = useCallback(() => {
    const cursor = meta?.next_cursor
    if (!cursor || loadingMore) return
    const gen = genRef.current
    setLoadingMore(true)
    setLoadMoreError(null)
    loader(cursor)
      .then((res) => {
        if (gen !== genRef.current) return // a reload changed the filter; drop this page
        setItems((prev) => [...prev, ...res.data.items])
        setMeta(res.data.meta)
        if (res.stale) setStale(true)
      })
      .catch((err: unknown) => {
        if (gen !== genRef.current) return
        setLoadMoreError(err instanceof ApiException ? err.message : 'Could not load more.')
      })
      .finally(() => {
        if (gen === genRef.current) setLoadingMore(false)
      })
  }, [loader, meta, loadingMore])

  const hasMore = Boolean(meta?.has_more && meta?.next_cursor)

  return { items, meta, error, loadMoreError, loading, loadingMore, hasMore, stale, cachedAt, reload, loadMore }
}
