import { apiRequest, cachedGet } from '@/lib/api'
import type { CachedResult, RequestOptions } from '@/lib/api'
import type {
  Advisory,
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

export function getFlowsLatest(): Promise<CachedResult<FlowLatest[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.flowsLatest()))
  return getList<FlowLatest>('/flows/latest', 'flows.latest')
}

export function getStations(): Promise<CachedResult<Station[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.stations()))
  return getList<Station>('/stations', 'stations.list')
}

export function getStation(id: number): Promise<CachedResult<StationDetail>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.station(id)))
  return cachedGet<StationDetail>(`/stations/${id}`, `stations.${id}`)
}

export function getActiveAdvisory(): Promise<CachedResult<Advisory | null>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.activeAdvisory()))
  return cachedGet<Advisory | null>('/advisory/active', 'advisory.active')
}

export function getBulletins(filter: BulletinFilter = {}): Promise<CachedResult<Bulletin[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.bulletins()))
  const qs = buildQuery({ type: filter.type, since: filter.since })
  return getList<Bulletin>(`/bulletins${qs}`, `bulletins.list${qs}`)
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

export function getAlerts(): Promise<CachedResult<AlertNotification[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.alerts()))
  return getList<AlertNotification>('/alerts', 'alerts.feed')
}

// ── Authenticated (§D inbox / §E watchlist + preferences) ──────────────────

export function getInbox(): Promise<CachedResult<AlertNotification[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.inbox()))
  return getList<AlertNotification>('/me/alerts', 'me.alerts', { auth: true })
}

export async function markAlertRead(id: number): Promise<void> {
  if (mockEnabled) {
    mocks.markRead(id)
    return
  }
  await apiRequest(`/me/alerts/${id}/read`, { method: 'POST', auth: true })
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
  // Tolerate either casing of min_severity until backend/0004 pins it (see §E Q7).
  return { ...res, data: { ...res.data, min_severity: statusFromLoose(res.data.min_severity) } }
}

export async function updatePreferences(prefs: NotificationPreferences): Promise<void> {
  if (mockEnabled) {
    mocks.setPreferences(prefs)
    return
  }
  await apiRequest('/me/preferences', { method: 'PUT', auth: true, body: prefs })
}
