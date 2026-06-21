import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getUnreadCount } from '@/lib/endpoints'
import { PUSH_RECEIVED_EVENT } from '@/lib/events'

interface UnreadValue {
  count: number
  refresh: () => void
  /** Local decrement after a single mark-read — avoids refetching the inbox per tap. */
  decrement: () => void
  /** Set the count authoritatively from a fetched inbox page (badge↔list consistency). */
  setCount: (n: number) => void
}

const UnreadContext = createContext<UnreadValue>({
  count: 0,
  refresh: () => {},
  decrement: () => {},
  setCount: () => {},
})

/** Tracks the unread inbox count for the Alerts nav badge. Refreshes on auth
 *  change and on every foreground push; AlertsScreen calls refresh() after a
 *  mark-read so the badge stays in sync. */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      setCount(0)
      return
    }
    void getUnreadCount()
      .then(setCount)
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    window.addEventListener(PUSH_RECEIVED_EVENT, refresh)
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, refresh)
  }, [refresh])

  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), [])
  const setExact = useCallback((n: number) => setCount(Math.max(0, n)), [])

  const value = useMemo(
    () => ({ count, refresh, decrement, setCount: setExact }),
    [count, refresh, decrement, setExact],
  )
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnread(): UnreadValue {
  return useContext(UnreadContext)
}
