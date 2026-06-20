import { useParams } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getBulletin } from '@/lib/endpoints'
import { fmtDateTime } from '@/lib/format'

export default function BulletinDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const bulletinId = Number(id)
  const { data, error, stale, cachedAt, loading, reload } = useResource(
    () => getBulletin(bulletinId),
    [bulletinId],
  )

  return (
    <div className="screen">
      <ScreenHeader title="Bulletin" back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading bulletin…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState message="Bulletin not found." />
      ) : (
        <article className="bulletin-detail">
          <div className="bulletin-detail-head">
            {data.severity ? <SeverityChip status={data.severity} /> : null}
            <span className="bulletin-detail-time">{fmtDateTime(data.issue_time)}</span>
          </div>
          <h2 className="bulletin-detail-title">{data.title}</h2>

          {/* Body is first-party HTML authored by FFD staff in the CMS. Sanitisation
              is tracked as a Phase 5 hardening item before any external content. */}
          {data.body ? (
            <div className="bulletin-body" dangerouslySetInnerHTML={{ __html: data.body }} />
          ) : (
            <p className="hint-text">This bulletin is published as a document.</p>
          )}

          {data.has_file && data.download_url ? (
            <a className="btn-primary" href={data.download_url} target="_blank" rel="noopener noreferrer">
              ⬇ Download PDF
            </a>
          ) : null}
        </article>
      )}
    </div>
  )
}
