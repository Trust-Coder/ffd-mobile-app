import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { apiRequest } from '@/lib/api'

/**
 * Phase 2 seam — NOT yet wired into the app lifecycle.
 *
 * Requests notification permission, registers with FCM, and POSTs the device
 * token to the backend `/devices` endpoint (see backend/0001). Anonymous tokens
 * are allowed, so this should run on app start BEFORE any login. Token cleanup
 * for uninstalled devices is handled server-side by FcmService (reactive) plus
 * a daily prune.
 */
export async function registerPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return

  await PushNotifications.addListener('registration', async (token) => {
    await apiRequest('/devices', {
      method: 'POST',
      body: {
        fcm_token: token.value,
        platform: Capacitor.getPlatform(),
        app_version: '0.1.0',
      },
    }).catch(() => {
      // Best-effort; retried on the next app launch.
    })
  })

  await PushNotifications.register()
}
