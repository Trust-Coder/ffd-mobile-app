import { useEffect, useState } from 'react'
import { PUSH_RECEIVED_EVENT } from '@/lib/events'

/**
 * Visually-hidden ARIA live region so screen-reader users are told when a flood
 * alert arrives in the foreground (assertive — these are time-critical).
 */
export default function LiveAnnouncer() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timer: number | undefined
    const onPush = () => {
      setMessage('New flood alert received. Open the Alerts tab to view it.')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(''), 4000)
    }
    window.addEventListener(PUSH_RECEIVED_EVENT, onPush)
    return () => {
      window.removeEventListener(PUSH_RECEIVED_EVENT, onPush)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
      {message}
    </div>
  )
}
