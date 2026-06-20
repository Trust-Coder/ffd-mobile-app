import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'
import { apiRequest } from '@/lib/api'
import { APP_VERSION } from '@/lib/push'

/**
 * Device registration against backend §C (`/api/app/v1/devices`, shipped — see
 * backend/0002-...response.md). Anonymous tokens are allowed; `auth: true`
 * attaches the bearer only if one is stored, so the backend links the device to
 * the user once they sign in (Phase 3). Anonymous re-register never unlinks.
 */
const TOKEN_KEY = 'ffd.device.token'
const DEVICE_ID_KEY = 'ffd.device.id'
const HEARTBEAT_KEY = 'ffd.device.heartbeat_at'
const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000 // throttle resumes to ~once/hour

interface RegisterResponse {
  registered: boolean
  device_id?: number
  active?: boolean
}
interface HeartbeatResponse {
  updated: boolean
}

export async function registerDevice(fcmToken: string, platform: string, appVersion: string): Promise<void> {
  // Persist the token BEFORE the network call so a failed POST (e.g. offline at
  // logout/login) never leaves the device tokenless — heartbeat/next launch retry.
  await Preferences.set({ key: TOKEN_KEY, value: fcmToken })
  const data = await apiRequest<RegisterResponse>('/devices', {
    method: 'POST',
    auth: true,
    body: { fcm_token: fcmToken, platform, app_version: appVersion },
  })
  if (typeof data?.device_id === 'number') {
    // Stored for §D read-state (notification_reads.device_id).
    await Preferences.set({ key: DEVICE_ID_KEY, value: String(data.device_id) })
  }
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
  const data = await apiRequest<HeartbeatResponse>('/devices/heartbeat', {
    method: 'POST',
    auth: true,
    body: { fcm_token: token },
  })
  if (data && data.updated === false) {
    // Token unknown/pruned server-side — re-register it (§C heartbeat contract).
    await registerDevice(token, Capacitor.getPlatform(), APP_VERSION)
    return
  }
  await markHeartbeat()
}

/** Explicit unsubscribe (e.g. on sign-out). Best-effort — clears local state regardless. */
export async function unregisterDevice(): Promise<void> {
  const token = (await Preferences.get({ key: TOKEN_KEY })).value
  if (token) {
    await apiRequest('/devices', { method: 'DELETE', auth: true, body: { fcm_token: token } }).catch(() => {})
  }
  await Preferences.remove({ key: TOKEN_KEY })
  await Preferences.remove({ key: DEVICE_ID_KEY })
  await Preferences.remove({ key: HEARTBEAT_KEY })
}

export async function getStoredDeviceToken(): Promise<string | null> {
  return (await Preferences.get({ key: TOKEN_KEY })).value
}

export async function getStoredDeviceId(): Promise<number | null> {
  const value = (await Preferences.get({ key: DEVICE_ID_KEY })).value
  return value ? Number(value) : null
}

async function markHeartbeat(): Promise<void> {
  await Preferences.set({ key: HEARTBEAT_KEY, value: String(Date.now()) })
}
