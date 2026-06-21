import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Preferences } from '@capacitor/preferences'
import { applyNativeTheme } from '@/lib/native'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type Palette = 'a' | 'b' | 'c'

const THEME_KEY = 'ffd.theme'
const PALETTE_KEY = 'ffd.palette'
// @capacitor/preferences prefixes its localStorage keys with the group name
// ('CapacitorStorage' by default). The inline no-flash <head> script reads the
// same keys so first paint matches the persisted overrides.
const THEME_LS = `CapacitorStorage.${THEME_KEY}`
const PALETTE_LS = `CapacitorStorage.${PALETTE_KEY}`

interface ThemeValue {
  /** User's stored theme preference (or 'system' to follow the OS). */
  mode: ThemeMode
  /** The effective theme after resolving 'system' against the OS preference. */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  /** Selected colour palette (a=Teal, b=Indigo, c=Slate). Default 'b'. */
  palette: Palette
  setPalette: (palette: Palette) => void
}

const ThemeContext = createContext<ThemeValue>({
  mode: 'system',
  resolved: 'light',
  setMode: () => {},
  palette: 'b',
  setPalette: () => {},
})

// The status-bar / meta theme-color = the active palette's surface colour.
const PALETTE_SURFACE: Record<Palette, Record<ResolvedTheme, string>> = {
  a: { light: '#f4f2ee', dark: '#0c1417' },
  b: { light: '#f4f6fb', dark: '#070b18' },
  c: { light: '#eef1f5', dark: '#0a0e14' },
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_LS)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage unavailable — fall back.
  }
  return 'system'
}

function readStoredPalette(): Palette {
  try {
    const raw = localStorage.getItem(PALETTE_LS)
    if (raw === 'a' || raw === 'b' || raw === 'c') return raw
  } catch {
    // ignore
  }
  return 'b'
}

function applyTheme(palette: Palette, resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.setAttribute('data-palette', palette)
  const color = PALETTE_SURFACE[palette][resolved]
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
  void applyNativeTheme(resolved, color)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode()))
  const [palette, setPaletteState] = useState<Palette>(() => readStoredPalette())

  // Apply on mount + whenever the palette or effective theme changes.
  useEffect(() => {
    applyTheme(palette, resolved)
  }, [palette, resolved])

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
    void (next === 'system'
      ? Preferences.remove({ key: THEME_KEY })
      : Preferences.set({ key: THEME_KEY, value: next }))
  }, [])

  const setPalette = useCallback((next: Palette) => {
    setPaletteState(next)
    void Preferences.set({ key: PALETTE_KEY, value: next })
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ mode, resolved, setMode, palette, setPalette }),
    [mode, resolved, setMode, palette, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}
