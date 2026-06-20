import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import Switch from '@/components/Switch'
import { SeverityChip, StatusDot, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { ApiException } from '@/lib/api'
import { getWatchlist, removeFromWatchlist, setStationAlert } from '@/lib/endpoints'
import type { WatchlistStation } from '@/types/api'
import { fmtCusecs } from '@/lib/format'

export default function WatchlistScreen() {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<WatchlistStation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWatchlist()
      setItems(res.data)
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Could not load your stations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) void load()
    else setLoading(false)
  }, [isAuthenticated, load])

  async function toggleAlert(id: number, enabled: boolean) {
    setItems((prev) => prev?.map((s) => (s.id === id ? { ...s, alert_enabled: enabled } : s)) ?? prev)
    try {
      await setStationAlert(id, enabled)
    } catch {
      void load() // revert to server truth
    }
  }

  async function remove(id: number) {
    setItems((prev) => prev?.filter((s) => s.id !== id) ?? prev)
    try {
      await removeFromWatchlist(id)
    } catch {
      void load()
    }
  }

  return (
    <div className="screen">
      <ScreenHeader title="My Stations" subtitle="Your watchlist & per-station alerts" back />

      {!isAuthenticated ? (
        <EmptyState message="Sign in to keep a station watchlist.">
          <Link to="/account" className="btn-primary">
            Sign in
          </Link>
        </EmptyState>
      ) : loading && !items ? (
        <LoadingState label="Loading your stations…" />
      ) : error && !items ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items || items.length === 0 ? (
        <EmptyState message="No stations yet. Browse stations and tap “Add to My Stations”.">
          <Link to="/stations" className="btn-primary">
            Browse stations
          </Link>
        </EmptyState>
      ) : (
        <ul className="watch-list">
          {items.map((s) => (
            <li key={s.id} className="watch-item">
              <Link to={`/stations/${s.id}`} className="watch-item-main link-reset">
                <StatusDot status={s.status} />
                <div className="station-row-main">
                  <div className="station-row-name">{s.name}</div>
                  <div className="station-row-sub">
                    {s.river} · <span className="readout">{fmtCusecs(s.discharge)}</span>
                  </div>
                </div>
                <SeverityChip status={s.status} />
              </Link>
              <div className="watch-item-actions">
                <Switch checked={s.alert_enabled} onChange={(v) => toggleAlert(s.id, v)} ariaLabel={`Alerts for ${s.name}`} />
                <button type="button" className="watch-remove" onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
