import { apiRequest, cachedGet } from '@/lib/api'
import type { CachedResult, RequestOptions } from '@/lib/api'
import type {
  Advisory,
  AlertDetail,
  AlertNotification,
  Bulletin,
  FlowLatest,
  NotificationPreferences,
  Paginated,
  Station,
  StationDetail,
  WatchlistStation,
} from '@/types/api'
import { statusFromLoose } from '@/lib/severity'
import { clearCacheKey } from '@/lib/cache'
import { mockEnabled, mocks } from '@/lib/mocks'

const WATCHLIST_CACHE_KEY = 'me.stations'

/**
 * Typed wrappers over the FFD public API (`/api/app/v1`, backend/0001 §A — shipped).
 * Each read is offline-tolerant via cachedGet. List endpoints tolerate either a
 * bare array (curated lists: flows/stations) or a `{ items, meta }` page
 * (bulletins/advisories/alerts).
 */

export interface BulletinFilter {
  type?: 'bulletin' | 'advisory' | 'all'
  severity?: string // 6-level enum (0006); omit for all
  since?: string
}

function ok<T>(data: T): CachedResult<T> {
  return { data, stale: false }
}

function unwrapList<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.items
}

async function getList<T>(path: string, cacheKey: string, opts: RequestOptions = {}): Promise<CachedResult<T[]>> {
  const res = await cachedGet<T[] | Paginated<T>>(path, cacheKey, opts)
  return { ...res, data: unwrapList(res.data) }
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function pageUrl(path: string, cursor: string | null): string {
  if (!cursor) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}cursor=${encodeURIComponent(cursor)}`
}

/** A page of a cursor-paginated list. Page one (cursor null) is offline-tolerant. */
async function getPage<T>(
  path: string,
  cacheKey: string,
  cursor: string | null,
  opts: RequestOptions = {},
): Promise<CachedResult<Paginated<T>>> {
  const url = pageUrl(path, cursor)
  if (cursor) {
    const data = await apiRequest<Paginated<T>>(url, { ...opts, method: 'GET' })
    return { data, stale: false }
  }
  return cachedGet<Paginated<T>>(url, cacheKey, opts)
}

export function getFlowsLatest(): Promise<CachedResult<FlowLatest[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.flowsLatest()))
  return getList<FlowLatest>('/flows/latest', 'flows.latest')
}

export function getStations(): Promise<CachedResult<Station[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.stations()))
  return getList<Station>('/stations', 'stations.list')
}

/** Station detail with a 7-day discharge series for the chart (backend caps hours at 168). */
export function getStation(id: number): Promise<CachedResult<StationDetail>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.station(id)))
  return cachedGet<StationDetail>(`/stations/${id}?hours=168`, `stations.${id}`)
}

export function getActiveAdvisory(): Promise<CachedResult<Advisory | null>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.activeAdvisory()))
  return cachedGet<Advisory | null>('/advisory/active', 'advisory.active')
}

/** First page only — used for the Home "latest bulletin" teaser. */
export function getBulletins(filter: BulletinFilter = {}): Promise<CachedResult<Bulletin[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.bulletins(filter.severity)))
  const qs = buildQuery({ type: filter.type, severity: filter.severity, since: filter.since })
  return getList<Bulletin>(`/bulletins${qs}`, `bulletins.list${qs}`)
}

/** Paginated bulletins feed for the Bulletins screen (with Load more). */
export function getBulletinsPage(filter: BulletinFilter, cursor: string | null): Promise<CachedResult<Paginated<Bulletin>>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.bulletinsPage(filter.severity)))
  const qs = buildQuery({ type: filter.type, severity: filter.severity, since: filter.since })
  return getPage<Bulletin>(`/bulletins${qs}`, `bulletins.page${qs}`, cursor)
}

export function getBulletin(id: number): Promise<CachedResult<Bulletin>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.publication(id)))
  return cachedGet<Bulletin>(`/bulletins/${id}`, `bulletins.${id}`)
}

// NOTE: the /advisories history list endpoint exists but has no screen yet — add
// getAdvisories() back when an "Advisory history" view lands (Phase 3+).

export function getAdvisory(id: number): Promise<CachedResult<Advisory>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.publication(id)))
  return cachedGet<Advisory>(`/advisories/${id}`, `advisories.${id}`)
}

/** Public alerts feed, paginated. */
export function getAlertsPage(cursor: string | null): Promise<CachedResult<Paginated<AlertNotification>>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.alertsPage()))
  return getPage<AlertNotification>('/alerts', 'alerts.page', cursor)
}

/** A single CMS alert with its rich HTML body (0009). Public; broadcast+sent only, else 404. */
export function getAlert(id: number): Promise<CachedResult<AlertDetail>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.alertDetail(id)))
  return cachedGet<AlertDetail>(`/alerts/${id}`, `alerts.${id}`)
}

// ── Authenticated (§D inbox / §E watchlist + preferences) ──────────────────

/** Authed inbox, paginated. Page meta carries `unread_count` (spans all pages). */
export function getInboxPage(cursor: string | null): Promise<CachedResult<Paginated<AlertNotification>>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.inboxPage()))
  return getPage<AlertNotification>('/me/alerts', 'me.alerts.page', cursor, { auth: true })
}

export async function markAlertRead(id: number): Promise<void> {
  if (mockEnabled) {
    mocks.markRead(id)
    return
  }
  await apiRequest(`/me/alerts/${id}/read`, { method: 'POST', auth: true })
  await clearCacheKey('me.alerts.page') // don't serve a stale "unread" page offline
}

/** Unread count for the nav badge — reads the inbox page's authoritative meta.unread_count. */
export async function getUnreadCount(): Promise<number> {
  const { data } = await getInboxPage(null)
  return data.meta.unread_count ?? data.items.filter((a) => a.read_at == null).length
}

export function getWatchlist(): Promise<CachedResult<WatchlistStation[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.watchlist()))
  return getList<WatchlistStation>('/me/stations', WATCHLIST_CACHE_KEY, { auth: true })
}

export async function addToWatchlist(stationId: number): Promise<void> {
  if (mockEnabled) {
    mocks.addWatch(stationId)
    return
  }
  await apiRequest(`/me/stations/${stationId}`, { method: 'POST', auth: true })
  await clearCacheKey(WATCHLIST_CACHE_KEY) // avoid serving a stale watchlist offline
}

export async function removeFromWatchlist(stationId: number): Promise<void> {
  if (mockEnabled) {
    mocks.removeWatch(stationId)
    return
  }
  await apiRequest(`/me/stations/${stationId}`, { method: 'DELETE', auth: true })
  await clearCacheKey(WATCHLIST_CACHE_KEY)
}

export async function setStationAlert(stationId: number, enabled: boolean): Promise<void> {
  if (mockEnabled) {
    mocks.setAlert(stationId, enabled)
    return
  }
  await apiRequest(`/me/stations/${stationId}`, { method: 'PUT', auth: true, body: { alert_enabled: enabled } })
  await clearCacheKey(WATCHLIST_CACHE_KEY)
}

export async function getPreferences(): Promise<CachedResult<NotificationPreferences>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.preferences()))
  const res = await cachedGet<NotificationPreferences>('/me/preferences', 'me.preferences', { auth: true })
  // 0004 pinned min_severity UPPERCASE; statusFromLoose is a harmless guard against drift.
  return { ...res, data: { ...res.data, min_severity: statusFromLoose(res.data.min_severity) } }
}

export async function updatePreferences(prefs: NotificationPreferences): Promise<void> {
  if (mockEnabled) {
    mocks.setPreferences(prefs)
    return
  }
  await apiRequest('/me/preferences', { method: 'PUT', auth: true, body: prefs })
}
