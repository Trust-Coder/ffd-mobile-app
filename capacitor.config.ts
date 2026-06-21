import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pmd.floodupdates',
  appName: 'FFD Lahore',
  webDir: 'dist',
  backgroundColor: '#070b18',
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden in initNative() once the app shell mounts
      backgroundColor: '#070b18', // navy "Deep Institutional" — matches LaunchScreen
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
