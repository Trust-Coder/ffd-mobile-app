import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pmd.floodupdates',
  appName: 'FFD Flood',
  webDir: 'dist',
  backgroundColor: '#0A4A52',
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden in initNative() once the app shell mounts
      backgroundColor: '#0A4A52',
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
