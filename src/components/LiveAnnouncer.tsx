import { useEffect, useState } from 'react'
import { ANNOUNCE_EVENT } from '@/lib/events'

/**
 * Visually-hidden ARIA live region. Other code calls `announce(message)`
 * (lib/events) to speak status to screen-reader users — new flood alerts,
 * refresh start/finish, etc. Assertive because flood messages are time-critical.
 */
export default function LiveAnnouncer() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timer: number | undefined
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      if (!detail?.message) return
      setMessage(detail.message)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(''), 4000)
    }
    window.addEventListener(ANNOUNCE_EVENT, onAnnounce)
    return () => {
      window.removeEventListener(ANNOUNCE_EVENT, onAnnounce)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
      {message}
    </div>
  )
}
