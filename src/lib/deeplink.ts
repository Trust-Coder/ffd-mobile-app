import type { AlertNotification } from '@/types/api'

/**
 * Resolves a notification `data` blob to an in-app route. Prefers explicit id
 * fields (in-app alerts feed, where they're real numbers), then the
 * `ffd://<type>/<id>` deeplink the backend always sends (FCM data values arrive
 * as strings, so the deeplink is the reliable path for push taps).
 */
export function routeForData(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null
  if (typeof data.station_id === 'number') return `/stations/${data.station_id}`
  if (typeof data.bulletin_id === 'number') return `/bulletins/${data.bulletin_id}`
  if (typeof data.advisory_id === 'number') return `/advisories/${data.advisory_id}`
  if (typeof data.deeplink === 'string') return routeForDeeplink(data.deeplink)
  return null
}

export function routeForAlert(alert: AlertNotification): string | null {
  return routeForData(alert.data)
}

const KIND_TO_PATH: Record<string, string> = {
  station: 'stations',
  bulletin: 'bulletins',
  advisory: 'advisories',
}

export function routeForDeeplink(deeplink: string): string | null {
  const match = deeplink.match(/^ffd:\/\/(station|bulletin|advisory)\/(\d+)/)
  if (!match) return null
  return `/${KIND_TO_PATH[match[1]]}/${match[2]}`
}
