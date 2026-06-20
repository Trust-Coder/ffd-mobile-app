import { NavLink } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  icon: string // SVG path data
  end?: boolean
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', end: true, icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { to: '/stations', label: 'Stations', icon: 'M4 9h4v11H4zM10 4h4v16h-4zM16 13h4v7h-4z' },
  {
    to: '/alerts',
    label: 'Alerts',
    icon: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1z',
  },
  { to: '/bulletins', label: 'Bulletins', icon: 'M6 2h9l5 5v15H6zM14 3.5V8h4.5' },
  {
    to: '/account',
    label: 'Account',
    icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z',
  },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d={tab.icon} fill="currentColor" />
          </svg>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
