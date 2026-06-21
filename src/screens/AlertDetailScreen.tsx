import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getAlert, markAlertRead } from '@/lib/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { statusFromLoose } from '@/lib/severity'
import { sanitizeHtml } from '@/lib/sanitize'
import { fmtDateTime } from '@/lib/format'

/**
 * A single CMS-composed alert (0009). Renders the sanitised rich HTML body when
 * `content_type === 'html'`, else the plain-text body. Reached via the Alerts
 * inbox row or an `ffd://alert/{id}` push deep link.
 */
export default function AlertDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const alertId = Number(id)
  const { isAuthenticated } = useAuth()
  const { data, error, stale, cachedAt, loading, reload } = useResource(() => getAlert(alertId), [alertId])

  // Mark read on open (authed only; idempotent server-side). Covers opens that
  // bypass the list — e.g. a push tap straight into the detail.
  useEffect(() => {
    if (isAuthenticated && Number.isFinite(alertId)) void markAlertRead(alertId).catch(() => {})
  }, [isAuthenticated, alertId])

  const status = data?.severity ? statusFromLoose(data.severity) : null
  const isHtml = data?.content_type === 'html' && !!data.body_html
  const withdrawn = data?.lifecycle === 'withdrawn'

  return (
    <div className="screen">
      <ScreenHeader title="Alert" back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading alert…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState message="This alert is no longer available." />
      ) : (
        <article className={'bulletin-detail' + (withdrawn ? ' withdrawn' : '')}>
          <div className="bulletin-detail-head">
            {status ? <SeverityChip status={status} /> : null}
            <span className="bulletin-detail-time">{fmtDateTime(data.sent_at)}</span>
          </div>
          <h2 className="bulletin-detail-title">{data.title}</h2>

          {withdrawn ? (
            <p className="advisory-valid" role="status">This alert has been withdrawn.</p>
          ) : null}

          {isHtml ? (
            // Server HTML — sanitised (lib/sanitize) before rendering.
            <div className="bulletin-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.body_html as string) }} />
          ) : (
            <p className="alert-detail-body">{data.body_text ?? data.body}</p>
          )}
        </article>
      )}
    </div>
  )
}
