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

/**
 * Resolves both deeplink forms the backend uses (0003 contract):
 *   ffd://<type>/<id>                  — FCM push data (in-app)
 *   https://<host>/app/<type>/<id>     — App Link / Universal Link (WhatsApp, web)
 */
export function routeForDeeplink(url: string): string | null {
  const match = url.match(/(?:ffd:\/\/|\/app\/)(station|bulletin|advisory)\/(\d+)/)
  if (!match) return null
  return `/${KIND_TO_PATH[match[1]]}/${match[2]}`
}

export interface AuthCallback {
  token?: string
  isNew: boolean
  error?: string
}

/**
 * Parses the social-login return deeplink (0010, Option 1):
 *   ffd://auth/callback?token=<flat>&new=<0|1>
 *   ffd://auth/callback?error=<code>
 * (and the https `/app/auth/callback` App Link variant). Returns null for any
 * other URL so normal deeplink routing is unaffected.
 */
export function parseAuthCallback(url: string): AuthCallback | null {
  if (!/(?:ffd:\/\/|\/app\/)auth\/callback/.test(url)) return null
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
  const params = new URLSearchParams(query)
  return {
    token: params.get('token') ?? undefined,
    isNew: params.get('new') === '1',
    error: params.get('error') ?? undefined,
  }
}
