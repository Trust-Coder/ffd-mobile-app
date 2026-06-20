import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getAlerts } from '@/lib/endpoints'
import type { AlertNotification } from '@/types/api'
import { severityColor, statusFromLoose } from '@/lib/severity'
import { routeForAlert } from '@/lib/deeplink'
import { fmtRelative, isToday } from '@/lib/format'

function AlertRow({ alert }: { alert: AlertNotification }) {
  // Read state only exists on the authenticated inbox (§D); the public feed omits it.
  const unread = 'read_at' in alert && alert.read_at == null
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
    <Link to={href} className={className + ' link-reset'}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}

export default function AlertsScreen() {
  const { data, error, stale, cachedAt, loading, reload } = useResource(() => getAlerts(), [])
  const alerts = data ?? []
  const today = alerts.filter((a) => isToday(a.sent_at))
  const earlier = alerts.filter((a) => !isToday(a.sent_at))

  return (
    <div className="screen">
      <ScreenHeader title="Alerts" subtitle="Mirrors every push & WhatsApp broadcast" />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading alerts…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : alerts.length === 0 ? (
        <EmptyState message="No alerts yet. Flood advisories, bulletins and station alerts will appear here." />
      ) : (
        <>
          {today.length ? (
            <section className="section-block">
              <h3 className="section-title">Today</h3>
              <div className="alert-list">
                {today.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </section>
          ) : null}
          {earlier.length ? (
            <section className="section-block">
              <h3 className="section-title">Earlier</h3>
              <div className="alert-list">
                {earlier.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
