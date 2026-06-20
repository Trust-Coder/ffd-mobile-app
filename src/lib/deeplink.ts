import type { AlertNotification } from '@/types/api'

/**
 * Resolves an alert/notification to an in-app route. Prefers explicit id fields,
 * falling back to the `ffd://<type>/<id>` deeplink the backend sends. Reused for
 * notification taps in Phase 2.
 */
export function routeForAlert(alert: AlertNotification): string | null {
  const data = alert.data ?? {}
  if (typeof data.station_id === 'number') return `/stations/${data.station_id}`
  if (typeof data.bulletin_id === 'number') return `/bulletins/${data.bulletin_id}`
  if (typeof data.advisory_id === 'number') return `/advisories/${data.advisory_id}`
  if (typeof data.deeplink === 'string') return routeForDeeplink(data.deeplink)
  return null
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
