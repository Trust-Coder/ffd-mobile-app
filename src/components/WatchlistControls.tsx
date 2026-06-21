import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/Icon'
import Switch from '@/components/Switch'
import { useAuth } from '@/auth/AuthContext'
import { addToWatchlist, getWatchlist, removeFromWatchlist, setStationAlert } from '@/lib/endpoints'

/**
 * Station-detail watchlist + per-station alert controls. Anonymous users get a
 * sign-in CTA; signed-in users can add/remove and toggle alerts.
 */
export default function WatchlistControls({ stationId }: { stationId: number }) {
  const { isAuthenticated } = useAuth()
  const [watched, setWatched] = useState<boolean | null>(isAuthenticated ? null : false)
  const [alertOn, setAlertOn] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setWatched(false)
      return
    }
    let active = true
    void getWatchlist()
      .then((res) => {
        if (!active) return
        const item = res.data.find((s) => s.id === stationId)
        setWatched(Boolean(item))
        if (item) setAlertOn(item.alert_enabled)
      })
      .catch(() => {
        if (active) setWatched(false)
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, stationId])

  if (!isAuthenticated) {
    return (
      <>
        <Link to="/account" className="btn-primary">
          <Icon name="star" size={18} />
          Add to My Stations
        </Link>
        <p className="hint-text">Sign in to add this station to your watchlist and get per-station flood alerts.</p>
      </>
    )
  }

  async function toggleWatch() {
    setBusy(true)
    const next = !watched
    setWatched(next)
    try {
      if (next) {
        await addToWatchlist(stationId)
        setAlertOn(true)
      } else {
        await removeFromWatchlist(stationId)
      }
    } catch {
      setWatched(!next) // revert
    } finally {
      setBusy(false)
    }
  }

  async function toggleAlert(value: boolean) {
    setAlertOn(value)
    try {
      await setStationAlert(stationId, value)
    } catch {
      setAlertOn(!value)
    }
  }

  if (watched === null) {
    return <div className="hint-text">Checking your watchlist…</div>
  }

  return (
    <section className="watch-controls">
      <button type="button" className={watched ? 'btn-ghost block' : 'btn-primary'} onClick={toggleWatch} disabled={busy}>
        <Icon name={watched ? 'check' : 'star'} size={18} />
        {watched ? 'In My Stations — tap to remove' : 'Add to My Stations'}
      </button>
      {watched ? (
        <div className="watch-alert-row">
          <span>Alert me when this station floods</span>
          <Switch checked={alertOn} onChange={toggleAlert} ariaLabel="Per-station flood alerts" />
        </div>
      ) : null}
    </section>
  )
}
