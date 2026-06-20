import { Preferences } from '@capacitor/preferences'

/**
 * Sanctum bearer-token storage. Persisted via @capacitor/preferences so it
 * survives app restarts (native: Android SharedPreferences; web: localStorage).
 */
const TOKEN_KEY = 'ffd.auth.token'

export async function getToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY })
  return value
}

export async function setToken(token: string): Promise<void> {
  await Preferences.set({ key: TOKEN_KEY, value: token })
}

export async function clearToken(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY })
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getToken()) !== null
}
