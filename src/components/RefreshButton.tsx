import { useState } from 'react'
import { announce } from '@/lib/events'
import { dispatchRefresh } from '@/lib/refresh'

/** Keyboard/switch-accessible equivalent of pull-to-refresh. */
export default function RefreshButton() {
  const [busy, setBusy] = useState(false)

  async function onRefresh() {
    if (busy) return
    setBusy(true)
    announce('Refreshing flood data')
    await dispatchRefresh()
    setBusy(false)
    announce('Flood data updated')
  }

  return (
    <button type="button" className="refresh-btn" onClick={onRefresh} disabled={busy} aria-label="Refresh">
      <svg viewBox="0 0 24 24" width="20" height="20" className={busy ? 'spin' : ''} aria-hidden="true">
        <path
          d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"
          fill="currentColor"
        />
      </svg>
    </button>
  )
}
