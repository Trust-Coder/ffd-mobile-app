import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getAlerts, getInbox, markAlertRead } from '@/lib/endpoints'
import type { AlertNotification } from '@/types/api'
import { severityColor, statusFromLoose } from '@/lib/severity'
import { routeForAlert } from '@/lib/deeplink'
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
  const { refresh: refreshUnread } = useUnread()
  const { data, error, stale, cachedAt, loading, reload } = useResource(
    () => (isAuthenticated ? getInbox() : getAlerts()),
    [isAuthenticated],
  )
  const [readIds, setReadIds] = useState<Set<number>>(new Set())

  // Refresh when a push lands while in the foreground.
  useEffect(() => {
    window.addEventListener(PUSH_RECEIVED_EVENT, reload)
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, reload)
  }, [reload])

  const onOpen = useCallback(
    (alert: AlertNotification) => {
      if (!isAuthenticated || alert.read_at != null || readIds.has(alert.id)) return
      setReadIds((prev) => new Set(prev).add(alert.id))
      void markAlertRead(alert.id)
        .then(() => refreshUnread())
        .catch(() => {})
    },
    [isAuthenticated, readIds, refreshUnread],
  )

  const isUnread = (a: AlertNotification) => isAuthenticated && a.read_at == null && !readIds.has(a.id)

  const alerts = data ?? []
  const today = alerts.filter((a) => isToday(a.sent_at))
  const earlier = alerts.filter((a) => !isToday(a.sent_at))

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
      <ScreenHeader title="Alerts" subtitle={isAuthenticated ? 'Your alerts inbox' : 'Mirrors every push & WhatsApp broadcast'} />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading alerts…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : alerts.length === 0 ? (
        <EmptyState message="No alerts yet. Flood advisories, bulletins and station alerts will appear here." />
      ) : (
        <>
          {group('Today', today)}
          {group('Earlier', earlier)}
        </>
      )}
    </div>
  )
}
