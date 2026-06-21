import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Preferences } from '@capacitor/preferences'
import { applyNativeTheme } from '@/lib/native'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'ffd.theme'
// @capacitor/preferences prefixes its localStorage keys with the group name
// ('CapacitorStorage' by default). The inline no-flash <head> script reads the
// same key so first paint matches the persisted override.
const LS_KEY = `CapacitorStorage.${STORAGE_KEY}`

interface ThemeValue {
  /** User's stored preference (or 'system' to follow the OS). */
  mode: ThemeMode
  /** The effective theme after resolving 'system' against the OS preference. */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeValue>({
  mode: 'system',
  resolved: 'light',
  setMode: () => {},
})

const META_COLOR: Record<ResolvedTheme, string> = {
  light: '#f4f6fb',
  dark: '#070b18',
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

/** Read the persisted override synchronously from localStorage (the Capacitor
 *  Preferences web backing) so first paint matches the inline <head> script. */
function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage unavailable (e.g. SSR / locked-down WebView) — fall back.
  }
  return 'system'
}

function applyResolved(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', META_COLOR[resolved])
  void applyNativeTheme(resolved)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode()))

  // Apply on mount + whenever the effective theme changes.
  useEffect(() => {
    applyResolved(resolved)
  }, [resolved])

  // When following the system, track the media query live.
  useEffect(() => {
    if (mode !== 'system') {
      setResolved(mode)
      return
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setResolved(mql.matches ? 'dark' : 'light')
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    // Persist (or clear) via Preferences — its web backing is localStorage, which
    // the inline <head> script reads to prevent a flash on next launch.
    void (next === 'system'
      ? Preferences.remove({ key: STORAGE_KEY })
      : Preferences.set({ key: STORAGE_KEY, value: next }))
  }, [])

  const value = useMemo<ThemeValue>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}
