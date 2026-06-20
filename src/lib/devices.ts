import { Preferences } from '@capacitor/preferences'
import { apiRequest } from '@/lib/api'

/**
 * Device registration against backend §C (`/api/app/v1/devices`). Anonymous
 * tokens are allowed; `auth: true` attaches the bearer only if one is stored, so
 * the backend links the device to the user once they sign in (Phase 3).
 */
const TOKEN_KEY = 'ffd.device.token'
const HEARTBEAT_KEY = 'ffd.device.heartbeat_at'
const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000 // throttle resumes to ~once/hour

export async function registerDevice(fcmToken: string, platform: string, appVersion: string): Promise<void> {
  await apiRequest('/devices', {
    method: 'POST',
    auth: true,
    body: { fcm_token: fcmToken, platform, app_version: appVersion },
  })
  await Preferences.set({ key: TOKEN_KEY, value: fcmToken })
  await markHeartbeat()
}

/** Bump last_seen_at, throttled locally so resume events don't spam the server. */
export async function heartbeat(force = false): Promise<void> {
  const token = (await Preferences.get({ key: TOKEN_KEY })).value
  if (!token) return
  if (!force) {
    const last = (await Preferences.get({ key: HEARTBEAT_KEY })).value
    if (last && Date.now() - Number(last) < HEARTBEAT_INTERVAL_MS) return
  }
  await apiRequest('/devices/heartbeat', { method: 'POST', auth: true, body: { fcm_token: token } })
  await markHeartbeat()
}

/** Explicit unsubscribe (e.g. on sign-out). Best-effort — clears the local token regardless. */
export async function unregisterDevice(): Promise<void> {
  const token = (await Preferences.get({ key: TOKEN_KEY })).value
  if (token) {
    await apiRequest('/devices', { method: 'DELETE', auth: true, body: { fcm_token: token } }).catch(() => {})
  }
  await Preferences.remove({ key: TOKEN_KEY })
  await Preferences.remove({ key: HEARTBEAT_KEY })
}

export async function getStoredDeviceToken(): Promise<string | null> {
  return (await Preferences.get({ key: TOKEN_KEY })).value
}

async function markHeartbeat(): Promise<void> {
  await Preferences.set({ key: HEARTBEAT_KEY, value: String(Date.now()) })
}
