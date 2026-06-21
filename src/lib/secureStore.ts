import { Preferences } from '@capacitor/preferences'

/**
 * Secure key-value seam for sensitive values (the Sanctum bearer token + cached
 * user). The single swap point to harden at-rest storage.
 *
 * Currently backed by @capacitor/preferences — app-private Android
 * SharedPreferences (sandboxed) and excluded from device backup via
 * `allowBackup="false"`. To move to Android Keystore / EncryptedSharedPreferences
 * (audit M1), swap the three functions below to a plugin such as
 * `capacitor-secure-storage-plugin` — no caller changes needed.
 */
export async function secureGet(key: string): Promise<string | null> {
  return (await Preferences.get({ key })).value
}

export async function secureSet(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value })
}

export async function secureRemove(key: string): Promise<void> {
  await Preferences.remove({ key })
}
