import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import PushManager from '@/components/PushManager'
import LiveAnnouncer from '@/components/LiveAnnouncer'
import { APP_REFRESH_EVENT } from '@/lib/events'

const THRESHOLD = 70 // px pull to trigger
const MAX_PULL = 100
const SPINNER_MS = 700

export default function AppShell() {
  const mainRef = useRef<HTMLElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)

  function setPullValue(n: number) {
    pullRef.current = n
    setPull(n)
  }

  // Pull-to-refresh on the scroll container (native non-passive touchmove so we
  // can suppress the browser's overscroll while pulling).
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let startY: number | null = null
    let pulling = false

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0 || refreshingRef.current) {
        startY = null
        return
      }
      startY = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const delta = e.touches[0].clientY - startY
      if (delta > 0 && el.scrollTop <= 0) {
        pulling = true
        const dist = Math.min(MAX_PULL, delta * 0.5)
        setPullValue(dist)
        if (dist > 4) e.preventDefault()
      }
    }
    const onEnd = () => {
      if (pulling && pullRef.current >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        window.dispatchEvent(new Event(APP_REFRESH_EVENT))
        window.setTimeout(() => {
          refreshingRef.current = false
          setRefreshing(false)
          setPullValue(0)
        }, SPINNER_MS)
      } else {
        setPullValue(0)
      }
      startY = null
      pulling = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const indicatorHeight = refreshing ? 44 : pull
  const showSpinner = refreshing || pull > 4

  return (
    <div className="app-shell">
      <PushManager />
      <LiveAnnouncer />
      <main ref={mainRef} className="app-main">
        <div className="ptr-indicator" style={{ height: indicatorHeight }} aria-hidden="true">
          {showSpinner ? (
            <span
              className={'ptr-spinner' + (refreshing ? ' spin' : '')}
              style={{ opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD) }}
            />
          ) : null}
        </div>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
