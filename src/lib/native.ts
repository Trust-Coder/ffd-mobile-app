import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

type Resolved = 'light' | 'dark'

/**
 * Drive the native status bar to match the active app theme and hide the native
 * splash. Best-effort and a no-op on the web build, so the same bundle runs in a
 * browser and in the Android WebView. Called by ThemeContext on every resolve.
 */
export async function applyNativeTheme(resolved: Resolved, background?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    // Dark theme → light status-bar icons (Style.Dark = light content). The bg is
    // the active palette's surface colour (passed by ThemeContext).
    await StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: background ?? (resolved === 'dark' ? '#070b18' : '#f4f6fb') })
  } catch {
    // Status bar styling is best-effort.
  }

  try {
    await SplashScreen.hide()
  } catch {
    // Splash already hidden / unavailable.
  }
}

/**
 * One-time native setup, called from main.tsx with the initial resolved theme.
 * ThemeContext takes over on subsequent theme/palette changes.
 */
export async function initNative(resolved: Resolved = 'light', background?: string): Promise<void> {
  await applyNativeTheme(resolved, background)
}
