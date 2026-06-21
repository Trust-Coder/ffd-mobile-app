import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AuthProvider } from '@/auth/AuthContext'
import { UnreadProvider } from '@/state/UnreadContext'
import LaunchScreen from '@/components/SplashScreen'
import AppShell from '@/components/AppShell'
import HomeScreen from '@/screens/HomeScreen'
import StationsScreen from '@/screens/StationsScreen'
import StationDetailScreen from '@/screens/StationDetailScreen'
import AlertsScreen from '@/screens/AlertsScreen'
import AlertDetailScreen from '@/screens/AlertDetailScreen'
import BulletinsScreen from '@/screens/BulletinsScreen'
import BulletinDetailScreen from '@/screens/BulletinDetailScreen'
import AdvisoryDetailScreen from '@/screens/AdvisoryDetailScreen'
import AccountScreen from '@/screens/AccountScreen'
import WatchlistScreen from '@/screens/WatchlistScreen'
import PreferencesScreen from '@/screens/PreferencesScreen'

// HashRouter keeps client routing reliable inside the native WebView (no server
// rewrites needed). Notification deep links are handled programmatically (PushManager).
export default function App() {
  // Cold-start launch overlay: shown once over the mounted app, then unmounts.
  const [showLaunch, setShowLaunch] = useState(true)

  return (
    <ThemeProvider>
      <AuthProvider>
        <UnreadProvider>
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomeScreen />} />
                <Route path="stations" element={<StationsScreen />} />
                <Route path="stations/:id" element={<StationDetailScreen />} />
                <Route path="alerts" element={<AlertsScreen />} />
                <Route path="alerts/:id" element={<AlertDetailScreen />} />
                <Route path="bulletins" element={<BulletinsScreen />} />
                <Route path="bulletins/:id" element={<BulletinDetailScreen />} />
                <Route path="advisories/:id" element={<AdvisoryDetailScreen />} />
                <Route path="account" element={<AccountScreen />} />
                <Route path="watchlist" element={<WatchlistScreen />} />
                <Route path="preferences" element={<PreferencesScreen />} />
              </Route>
            </Routes>
          </HashRouter>
        </UnreadProvider>
      </AuthProvider>
      {showLaunch ? <LaunchScreen onDone={() => setShowLaunch(false)} /> : null}
    </ThemeProvider>
  )
}
