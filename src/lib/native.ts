import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * One-time native setup, called from main.tsx. No-ops on the web build so the
 * same bundle runs in a browser and in the Android WebView.
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#0A4A52' })
  } catch {
    // Status bar styling is best-effort.
  }

  try {
    await SplashScreen.hide()
  } catch {
    // Splash already hidden / unavailable.
  }
}
