import { NavLink } from 'react-router-dom'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { useUnread } from '@/state/UnreadContext'

interface Tab {
  to: string
  label: string
  icon: IconName
  end?: boolean
  badge?: boolean
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', end: true, icon: 'home' },
  { to: '/stations', label: 'Stations', icon: 'stations' },
  { to: '/alerts', label: 'Alerts', badge: true, icon: 'alerts' },
  { to: '/bulletins', label: 'Bulletins', icon: 'bulletins' },
  { to: '/account', label: 'Account', icon: 'account' },
]

export default function BottomNav() {
  const { count } = useUnread()

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-icon-wrap">
            <Icon name={tab.icon} size={22} />
            {tab.badge && count > 0 ? (
              <span className="nav-badge" aria-label={`${count} unread`}>
                <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
              </span>
            ) : null}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
