import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import type { AuthTokenResponse, AuthUser } from '@/types/api'
import { clearStoredUser, clearToken, getStoredUser, getToken, setStoredUser, setToken } from '@/lib/auth'
import { clearCache } from '@/lib/cache'
import * as authApi from '@/lib/authApi'
import type { RegisterInput } from '@/lib/authApi'
import { APP_VERSION } from '@/lib/push'
import { getStoredDeviceToken, registerDevice, unregisterDevice } from '@/lib/devices'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Re-POST the existing device token now a bearer is stored → backend links user_id. */
async function linkDevice(): Promise<void> {
  const token = await getStoredDeviceToken()
  if (token) await registerDevice(token, Capacitor.getPlatform(), APP_VERSION).catch(() => {})
}

/** On logout: delete the linked device row, then re-register it anonymously so the
 *  device keeps receiving broadcast pushes (unlinked). */
async function resetDeviceToAnon(): Promise<void> {
  const token = await getStoredDeviceToken()
  await unregisterDevice()
  if (token) await registerDevice(token, Capacitor.getPlatform(), APP_VERSION).catch(() => {})
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Boot: restore a stored session, then refresh it against /me.
  useEffect(() => {
    let active = true
    async function boot() {
      if (!(await getToken())) {
        if (active) setLoading(false)
        return
      }
      const cached = await getStoredUser()
      if (active && cached) setUser(cached)
      try {
        const fresh = await authApi.fetchMe()
        if (!active) return
        setUser(fresh)
        await setStoredUser(fresh)
      } catch {
        await clearToken()
        await clearStoredUser()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void boot()
    return () => {
      active = false
    }
  }, [])

  const applySession = useCallback(async (res: AuthTokenResponse) => {
    await setToken(res.token)
    await setStoredUser(res.user)
    setUser(res.user)
    await linkDevice()
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      await applySession(await authApi.login(email, password))
    },
    [applySession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      await applySession(await authApi.register(input))
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    await clearToken()
    await clearStoredUser()
    await clearCache() // drop cached per-user data (inbox, watchlist, prefs)
    setUser(null)
    await resetDeviceToAnon()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAuthenticated: user !== null, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
