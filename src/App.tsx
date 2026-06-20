import { HashRouter, Routes, Route } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import HomeScreen from '@/screens/HomeScreen'
import StationsScreen from '@/screens/StationsScreen'
import AlertsScreen from '@/screens/AlertsScreen'
import BulletinsScreen from '@/screens/BulletinsScreen'
import AccountScreen from '@/screens/AccountScreen'

// HashRouter keeps client routing reliable inside the native WebView (no server
// rewrites needed). Notification deep links are handled programmatically (Phase 2).
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="stations" element={<StationsScreen />} />
          <Route path="alerts" element={<AlertsScreen />} />
          <Route path="bulletins" element={<BulletinsScreen />} />
          <Route path="account" element={<AccountScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
