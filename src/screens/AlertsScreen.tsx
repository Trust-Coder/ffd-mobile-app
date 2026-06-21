import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { usePaginated } from '@/hooks/usePaginated'
import { getAlertsPage, getInboxPage, getPreferences, markAlertRead } from '@/lib/endpoints'
import type { AlertNotification } from '@/types/api'
import { severityColor, statusFromLoose } from '@/lib/severity'
import { routeForAlert } from '@/lib/deeplink'
import { isQuietHoursActive } from '@/lib/quietHours'
import { useAuth } from '@/auth/AuthContext'
import { useUnread } from '@/state/UnreadContext'
import { PUSH_RECEIVED_EVENT } from '@/lib/events'
import { fmtRelative, isToday } from '@/lib/format'

interface RowProps {
  alert: AlertNotification
  unread: boolean
  onOpen: (alert: AlertNotification) => void
}

function AlertRow({ alert, unread, onOpen }: RowProps) {
  const status = statusFromLoose(alert.severity)
  const href = routeForAlert(alert)

  const inner = (
    <>
      {alert.severity ? <span className="alert-accent" style={{ background: severityColor(status) }} /> : null}
      <div className="alert-main">
        <div className="alert-row-head">
          <span className="alert-title">{alert.title}</span>
          {unread ? <span className="unread-dot" aria-label="unread" /> : null}
        </div>
        <p className="alert-body">{alert.body}</p>
        <div className="alert-meta">
          {alert.severity ? <SeverityChip status={status} /> : null}
          <span className="alert-time">{fmtRelative(alert.sent_at)}</span>
        </div>
      </div>
    </>
  )

  const className = 'alert-item' + (unread ? ' unread' : '')
  return href ? (
    <Link to={href} className={className + ' link-reset'} onClick={() => onOpen(alert)}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}

export default function AlertsScreen() {
  const { isAuthenticated } = useAuth()
  const { decrement: decrementUnread, setCount } = useUnread()
  const { items, meta, error, loadMoreError, stale, cachedAt, loading, loadingMore, hasMore, reload, loadMore } =
    usePaginated((cursor) => (isAuthenticated ? getInboxPage(cursor) : getAlertsPage(cursor)), [isAuthenticated])
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [quietHours, setQuietHours] = useState(false)

  // Surface a "quiet hours active" cue (prefs are cheap/cached).
  useEffect(() => {
    if (!isAuthenticated) {
      setQuietHours(false)
      return
    }
    let active = true
    void getPreferences()
      .then((res) => {
        if (active) setQuietHours(isQuietHoursActive(res.data))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isAuthenticated])

  // Drive the nav badge from the inbox we're showing (one fetch, badge ↔ list agree).
  useEffect(() => {
    if (isAuthenticated && meta) {
      setCount(meta.unread_count ?? items.filter((a) => a.read_at == null).length)
    }
  }, [isAuthenticated, meta, items, setCount])

  // Refresh when a push lands while in the foreground.
  useEffect(() => {
    window.addEventListener(PUSH_RECEIVED_EVENT, reload)
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, reload)
  }, [reload])

  const onOpen = useCallback(
    (alert: AlertNotification) => {
      if (!isAuthenticated || alert.read_at != null || readIds.has(alert.id)) return
      setReadIds((prev) => new Set(prev).add(alert.id))
      decrementUnread() // optimistic; reconciled on next reload's meta.unread_count
      void markAlertRead(alert.id).catch(() => {})
    },
    [isAuthenticated, readIds, decrementUnread],
  )

  const isUnread = (a: AlertNotification) => isAuthenticated && a.read_at == null && !readIds.has(a.id)
  const today = items.filter((a) => isToday(a.sent_at))
  const earlier = items.filter((a) => !isToday(a.sent_at))

  function group(title: string, list: AlertNotification[]) {
    if (!list.length) return null
    return (
      <section className="section-block">
        <h3 className="section-title">{title}</h3>
        <div className="alert-list">
          {list.map((a) => (
            <AlertRow key={a.id} alert={a} unread={isUnread(a)} onOpen={onOpen} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="screen">
      <ScreenHeader title="Alerts" subtitle={isAuthenticated ? 'Your alerts inbox' : 'Mirrors every push & WhatsApp broadcast'} refreshable />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {quietHours ? (
        <div className="quiet-note" role="note">
          🌙 Quiet hours are on — non-critical alerts arrive silently. High-severity flood alerts still notify you.
        </div>
      ) : null}

      {loading && !items.length ? (
        <LoadingState label="Loading alerts…" />
      ) : error && !items.length ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState message="No alerts yet. Flood advisories, bulletins and station alerts will appear here." />
      ) : (
        <>
          {group('Today', today)}
          {group('Earlier', earlier)}
          {hasMore ? (
            <button type="button" className="btn-ghost block load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
          {loadMoreError ? (
            <p className="error-text load-more-error" role="alert">
              {loadMoreError}{' '}
              <button type="button" className="link-btn" onClick={loadMore}>
                Retry
              </button>
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
