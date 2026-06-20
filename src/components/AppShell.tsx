import { Outlet } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import PushManager from '@/components/PushManager'

export default function AppShell() {
  return (
    <div className="app-shell">
      <PushManager />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
