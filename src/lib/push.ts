import { Capacitor } from '@capacitor/core'
import type { PermissionState } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

/**
 * Thin wrappers around the FCM permission/registration lifecycle. The React glue
 * (listeners, pre-prompt, navigation on tap) lives in components/PushManager.tsx;
 * device-token POSTs live in lib/devices.ts. All no-op on web so the same bundle
 * runs in a browser and the Android WebView.
 */
export const APP_VERSION = '0.1.0'

export function pushSupported(): boolean {
  return Capacitor.isNativePlatform()
}

export async function getPushPermission(): Promise<PermissionState> {
  if (!pushSupported()) return 'denied'
  return (await PushNotifications.checkPermissions()).receive
}

export async function requestPushPermission(): Promise<PermissionState> {
  if (!pushSupported()) return 'denied'
  return (await PushNotifications.requestPermissions()).receive
}

/** Registers with FCM — fires the `registration` listener with the token. */
export async function registerForPush(): Promise<void> {
  if (!pushSupported()) return
  await PushNotifications.register()
}
