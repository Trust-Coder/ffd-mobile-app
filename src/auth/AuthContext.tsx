import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { AuthTokenResponse, AuthUser } from '@/types/api'
import { clearStoredUser, clearToken, getStoredUser, getToken, setStoredUser, setToken } from '@/lib/auth'
import { clearCache } from '@/lib/cache'
import { ApiException } from '@/lib/api'
import * as authApi from '@/lib/authApi'
import type { RegisterInput } from '@/lib/authApi'
import { APP_VERSION } from '@/lib/push'
import { getStoredDeviceToken, registerDevice, unregisterDevice } from '@/lib/devices'
import { parseAuthCallback } from '@/lib/deeplink'
import { announce } from '@/lib/events'
import { mockAuth, mockEnabled } from '@/lib/mocks'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  signInWithGoogle: () => Promise<void>
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
        // Re-assert the device↔user link on every authed start, so a link that
        // failed at login time (offline) eventually reconciles.
        await linkDevice()
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
    if (!res?.token || !res.user) {
      throw new ApiException({ code: 'SERVER_ERROR', message: 'Unexpected sign-in response.' })
    }
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

  // Adopt a bare bearer token (from the Google sign-in deeplink) and hydrate the
  // session by fetching /me.
  const adoptToken = useCallback(async (token: string) => {
    await setToken(token)
    const me = await authApi.fetchMe()
    await setStoredUser(me)
    setUser(me)
    await linkDevice()
  }, [])

  // Social login (0010, Option 1): open the backend's Google redirect in an
  // in-app browser; the return arrives as the ffd://auth/callback deeplink,
  // handled by the effect below.
  const signInWithGoogle = useCallback(async () => {
    if (mockEnabled) {
      await applySession(mockAuth.login('demo.google@ffd.pk', 'Google User'))
      return
    }
    const url = authApi.googleSignInUrl()
    if (Capacitor.isNativePlatform()) await Browser.open({ url })
    else window.location.href = url
  }, [applySession])

  // Catch the social-login return deeplink. Owns its own appUrlOpen listener so
  // Google sign-in works regardless of push support; ignores non-auth deeplinks.
  useEffect(() => {
    let handle: PluginListenerHandle | undefined
    let cancelled = false
    const onUrl = async (url: string) => {
      const cb = parseAuthCallback(url)
      if (!cb) return
      void Browser.close().catch(() => {})
      if (cb.error || !cb.token) {
        announce('Google sign-in was cancelled or failed.')
        return
      }
      try {
        await adoptToken(cb.token)
        announce('Signed in with Google.')
      } catch {
        announce('Could not complete Google sign-in. Please try again.')
      }
    }
    void CapApp.addListener('appUrlOpen', (e) => {
      void onUrl(e.url)
    }).then((h) => {
      if (cancelled) void h.remove()
      else handle = h
    })
    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [adoptToken])

  const logout = useCallback(async () => {
    await authApi.logout()
    await clearToken()
    await clearStoredUser()
    await clearCache() // drop cached per-user data (inbox, watchlist, prefs)
    setUser(null)
    await resetDeviceToAnon()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAuthenticated: user !== null, login, register, logout, signInWithGoogle }),
    [user, loading, login, register, logout, signInWithGoogle],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
