import { useState } from 'react'
import Icon from '@/components/Icon'
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
      <Icon name="refresh" size={20} className={busy ? 'spin' : ''} />
    </button>
  )
}
