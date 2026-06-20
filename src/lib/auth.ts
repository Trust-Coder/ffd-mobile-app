import { Preferences } from '@capacitor/preferences'
import type { AuthUser } from '@/types/api'

/**
 * Sanctum bearer-token + cached-user storage. Persisted via @capacitor/preferences
 * so it survives app restarts (native: Android SharedPreferences; web: localStorage).
 */
const TOKEN_KEY = 'ffd.auth.token'
const USER_KEY = 'ffd.auth.user'

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

export async function getStoredUser(): Promise<AuthUser | null> {
  const { value } = await Preferences.get({ key: USER_KEY })
  if (!value) return null
  try {
    return JSON.parse(value) as AuthUser
  } catch {
    return null
  }
}

export async function setStoredUser(user: AuthUser): Promise<void> {
  await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) })
}

export async function clearStoredUser(): Promise<void> {
  await Preferences.remove({ key: USER_KEY })
}
