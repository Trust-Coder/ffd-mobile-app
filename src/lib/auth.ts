import type { AuthUser } from '@/types/api'
import { secureGet, secureRemove, secureSet } from '@/lib/secureStore'

/**
 * Sanctum bearer-token + cached-user storage, routed through the secure-store
 * seam (lib/secureStore) so the at-rest backing can be hardened in one place.
 */
const TOKEN_KEY = 'ffd.auth.token'
const USER_KEY = 'ffd.auth.user'

export async function getToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await secureSet(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await secureRemove(TOKEN_KEY)
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getToken()) !== null
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const value = await secureGet(USER_KEY)
  if (!value) return null
  try {
    return JSON.parse(value) as AuthUser
  } catch {
    return null
  }
}

export async function setStoredUser(user: AuthUser): Promise<void> {
  await secureSet(USER_KEY, JSON.stringify(user))
}

export async function clearStoredUser(): Promise<void> {
  await secureRemove(USER_KEY)
}
