import { cachedGet } from '@/lib/api'
import type { CachedResult } from '@/lib/api'
import type {
  Advisory,
  AlertNotification,
  Bulletin,
  Paginated,
  StationDetail,
  StationSummary,
} from '@/types/api'
import { mockEnabled, mocks } from '@/lib/mocks'

/**
 * Typed wrappers over the FFD public API (backend/0001 §A). Each read is
 * offline-tolerant via cachedGet. List endpoints tolerate either a bare array
 * or a `{ items, meta }` envelope until the backend pins the shape.
 */

export interface BulletinFilter {
  river?: string
  severity?: string
  since?: string
}

function ok<T>(data: T): CachedResult<T> {
  return { data, stale: false }
}

function unwrapList<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.items
}

async function getList<T>(path: string, cacheKey: string): Promise<CachedResult<T[]>> {
  const res = await cachedGet<T[] | Paginated<T>>(path, cacheKey)
  return { ...res, data: unwrapList(res.data) }
}

function buildQuery(filter: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function getFlowsLatest(): Promise<CachedResult<StationSummary[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.flowsLatest()))
  return getList<StationSummary>('/flows/latest', 'flows.latest')
}

export function getStations(): Promise<CachedResult<StationSummary[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.stations()))
  return getList<StationSummary>('/stations', 'stations.list')
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
  if (mockEnabled) return Promise.resolve(ok(mocks.bulletins(filter)))
  const qs = buildQuery({ river: filter.river, severity: filter.severity, since: filter.since })
  return getList<Bulletin>(`/bulletins${qs}`, `bulletins.list${qs}`)
}

export function getBulletin(id: number): Promise<CachedResult<Bulletin>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.bulletin(id)))
  return cachedGet<Bulletin>(`/bulletins/${id}`, `bulletins.${id}`)
}

export function getAlerts(): Promise<CachedResult<AlertNotification[]>> {
  if (mockEnabled) return Promise.resolve(ok(mocks.alerts()))
  return getList<AlertNotification>('/alerts', 'alerts.feed')
}
