import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

/**
 * A stable per-install id + human-ish device name sent as `device_name` on
 * auth/login (Sanctum names the token by it; re-login from the same device_name
 * revokes the previous token server-side).
 */
const INSTALL_KEY = 'ffd.install.id'

async function installId(): Promise<string> {
  const existing = (await Preferences.get({ key: INSTALL_KEY })).value
  if (existing) return existing
  const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now())).slice(0, 8)
  await Preferences.set({ key: INSTALL_KEY, value: id })
  return id
}

export async function getDeviceName(): Promise<string> {
  return `${Capacitor.getPlatform()}-${await installId()}`
}
